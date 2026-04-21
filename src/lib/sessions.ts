export interface ScoreEntry {
  playerId: string
  fieldId: string
  value: number | boolean
  round?: number
  detail?: string
}

export interface SessionProgress {
  fieldIndex: number
  playerIndex: number
  round: number
  phase: 'scoring' | 'round_summary'
}

export interface GameSession {
  id: string
  gameId: string
  players: string[]
  playerNames?: Record<string, string>
  /** Totals cached at finish time. Used as fallback when game config is no longer available. */
  playerTotals?: Record<string, number>
  createdAt: string
  status: 'in_progress' | 'finished'
  scores: ScoreEntry[]
  currentRound?: number
  progress?: SessionProgress
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

export function getInProgressSessions(): GameSession[] {
  return getSessions().filter((s) => s.status === 'in_progress')
}

export function getFinishedSessions(): GameSession[] {
  return getSessions().filter((s) => s.status === 'finished')
}

export function updateSessionProgress(sessionId: string, progress: SessionProgress): void {
  const sessions = getSessions()
  const idx = sessions.findIndex((s) => s.id === sessionId)
  if (idx === -1) return
  sessions[idx] = { ...sessions[idx], progress }
  saveSessions(sessions)
}

export function deleteSession(sessionId: string): void {
  saveSessions(getSessions().filter((s) => s.id !== sessionId))
}

export function abandonSession(sessionId: string): void {
  deleteSession(sessionId)
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

export function finishSession(
  sessionId: string,
  playerNames: Record<string, string>,
  playerTotals?: Record<string, number>
): void {
  const sessions = getSessions()
  const idx = sessions.findIndex((s) => s.id === sessionId)
  if (idx === -1) return
  sessions[idx] = {
    ...sessions[idx],
    status: 'finished',
    playerNames,
    ...(playerTotals !== undefined && { playerTotals }),
  }
  saveSessions(sessions)
}

export function getSessionCount(): number {
  return getSessions().length
}

export function clearSessions(): void {
  localStorage.removeItem(STORAGE_KEY)
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
