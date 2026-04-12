import { useState } from 'react'
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
  const [phase, setPhase] = useState<'scoring' | 'round_summary' | 'done'>('scoring')

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
    updateScore(session!.id, { playerId: currentPlayer.id, fieldId: field.id, value, round: r })
    refreshSession()
  }

  function handleEndGameNext() {
    if (!isLastPlayer) {
      setPlayerIndex((p) => p + 1)
    } else if (!isLastField) {
      setFieldIndex((f) => f + 1)
      setPlayerIndex(0)
    } else {
      setPhase('done')
    }
  }

  function handlePerRoundNext() {
    if (!isLastPlayer) {
      setPlayerIndex((p) => p + 1)
    } else {
      setPhase('round_summary')
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

  const playerTotal = computePlayerTotal(game, session.scores, currentPlayer.id)

  // --- Done phase ---
  if (phase === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-24 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="text-6xl">🏆</div>
          <h1 className="text-2xl font-bold text-purple-700">Saisie terminée !</h1>
          <div className="bg-white rounded-2xl border border-purple-100 divide-y divide-purple-50">
            {sessionPlayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium text-purple-800">{p.name}</span>
                <span className="font-bold text-purple-700">
                  {computePlayerTotal(game, session.scores, p.id)} pts
                </span>
              </div>
            ))}
          </div>
          <Button
            onClick={handleFinish}
            aria-label="Terminer la partie"
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
          >
            Terminer la partie
          </Button>
        </div>
      </div>
    )
  }

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
              onClick={() => setPhase('done')}
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
                <input
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
              )}
            </div>
          ) : (
            /* per_round: all fields */
            <div className="space-y-3">
              {fields.map((field) => (
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
                    <input
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
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Total temps réel */}
          <div className="border-t border-purple-50 pt-3 flex justify-between items-center">
            <span className="text-sm text-purple-400">Total</span>
            <span className="text-xl font-bold text-purple-700">{playerTotal} pts</span>
          </div>
        </div>

        {/* Action */}
        <Button
          onClick={isEndGame ? handleEndGameNext : handlePerRoundNext}
          className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
        >
          {nextLabel}
        </Button>

      </div>
    </div>
  )
}
