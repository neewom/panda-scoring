export interface GameSession {
  id: string
  gameId: string
  players: string[]
  createdAt: string
  status: 'in_progress' | 'finished'
}

const STORAGE_KEY = 'panda-sessions'

function getSessions(): GameSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as GameSession[]) : []
  } catch {
    return []
  }
}

export function createSession(gameId: string, playerIds: string[]): GameSession {
  const session: GameSession = {
    id: crypto.randomUUID(),
    gameId,
    players: playerIds,
    createdAt: new Date().toISOString(),
    status: 'in_progress',
  }
  const sessions = getSessions()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...sessions, session]))
  return session
}

export function getSessionById(id: string): GameSession | undefined {
  return getSessions().find((s) => s.id === id)
}
