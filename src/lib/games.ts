import { DEFAULT_GAMES } from './games-default'

export interface ScoringField {
  id: string
  label: string
  description?: string
  type: 'number' | 'boolean'
  min?: number
  confident: boolean
}

export interface ComputedField {
  id: string
  label?: string
  formula: string
  confident: boolean
}

export interface TieBreakRule {
  label: string
  compare: (
    aScores: Record<string, number | boolean>,
    bScores: Record<string, number | boolean>
  ) => number
}

export interface Game {
  id: string
  name: string
  publisher?: string
  players: { min: number; max: number }
  scoring_model: 'end_game' | 'per_round' | 'hybrid'
  rounds?: number | { perPlayer: number; offset?: number }
  end_condition?: { score_threshold: number }
  lowest_wins?: boolean
  scoring: ScoringField[]
  computed: ComputedField[]
  tieBreak?: TieBreakRule[]
  scoring_notes?: string
  tiebreak_description?: string
  validated: boolean
  createdAt: string
}

const STORAGE_KEY = 'panda-custom-games'

export function getCustomGames(): Game[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Game[]) : []
  } catch {
    return []
  }
}

export function getGames(): Game[] {
  return [...DEFAULT_GAMES, ...getCustomGames()]
}

export function getGameById(id: string): Game | undefined {
  return getGames().find((g) => g.id === id)
}

export function clearCustomGames(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function addGame(game: Game): void {
  const custom = getCustomGames()
  custom.push(game)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
}

export interface CustomGameInput {
  name: string
  publisher?: string
  playersMin: number
  playersMax: number
  scoringModel: 'end_game' | 'per_round'
  rounds?: number | { perPlayer: number }
  end_condition?: { score_threshold: number }
  lowest_wins?: boolean
  categories: { label: string; type: 'number' | 'boolean' }[]
  tiebreakDescription?: string
  scoringNotes?: string
}

export function buildCustomGame(input: CustomGameInput): Game {
  // Use positional IDs (field_0, field_1, ...) to guarantee valid JS identifiers
  // regardless of category label content. Labels are only used for display.
  const scoring: ScoringField[] = input.categories.map((cat, i) => ({
    id: `field_${i}`,
    label: cat.label,
    type: cat.type,
    confident: true,
  }))

  const numberIds = scoring.filter((f) => f.type === 'number').map((f) => f.id)
  const totalFormula = numberIds.length > 0 ? numberIds.join(' + ') : '0'
  const computed: ComputedField[] = [{ id: 'total', formula: totalFormula, confident: true }]

  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    publisher: input.publisher?.trim() || undefined,
    players: { min: input.playersMin, max: input.playersMax },
    scoring_model: input.scoringModel,
    rounds: input.rounds,
    end_condition: input.end_condition,
    lowest_wins: input.lowest_wins || undefined,
    scoring,
    computed,
    tiebreak_description: input.tiebreakDescription?.trim() || undefined,
    scoring_notes: input.scoringNotes?.trim() || undefined,
    validated: true,
    createdAt: new Date().toISOString(),
  }
}

export function searchGames(query: string): Game[] {
  const q = query.trim().toLowerCase()
  if (!q) return getGames()
  return getGames().filter((g) => g.name.toLowerCase().includes(q))
}

/**
 * Returns the total number of rounds for a per_round game, or null if not defined.
 * - number: fixed round count
 * - { perPlayer, offset? }: rounds = playerCount × perPlayer + (offset ?? 0)
 */
export function computeRoundCount(game: Game, playerCount: number): number | null {
  if (game.rounds === undefined) return null
  if (typeof game.rounds === 'number') return game.rounds
  const { perPlayer, offset = 0 } = game.rounds
  return playerCount * perPlayer + offset
}
