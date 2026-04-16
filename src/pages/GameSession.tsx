import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getGameById } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import {
  getSessionById,
  updateScore,
  finishSession,
  type GameSession as GameSessionType,
  type ScoreEntry,
} from '@/lib/sessions'
import { computePlayerTotal } from '@/lib/scoring'
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
  const sessionPlayers = allPlayers.filter((p) => session?.players.includes(p.id))

  const [fieldIndex, setFieldIndex] = useState(0)
  const [playerIndex, setPlayerIndex] = useState(0)
  const [round, setRound] = useState(1)
  const [phase, setPhase] = useState<'scoring' | 'round_summary'>('scoring')

  const inputRef = useRef<HTMLInputElement>(null)

  // Expandable "Détail calcul" : ouvert/fermé par fieldId
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({})
  // Erreur de parsing par fieldId
  const [detailErrors, setDetailErrors] = useState<Record<string, boolean>>({})

  // Autofocus l'input à chaque changement de champ ou de joueur
  useEffect(() => {
    inputRef.current?.focus()
  }, [fieldIndex, playerIndex])

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

  function getScore(playerId: string, fieldId: string, r?: number): ScoreEntry | undefined {
    return session!.scores.find(
      (s) => s.playerId === playerId && s.fieldId === fieldId && s.round === r
    )
  }

  function handleScoreChange(field: ScoringField, value: number | boolean, r?: number) {
    const existing = getScore(currentPlayer.id, field.id, r)
    updateScore(session!.id, {
      playerId: currentPlayer.id,
      fieldId: field.id,
      value,
      round: r,
      detail: existing?.detail, // préserve le détail lors d'une édition manuelle
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

  function handlePerRoundNext() {
    if (!isLastPlayer) {
      setPlayerIndex((p) => p + 1)
    } else {
      setPhase('round_summary')
    }
  }

  function handlePerRoundPrev() {
    if (playerIndex > 0) {
      setPlayerIndex((p) => p - 1)
    }
  }

  function handleStartNextRound() {
    setRound((r) => r + 1)
    setFieldIndex(0)
    setPlayerIndex(0)
    setPhase('scoring')
  }

  function handleFinish() {
    finishSession(session!.id)
    navigate(`/game/${session!.id}/results`)
  }

  const isFirstStep = isEndGame
    ? fieldIndex === 0 && playerIndex === 0
    : playerIndex === 0

  // Index du premier champ number dans per_round (pour attacher le ref)
  const firstNumberFieldIndex = fields.findIndex((f) => f.type === 'number')

  // Total cumulé (per_round seulement)
  const playerCumulativeTotal = computePlayerTotal(game, session.scores, currentPlayer.id)

  // --- Round summary (per_round) ---
  if (phase === 'round_summary') {
    const maxRounds = typeof game.rounds === 'number' ? game.rounds : null
    const isLastRound = maxRounds !== null && round >= maxRounds
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-24 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold text-purple-700">Round {round} terminé</h1>
          <div className="bg-white rounded-2xl border border-purple-100 divide-y divide-purple-50">
            {sessionPlayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium text-purple-800">{p.name}</span>
                <span className="font-bold text-purple-700">
                  {computePlayerTotal(game, session.scores, p.id, round)} pts
                </span>
              </div>
            ))}
          </div>
          {isLastRound ? (
            <Button
              onClick={handleFinish}
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
            >
              Voir les résultats
            </Button>
          ) : (
            <Button
              onClick={handleStartNextRound}
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
  const nextLabel = isLastPlayer
    ? isEndGame
      ? isLastField
        ? 'Valider la catégorie'
        : 'Valider la catégorie'
      : 'Valider le round'
    : 'Suivant →'

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 pb-24 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-4">

        {/* Header */}
        <div className="text-center">
          <p className="text-sm text-purple-400">{game.name}</p>
          <h2 className="text-xl font-bold text-purple-700">
            {isEndGame ? currentField.label : `Round ${round}`}
          </h2>
        </div>

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

        {/* Score form */}
        <div className="bg-white rounded-2xl border border-purple-100 p-4 space-y-4">
          <p className="font-semibold text-purple-800">{currentPlayer.name}</p>

          {isEndGame ? (
            /* end_game: single field */
            <div className="space-y-2">
              <label className="text-sm text-purple-500">{currentField.label}</label>
              {currentField.type === 'boolean' ? (
                <button
                  onClick={() => {
                    const cur = getScore(currentPlayer.id, currentField.id)
                    handleScoreChange(currentField, !cur?.value)
                  }}
                  className={`w-full h-12 rounded-xl font-semibold transition-colors ${
                    getScore(currentPlayer.id, currentField.id)?.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-50 text-purple-400 border-2 border-purple-200'
                  }`}
                >
                  {getScore(currentPlayer.id, currentField.id)?.value ? 'Oui ✓' : 'Non'}
                </button>
              ) : (
                <>
                  <input
                    ref={inputRef}
                    type="number"
                    inputMode="numeric"
                    value={
                      (getScore(currentPlayer.id, currentField.id)?.value as number) ?? ''
                    }
                    onChange={(e) =>
                      handleScoreChange(currentField, Number(e.target.value))
                    }
                    placeholder="0"
                    aria-label={currentField.label}
                    className="w-full h-12 rounded-xl border-2 border-purple-200 px-3 text-lg font-semibold text-center focus:outline-none focus:border-purple-400"
                  />
                  <DetailCalc
                    fieldId={currentField.id}
                    expression={getScore(currentPlayer.id, currentField.id)?.detail ?? ''}
                    open={!!openDetails[currentField.id]}
                    hasError={!!detailErrors[currentField.id]}
                    onToggle={() => toggleDetail(currentField.id)}
                    onChange={(expr) => handleDetailChange(currentField, expr)}
                  />
                </>
              )}
            </div>
          ) : (
            /* per_round: all fields */
            <div className="space-y-3">
              {fields.map((field, i) => (
                <div key={field.id} className="space-y-1">
                  <label className="text-sm text-purple-500">{field.label}</label>
                  {field.type === 'boolean' ? (
                    <button
                      onClick={() => {
                        const cur = getScore(currentPlayer.id, field.id, round)
                        handleScoreChange(field, !cur?.value, round)
                      }}
                      className={`w-full h-10 rounded-xl font-semibold transition-colors ${
                        getScore(currentPlayer.id, field.id, round)?.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-50 text-purple-400 border-2 border-purple-200'
                      }`}
                    >
                      {getScore(currentPlayer.id, field.id, round)?.value
                        ? 'Oui ✓'
                        : 'Non'}
                    </button>
                  ) : (
                    <>
                      <input
                        ref={i === firstNumberFieldIndex ? inputRef : undefined}
                        type="number"
                        inputMode="numeric"
                        value={
                          (getScore(currentPlayer.id, field.id, round)?.value as number) ?? ''
                        }
                        onChange={(e) =>
                          handleScoreChange(field, Number(e.target.value), round)
                        }
                        placeholder="0"
                        aria-label={field.label}
                        className="w-full h-10 rounded-xl border-2 border-purple-200 px-3 text-center focus:outline-none focus:border-purple-400"
                      />
                      <DetailCalc
                        fieldId={field.id}
                        expression={getScore(currentPlayer.id, field.id, round)?.detail ?? ''}
                        open={!!openDetails[field.id]}
                        hasError={!!detailErrors[field.id]}
                        onToggle={() => toggleDetail(field.id)}
                        onChange={(expr) => handleDetailChange(field, expr, round)}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

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
          {!isFirstStep && (
            <Button
              onClick={isEndGame ? handleEndGamePrev : handlePerRoundPrev}
              aria-label="Étape précédente"
              className="h-12 px-4 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold rounded-2xl"
            >
              ← Précédent
            </Button>
          )}
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
