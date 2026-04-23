import { DEFAULT_GAMES } from './games-default'

export interface ScoringField {
  id: string
  label: string
  description?: string
  type: 'number'
  confident: boolean
}

export interface TieBreakRule {
  label: string
  compare: (
    aScores: Record<string, number>,
    bScores: Record<string, number>
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
  tieBreak?: TieBreakRule[]
  scoring_notes?: string
  tiebreak_description?: string
  validated: boolean
  createdAt: string
}

const STORAGE_KEY = 'panda-custom-games'
const HIDDEN_KEY = 'panda-hidden-games'

export function getCustomGames(): Game[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Game[]) : []
  } catch {
    return []
  }
}

function getHiddenGameIds(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function getGames(): Game[] {
  const hidden = getHiddenGameIds()
  const visibleDefaults = DEFAULT_GAMES.filter((g) => !hidden.includes(g.id))
  return [...visibleDefaults, ...getCustomGames()]
}

export function getGameById(id: string): Game | undefined {
  return getGames().find((g) => g.id === id)
}

export function updateGame(game: Game): void {
  const custom = getCustomGames().filter((g) => g.id !== game.id)
  custom.push(game)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
  const hidden = getHiddenGameIds()
  if (!hidden.includes(game.id)) {
    hidden.push(game.id)
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden))
  }
}

export function deleteGame(id: string): void {
  const custom = getCustomGames().filter((g) => g.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
  const hidden = getHiddenGameIds()
  if (!hidden.includes(id)) {
    hidden.push(id)
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden))
  }
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
  categories: { label: string }[]
  tiebreakDescription?: string
  scoringNotes?: string
}

export function buildCustomGame(input: CustomGameInput): Game {
  // per_round always gets a single "Score" field; end_game uses user-defined categories
  const scoring: ScoringField[] = input.scoringModel === 'per_round'
    ? [{ id: 'score', label: 'Score', type: 'number', confident: true }]
    : input.categories.map((cat, i) => ({
        id: `field_${i}`,
        label: cat.label,
        type: 'number' as const,
        confident: true,
      }))

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
