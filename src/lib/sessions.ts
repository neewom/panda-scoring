export interface ScoreEntry {
  playerId: string
  fieldId: string
  value: number | boolean
  round?: number
  detail?: string
}

export interface GameSession {
  id: string
  gameId: string
  players: string[]
  playerNames?: Record<string, string>
  createdAt: string
  status: 'in_progress' | 'finished'
  scores: ScoreEntry[]
  currentRound?: number
}

export interface SessionPlayer {
  id: string
  name: string
  createdAt: string
  deleted?: boolean
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

function saveSessions(sessions: GameSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export function createSession(gameId: string, playerIds: string[]): GameSession {
  const session: GameSession = {
    id: crypto.randomUUID(),
    gameId,
    players: playerIds,
    createdAt: new Date().toISOString(),
    status: 'in_progress',
    scores: [],
  }
  saveSessions([...getSessions(), session])
  return session
}

export function getSessionById(id: string): GameSession | undefined {
  return getSessions().find((s) => s.id === id)
}

export function getFinishedSessions(): GameSession[] {
  return getSessions().filter((s) => s.status === 'finished')
}

export function updateScore(sessionId: string, entry: ScoreEntry): void {
  const sessions = getSessions()
  const idx = sessions.findIndex((s) => s.id === sessionId)
  if (idx === -1) return
  const session = sessions[idx]
  const scores = session.scores ?? []
  const existing = scores.findIndex(
    (s) =>
      s.playerId === entry.playerId &&
      s.fieldId === entry.fieldId &&
      s.round === entry.round
  )
  const updated =
    existing >= 0
      ? scores.map((s, i) => (i === existing ? entry : s))
      : [...scores, entry]
  sessions[idx] = { ...session, scores: updated }
  saveSessions(sessions)
}

export function finishSession(sessionId: string, playerNames: Record<string, string>): void {
  const sessions = getSessions()
  const idx = sessions.findIndex((s) => s.id === sessionId)
  if (idx === -1) return
  sessions[idx] = { ...sessions[idx], status: 'finished', playerNames }
  saveSessions(sessions)
}

export function resolveSessionPlayers(
  session: GameSession,
  allPlayers: { id: string; name: string; createdAt: string }[]
): SessionPlayer[] {
  return session.players.map((id) => {
    const denormalized = session.playerNames?.[id]
    if (denormalized !== undefined) {
      return { id, name: denormalized, createdAt: '' }
    }
    const found = allPlayers.find((p) => p.id === id)
    if (found) return found
    return { id, name: 'Joueur supprimé', createdAt: '', deleted: true }
  })
}
