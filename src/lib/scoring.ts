import type { Game } from './games'
import type { GameSession, ScoreEntry } from './sessions'

/**
 * Evaluates a formula string with the given variable values.
 *
 * Handles both valid JS identifiers (passed as function parameters) and
 * invalid identifiers like digit-starting IDs (substituted inline by value
 * before evaluation). This ensures old custom games with digit-based field
 * IDs (e.g. "1", "2") still compute correctly.
 */
function evalFormula(formula: string, values: Record<string, number | boolean>): number {
  try {
    // Transpile bare math functions to Math.* (e.g. floor( → Math.floor()
    let processed = formula.replace(
      /\b(floor|ceil|round|abs|min|max|sqrt|pow)\b(?=\s*\()/g,
      'Math.$1'
    )

    const identifierKeys: string[] = []
    const identifierVals: (number | boolean)[] = []

    // Separate valid JS identifiers from invalid ones.
    // Invalid keys (e.g. digit-only IDs like "1", "3") cannot be passed as function
    // parameters, so we substitute their values inline in one single pass using a
    // Map callback. A single-pass replacement avoids the double-substitution bug
    // where substituting key "3"→6 could later be overwritten when key "6" is processed.
    const inlineSubstitutions = new Map<string, string>()
    for (const [key, val] of Object.entries(values)) {
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
        const numVal = typeof val === 'boolean' ? (val ? 1 : 0) : Number(val)
        inlineSubstitutions.set(key, String(numVal))
      } else {
        identifierKeys.push(key)
        identifierVals.push(val)
      }
    }

    if (inlineSubstitutions.size > 0) {
      // Build alternation pattern, longest keys first to avoid partial-match shadowing.
      const pattern = Array.from(inlineSubstitutions.keys())
        .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .sort((a, b) => b.length - a.length)
        .join('|')
      // Single-pass replacement: each occurrence is replaced exactly once.
      processed = processed.replace(
        new RegExp(`\\b(${pattern})\\b`, 'g'),
        (match) => inlineSubstitutions.get(match) ?? match
      )
    }

    // eslint-disable-next-line no-new-func
    const fn = new Function('Math', ...identifierKeys, `return (${processed})`)
    const result = fn(Math, ...identifierVals)
    if (typeof result === 'boolean') return result ? 1 : 0
    const num = Number(result)
    return isNaN(num) ? 0 : num
  } catch {
    return 0
  }
}

/**
 * Returns a map of all scoring field values and computed field values for a player.
 * The map includes both raw scoring inputs and derived computed values (including 'total').
 */
export function computePlayerScores(
  game: Game,
  scores: ScoreEntry[],
  playerId: string,
  round?: number
): Record<string, number | boolean> {
  const playerScores = scores.filter(
    (s) => s.playerId === playerId && (round === undefined || s.round === round)
  )

  const values: Record<string, number | boolean> = {}
  for (const field of game.scoring) {
    const entry = playerScores.find((s) => s.fieldId === field.id)
    values[field.id] =
      field.type === 'boolean'
        ? entry !== undefined ? Boolean(entry.value) : false
        : entry !== undefined ? Number(entry.value) : 0
  }

  for (const cf of game.computed) {
    const result = evalFormula(cf.formula, { ...values })
    values[cf.id] = result
  }
  return values
}

/**
 * Computes the cumulative total across all rounds for a per_round game.
 * Sums computePlayerTotal for each distinct round found in the scores.
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

export function computePlayerTotal(
  game: Game,
  scores: ScoreEntry[],
  playerId: string,
  round?: number
): number {
  const values = computePlayerScores(game, scores, playerId, round)
  const total = values['total']
  return typeof total === 'number' ? total : 0
}

/**
 * Resolves the display total for a player in a session.
 *
 * - If the game config is available: recalculates dynamically from stored
 *   category scores (fixes sessions that were saved with total = 0 due to
 *   a prior formula evaluation bug).
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
