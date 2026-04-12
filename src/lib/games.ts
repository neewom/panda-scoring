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

export interface Game {
  id: string
  name: string
  publisher?: string
  players: { min: number; max: number }
  scoring_model: 'end_game' | 'per_round' | 'hybrid'
  rounds?: number | 'dynamic'
  scoring: ScoringField[]
  computed: ComputedField[]
  tiebreak?: string | object[]
  validated: boolean
  createdAt: string
}

const STORAGE_KEY = 'panda-custom-games'

function getCustomGames(): Game[] {
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

export function addGame(game: Game): void {
  const custom = getCustomGames()
  custom.push(game)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
}

export function searchGames(query: string): Game[] {
  const q = query.trim().toLowerCase()
  if (!q) return getGames()
  return getGames().filter((g) => g.name.toLowerCase().includes(q))
}
