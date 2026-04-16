import type { Game } from './games'
import type { ScoreEntry } from './sessions'

function evalFormula(formula: string, values: Record<string, number | boolean>): number {
  try {
    // Transpile bare math functions to Math.* (e.g. floor( → Math.floor()
    const processed = formula.replace(
      /\b(floor|ceil|round|abs|min|max|sqrt|pow)\b(?=\s*\()/g,
      'Math.$1'
    )
    const keys = Object.keys(values)
    const vals = Object.values(values)
    // eslint-disable-next-line no-new-func
    const fn = new Function('Math', ...keys, `return (${processed})`)
    const result = fn(Math, ...vals)
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
