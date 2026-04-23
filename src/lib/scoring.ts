import type { Game } from './games'
import type { GameSession, ScoreEntry } from './sessions'

/**
 * Returns the sum of all scoring fields for a player in a given round
 * (or across the whole session for end_game when round is undefined).
 * Legacy boolean values stored in ScoreEntry are coerced to 0.
 */
export function computePlayerTotal(
  game: Game,
  scores: ScoreEntry[],
  playerId: string,
  round?: number
): number {
  const playerScores = scores.filter(
    (s) => s.playerId === playerId && s.round === round
  )
  return game.scoring.reduce((sum, field) => {
    const entry = playerScores.find((s) => s.fieldId === field.id)
    return sum + (entry ? Number(entry.value) : 0)
  }, 0)
}

/**
 * Computes the cumulative total across all rounds for a per_round game.
 */
export function computePerRoundTotal(
  game: Game,
  scores: ScoreEntry[],
  playerId: string
): number {
  const rounds = [
    ...new Set(
      scores
        .filter((s) => s.playerId === playerId && s.round !== undefined)
        .map((s) => s.round!)
    ),
  ]
  if (rounds.length === 0) return 0
  return rounds.reduce((sum, r) => sum + computePlayerTotal(game, scores, playerId, r), 0)
}

/**
 * Resolves the display total for a player in a session.
 *
 * - If the game config is available: recalculates dynamically from stored scores.
 * - If the game config has been deleted: falls back to the total cached in
 *   session.playerTotals at finish time.
 */
export function resolvePlayerTotal(
  session: GameSession,
  game: Game | undefined,
  playerId: string
): number {
  if (game) {
    return game.scoring_model === 'per_round'
      ? computePerRoundTotal(game, session.scores, playerId)
      : computePlayerTotal(game, session.scores, playerId)
  }
  return session.playerTotals?.[playerId] ?? 0
}
