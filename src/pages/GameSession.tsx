import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/PageHeader'
import { getGameById, computeRoundCount } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import {
  getSessionById,
  updateScore,
  finishSession,
  updateSessionProgress,
  type GameSession as GameSessionType,
  type ScoreEntry,
} from '@/lib/sessions'
import { computePlayerTotal, computePerRoundTotal } from '@/lib/scoring'
import { parseExpr } from '@/lib/expr-parser'
import type { ScoringField } from '@/lib/games'

export default function GameSession() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<GameSessionType | undefined>(
    () => (id ? getSessionById(id) : undefined)
  )

  const game = session ? getGameById(session.gameId) : undefined
  const allPlayers = getPlayers()
  const sessionPlayers = (session?.players ?? [])
    .map((id) => allPlayers.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)

  const [fieldIndex, setFieldIndex] = useState(() => session?.progress?.fieldIndex ?? 0)
  const [playerIndex, setPlayerIndex] = useState(() => session?.progress?.playerIndex ?? 0)
  const [round, setRound] = useState(() => session?.progress?.round ?? 1)
  const [phase, setPhase] = useState<'scoring' | 'round_summary'>(
    () => session?.progress?.phase ?? 'scoring'
  )

  const inputRef = useRef<HTMLInputElement>(null)

  // Expandable "Détail calcul" : ouvert/fermé par fieldId
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({})
  // Erreur de parsing par fieldId
  const [detailErrors, setDetailErrors] = useState<Record<string, boolean>>({})

  // Autofocus l'input à chaque changement de champ ou de joueur
  useEffect(() => {
    inputRef.current?.focus()
  }, [fieldIndex, playerIndex, round])

  // Persist navigation cursor so the session can be resumed
  useEffect(() => {
    if (!session?.id) return
    updateSessionProgress(session.id, { fieldIndex, playerIndex, round, phase })
  }, [session?.id, fieldIndex, playerIndex, round, phase])

  if (!session || !game || sessionPlayers.length === 0) {
    return <Navigate to="/" replace />
  }

  function refreshSession() {
    const updated = getSessionById(session!.id)
    if (updated) setSession(updated)
  }

  const isEndGame = game.scoring_model === 'end_game'
  const fields = game.scoring
  const currentPlayer = sessionPlayers[playerIndex]
  const isLastPlayer = playerIndex === sessionPlayers.length - 1
  const currentField = fields[fieldIndex]
  const isLastField = fieldIndex === fields.length - 1

  // Total number of rounds (null = undefined/dynamic)
  const totalRounds = computeRoundCount(game, sessionPlayers.length)
  const hasEndCondition = !isEndGame && !!game.end_condition
  const endConditionReached = hasEndCondition && sessionPlayers.some(
    (p) => computePerRoundTotal(game, session.scores, p.id) >= game.end_condition!.score_threshold
  )
  const isLastRound = totalRounds !== null
    ? round >= totalRounds
    : hasEndCondition
      ? endConditionReached
      : true

  function getScore(playerId: string, fieldId: string, r?: number): ScoreEntry | undefined {
    return session!.scores.find(
      (s) => s.playerId === playerId && s.fieldId === fieldId && s.round === r
    )
  }

  function handleScoreChange(field: ScoringField, value: number, r?: number) {
    const existing = getScore(currentPlayer.id, field.id, r)
    updateScore(session!.id, {
      playerId: currentPlayer.id,
      fieldId: field.id,
      value,
      round: r,
      detail: existing?.detail,
    })
    refreshSession()
  }

  function handleDetailChange(field: ScoringField, expression: string, r?: number) {
    const existing = getScore(currentPlayer.id, field.id, r)
    if (expression === '') {
      updateScore(session!.id, {
        playerId: currentPlayer.id,
        fieldId: field.id,
        value: existing?.value ?? 0,
        round: r,
        detail: undefined,
      })
      setDetailErrors((prev) => { const next = { ...prev }; delete next[field.id]; return next })
    } else {
      const result = parseExpr(expression)
      updateScore(session!.id, {
        playerId: currentPlayer.id,
        fieldId: field.id,
        value: result.ok ? result.value : (existing?.value ?? 0),
        round: r,
        detail: expression,
      })
      setDetailErrors((prev) => ({ ...prev, [field.id]: !result.ok }))
    }
    refreshSession()
  }

  function toggleDetail(fieldId: string) {
    setOpenDetails((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }))
  }

  // --- end_game navigation ---

  function handleEndGameNext() {
    if (!isLastPlayer) {
      setPlayerIndex((p) => p + 1)
    } else if (!isLastField) {
      setFieldIndex((f) => f + 1)
      setPlayerIndex(0)
    } else {
      handleFinish()
    }
  }

  function handleEndGamePrev() {
    if (playerIndex > 0) {
      setPlayerIndex((p) => p - 1)
    } else if (fieldIndex > 0) {
      setFieldIndex((f) => f - 1)
      setPlayerIndex(sessionPlayers.length - 1)
    }
  }

  // --- per_round navigation ---

  function handlePerRoundNext() {
    if (!isLastPlayer) {
      setPlayerIndex((p) => p + 1)
    } else if (!isLastField) {
      setFieldIndex((f) => f + 1)
      setPlayerIndex(0)
    } else {
      // Last player, last field → round summary
      setPhase('round_summary')
    }
  }

  function handlePerRoundPrev() {
    if (playerIndex > 0) {
      setPlayerIndex((p) => p - 1)
    } else if (fieldIndex > 0) {
      setFieldIndex((f) => f - 1)
      setPlayerIndex(sessionPlayers.length - 1)
    } else if (round > 1) {
      // Beginning of round → go back to last step of previous round
      setRound((r) => r - 1)
      setFieldIndex(fields.length - 1)
      setPlayerIndex(sessionPlayers.length - 1)
    }
  }

  function handleStartNextRound() {
    setRound((r) => r + 1)
    setFieldIndex(0)
    setPlayerIndex(0)
    setPhase('scoring')
  }

  function handleFinish() {
    const playerNamesMap: Record<string, string> = {}
    const playerTotalsMap: Record<string, number> = {}
    sessionPlayers.forEach((p) => {
      playerNamesMap[p.id] = p.name
      playerTotalsMap[p.id] = isEndGame
        ? computePlayerTotal(game!, session!.scores, p.id)
        : computePerRoundTotal(game!, session!.scores, p.id)
    })
    finishSession(session!.id, playerNamesMap, playerTotalsMap)
    navigate(`/game/${session!.id}/results`)
  }

  const isFirstStep = isEndGame
    ? fieldIndex === 0 && playerIndex === 0
    : round === 1 && fieldIndex === 0 && playerIndex === 0

  // Cumulative total for the current player (per_round only)
  const playerCumulativeTotal = !isEndGame
    ? computePerRoundTotal(game, session.scores, currentPlayer.id)
    : 0

  // --- Round summary (per_round) ---
  if (phase === 'round_summary') {
    return (
      <div className="min-h-screen flex flex-col items-center px-4 py-8 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
        <div className="w-full max-w-sm space-y-6">
          <PageHeader
            title={`Round ${round} terminé`}
            onBack={handlePerRoundPrev}
          />
          <p className="text-sm text-purple-400 text-center">{game.name}</p>
          {totalRounds && (
            <p className="text-xs text-purple-400">
              Round {round} / {totalRounds}
            </p>
          )}
          {endConditionReached && (
            <p className="text-sm font-semibold text-amber-600">
              Seuil de {game.end_condition!.score_threshold} points atteint !
            </p>
          )}
          <div className="bg-white rounded-2xl border border-purple-100 divide-y divide-purple-50">
            {sessionPlayers.map((p) => {
              const cumulative = Array.from({ length: round }, (_, i) => i + 1).reduce(
                (sum, r) => sum + computePlayerTotal(game, session.scores, p.id, r),
                0
              )
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium text-purple-800">{p.name}</span>
                  <span className="font-bold text-purple-700">{cumulative} pts</span>
                </div>
              )
            })}
          </div>
          {isLastRound ? (
            <Button
              onClick={handleFinish}
              aria-label="Voir les résultats"
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
            >
              Voir les résultats
            </Button>
          ) : (
            <Button
              onClick={handleStartNextRound}
              aria-label={`Démarrer Round ${round + 1}`}
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
            >
              Démarrer Round {round + 1}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // --- Main scoring UI ---
  const nextLabel = !isLastPlayer
    ? 'Suivant →'
    : isEndGame
      ? 'Valider la catégorie'
      : isLastField
        ? 'Valider le round'
        : 'Suivant →'

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 pb-24 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-4">

        {/* Header */}
        <PageHeader
          title={isEndGame ? currentField.label : `Round ${round}`}
          onBack={isFirstStep ? undefined : (isEndGame ? handleEndGamePrev : handlePerRoundPrev)}
        />
        <p className="-mt-4 text-sm text-purple-400 text-center">{game.name}</p>

        {/* Progress bar (end_game) */}
        {isEndGame && (
          <div className="space-y-1">
            <p className="text-xs text-purple-400 text-right">
              {fieldIndex + 1} / {fields.length}
            </p>
            <div className="h-1.5 bg-purple-100 rounded-full">
              <div
                className="h-1.5 bg-purple-500 rounded-full transition-all"
                style={{ width: `${((fieldIndex + 1) / fields.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Round progress bar (per_round) */}
        {!isEndGame && totalRounds !== null && (
          <div className="space-y-1">
            <p className="text-xs text-purple-400 text-right">
              Round {round} / {totalRounds}
            </p>
            <div className="h-1.5 bg-purple-100 rounded-full">
              <div
                className="h-1.5 bg-purple-500 rounded-full transition-all"
                style={{ width: `${(round / totalRounds) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* End condition badge (per_round without fixed round count) */}
        {hasEndCondition && totalRounds === null && (
          <p className="text-xs text-center text-amber-500">
            Fin de partie à {game.end_condition!.score_threshold} pts
          </p>
        )}

        {/* Player tabs */}
        <div className="flex gap-1 bg-purple-50 rounded-xl p-1">
          {sessionPlayers.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setPlayerIndex(i)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors truncate ${
                i === playerIndex
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-purple-400 hover:text-purple-600'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Score form — same layout for end_game and per_round (single field at a time) */}
        <div className="bg-white rounded-2xl border border-purple-100 p-4 space-y-4">
          <p className="font-semibold text-purple-800">{currentPlayer.name}</p>

          <div className="space-y-2">
            <label className="text-sm text-purple-500">{currentField.label}</label>
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              value={
                getScore(
                  currentPlayer.id,
                  currentField.id,
                  isEndGame ? undefined : round
                )?.value ?? ''
              }
              onChange={(e) =>
                handleScoreChange(
                  currentField,
                  Number(e.target.value),
                  isEndGame ? undefined : round
                )
              }
              placeholder="0"
              aria-label={currentField.label}
              className="w-full h-12 rounded-xl border-2 border-purple-200 px-3 text-lg font-semibold text-center focus:outline-none focus:border-purple-400"
            />
            <DetailCalc
              fieldId={currentField.id}
              expression={
                getScore(
                  currentPlayer.id,
                  currentField.id,
                  isEndGame ? undefined : round
                )?.detail ?? ''
              }
              open={!!openDetails[currentField.id]}
              hasError={!!detailErrors[currentField.id]}
              onToggle={() => toggleDetail(currentField.id)}
              onChange={(expr) =>
                handleDetailChange(currentField, expr, isEndGame ? undefined : round)
              }
            />
          </div>

          {/* Total cumulé — per_round uniquement */}
          {!isEndGame && (
            <div className="border-t border-purple-50 pt-3 flex justify-between items-center">
              <span className="text-sm text-purple-400">Total cumulé</span>
              <span className="text-xl font-bold text-purple-700">{playerCumulativeTotal} pts</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={isEndGame ? handleEndGameNext : handlePerRoundNext}
            className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
          >
            {nextLabel}
          </Button>
        </div>

      </div>
    </div>
  )
}

// --- Composant interne : expandable "Détail calcul" ---

interface DetailCalcProps {
  fieldId: string
  expression: string
  open: boolean
  hasError: boolean
  onToggle: () => void
  onChange: (expr: string) => void
}

function DetailCalc({ fieldId, expression, open, hasError, onToggle, onChange }: DetailCalcProps) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        aria-expanded={open}
        aria-controls={`detail-${fieldId}`}
        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-600 transition-colors"
      >
        <span aria-hidden>{open ? '▾' : '▸'}</span>
        Détail calcul
      </button>
      {open && (
        <div id={`detail-${fieldId}`} className="space-y-1">
          <input
            type="text"
            tabIndex={-1}
            value={expression}
            onChange={(e) => onChange(e.target.value)}
            placeholder="ex: 5+3-2+(3*10)"
            aria-label={`Détail calcul ${fieldId}`}
            className={`w-full h-9 rounded-xl border-2 px-3 text-sm focus:outline-none ${
              hasError
                ? 'border-red-400 focus:border-red-500'
                : 'border-purple-200 focus:border-purple-400'
            }`}
          />
          {hasError && (
            <p className="text-xs text-red-400">Expression invalide</p>
          )}
        </div>
      )}
    </div>
  )
}
