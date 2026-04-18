import { resolvePlayerTotal } from './scoring'
import type { Game } from './games'
import type { GameSession } from './sessions'

export interface PlayerSummaryStats {
  gamesPlayed: number
  wins: number
  winRate: number
}

export interface GameStats {
  gameId: string
  gameName: string
  gamesPlayed: number
  wins: number
  bestScore: number
  avgScore: number
}

export interface RecentSession {
  sessionId: string
  gameId: string
  gameName: string
  createdAt: string
  score: number
  position: number
}

export interface PlayerDetailStats {
  gamesPlayed: number
  wins: number
  winRate: number
  podiums: number
  byGame: GameStats[]
  recentSessions: RecentSession[]
}

/**
 * Returns the dense rank of a player in a finished session (1 = winner).
 * Equal scores share the same rank. Respects lowest_wins direction.
 * When game config is unavailable, falls back to stored totals and assumes highest_wins.
 */
function getPlayerRank(
  game: Game | undefined,
  session: GameSession,
  playerId: string
): number {
  const scored = session.players.map((pid) => ({
    playerId: pid,
    total: resolvePlayerTotal(session, game, pid),
  }))

  const lowestWins = game?.lowest_wins ?? false
  scored.sort((a, b) => lowestWins ? a.total - b.total : b.total - a.total)

  // Build unique sorted score list → dense rank = index + 1
  const unique: number[] = []
  for (const { total } of scored) {
    if (!unique.includes(total)) unique.push(total)
  }

  const playerEntry = scored.find((s) => s.playerId === playerId)
  if (!playerEntry) return session.players.length

  return unique.indexOf(playerEntry.total) + 1
}

export function computePlayerSummaryStats(
  playerId: string,
  sessions: GameSession[],
  games: Map<string, Game>
): PlayerSummaryStats {
  const finished = sessions.filter(
    (s) => s.status === 'finished' && s.players.includes(playerId)
  )

  let wins = 0
  for (const session of finished) {
    const game = games.get(session.gameId)
    if (getPlayerRank(game, session, playerId) === 1) wins++
  }

  const gamesPlayed = finished.length
  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0

  return { gamesPlayed, wins, winRate }
}

export function computePlayerDetailStats(
  playerId: string,
  sessions: GameSession[],
  games: Map<string, Game>
): PlayerDetailStats {
  const finished = sessions
    .filter((s) => s.status === 'finished' && s.players.includes(playerId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  let wins = 0
  let podiums = 0
  const byGameMap = new Map<string, { game: Game; entries: { score: number; win: boolean }[] }>()
  const recentSessions: RecentSession[] = []

  for (const session of finished) {
    const game = games.get(session.gameId)

    const score = resolvePlayerTotal(session, game, playerId)
    const rank = getPlayerRank(game, session, playerId)

    if (rank === 1) wins++
    if (rank === 2 || rank === 3) podiums++

    // Per-game breakdown only when game config is available (need name, direction)
    if (game) {
      if (!byGameMap.has(session.gameId)) {
        byGameMap.set(session.gameId, { game, entries: [] })
      }
      byGameMap.get(session.gameId)!.entries.push({ score, win: rank === 1 })
    }

    if (recentSessions.length < 5) {
      recentSessions.push({
        sessionId: session.id,
        gameId: session.gameId,
        gameName: game?.name ?? 'Jeu supprimé',
        createdAt: session.createdAt,
        score,
        position: rank,
      })
    }
  }

  const gamesPlayed = finished.length
  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0

  const byGame: GameStats[] = Array.from(byGameMap.entries())
    .map(([gameId, { game, entries }]) => {
      const scores = entries.map((e) => e.score)
      const gameWins = entries.filter((e) => e.win).length
      const bestScore = game.lowest_wins ? Math.min(...scores) : Math.max(...scores)
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      return {
        gameId,
        gameName: game.name,
        gamesPlayed: entries.length,
        wins: gameWins,
        bestScore,
        avgScore,
      }
    })
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed)

  return { gamesPlayed, wins, winRate, podiums, byGame, recentSessions }
}
