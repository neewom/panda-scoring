import { describe, it, expect } from 'vitest'
import { computePlayerSummaryStats, computePlayerDetailStats } from './player-stats'
import type { GameSession } from './sessions'
import type { Game } from './games'

// ── Fixtures ────────────────────────────────────────────────────────────────

const GAME: Game = {
  id: 'game1',
  name: 'Test Game',
  players: { min: 2, max: 4 },
  scoring_model: 'end_game',
  scoring: [{ id: 'pts', label: 'Points', type: 'number', confident: true }],
  computed: [{ id: 'total', label: 'Total', formula: 'pts', confident: true }],
  validated: true,
  createdAt: '2024-01-01T00:00:00.000Z',
}

const GAME2: Game = {
  ...GAME,
  id: 'game2',
  name: 'Another Game',
}

const GAME_LOW: Game = {
  ...GAME,
  id: 'game-low',
  name: 'Low Wins Game',
  lowest_wins: true,
}

const GAMES = new Map<string, Game>([
  ['game1', GAME],
  ['game2', GAME2],
  ['game-low', GAME_LOW],
])

function makeSession(
  id: string,
  players: string[],
  scores: { pid: string; pts: number }[],
  opts: { gameId?: string; createdAt?: string; status?: 'finished' | 'in_progress' } = {}
): GameSession {
  return {
    id,
    gameId: opts.gameId ?? 'game1',
    players,
    createdAt: opts.createdAt ?? `2024-01-${id.padStart(2, '0')}T00:00:00.000Z`,
    status: opts.status ?? 'finished',
    scores: scores.map(({ pid, pts }) => ({ playerId: pid, fieldId: 'pts', value: pts })),
  }
}

// ── computePlayerSummaryStats ────────────────────────────────────────────────

describe('computePlayerSummaryStats', () => {
  it('retourne 0 pour un joueur sans partie', () => {
    const stats = computePlayerSummaryStats('p1', [], GAMES)
    expect(stats).toEqual({ gamesPlayed: 0, wins: 0, winRate: 0 })
  })

  it('ne compte pas les parties in_progress', () => {
    const s = makeSession('1', ['p1', 'p2'], [{ pid: 'p1', pts: 10 }, { pid: 'p2', pts: 5 }], { status: 'in_progress' })
    const stats = computePlayerSummaryStats('p1', [s], GAMES)
    expect(stats.gamesPlayed).toBe(0)
  })

  it('compte le nombre de parties jouées', () => {
    const s1 = makeSession('1', ['p1', 'p2'], [{ pid: 'p1', pts: 10 }, { pid: 'p2', pts: 5 }])
    const s2 = makeSession('2', ['p1', 'p3'], [{ pid: 'p1', pts: 8 }, { pid: 'p3', pts: 12 }])
    const stats = computePlayerSummaryStats('p1', [s1, s2], GAMES)
    expect(stats.gamesPlayed).toBe(2)
  })

  it('ne compte pas les parties où le joueur n\'est pas présent', () => {
    const s = makeSession('1', ['p2', 'p3'], [{ pid: 'p2', pts: 10 }, { pid: 'p3', pts: 5 }])
    const stats = computePlayerSummaryStats('p1', [s], GAMES)
    expect(stats.gamesPlayed).toBe(0)
  })

  it('compte les victoires', () => {
    const win = makeSession('1', ['p1', 'p2'], [{ pid: 'p1', pts: 20 }, { pid: 'p2', pts: 10 }])
    const loss = makeSession('2', ['p1', 'p2'], [{ pid: 'p1', pts: 5 }, { pid: 'p2', pts: 15 }])
    const stats = computePlayerSummaryStats('p1', [win, loss], GAMES)
    expect(stats.wins).toBe(1)
  })

  it('les victoires incluent les victoires partagées (égalité)', () => {
    const tie = makeSession('1', ['p1', 'p2'], [{ pid: 'p1', pts: 15 }, { pid: 'p2', pts: 15 }])
    const stats = computePlayerSummaryStats('p1', [tie], GAMES)
    expect(stats.wins).toBe(1)
    const stats2 = computePlayerSummaryStats('p2', [tie], GAMES)
    expect(stats2.wins).toBe(1)
  })

  it('calcule le taux de victoire arrondi', () => {
    const w1 = makeSession('1', ['p1', 'p2'], [{ pid: 'p1', pts: 20 }, { pid: 'p2', pts: 10 }])
    const w2 = makeSession('2', ['p1', 'p2'], [{ pid: 'p1', pts: 20 }, { pid: 'p2', pts: 10 }])
    const l1 = makeSession('3', ['p1', 'p2'], [{ pid: 'p1', pts: 5 }, { pid: 'p2', pts: 15 }])
    // 2/3 = 66.67% → arrondi à 67
    const stats = computePlayerSummaryStats('p1', [w1, w2, l1], GAMES)
    expect(stats.winRate).toBe(67)
  })

  it('winRate est 0 quand aucune partie', () => {
    const stats = computePlayerSummaryStats('p1', [], GAMES)
    expect(stats.winRate).toBe(0)
  })

  it('détecte le vainqueur d\'un jeu lowest_wins (score le plus bas)', () => {
    const s = makeSession('1', ['p1', 'p2'],
      [{ pid: 'p1', pts: 5 }, { pid: 'p2', pts: 20 }],
      { gameId: 'game-low' }
    )
    const statsP1 = computePlayerSummaryStats('p1', [s], GAMES)
    const statsP2 = computePlayerSummaryStats('p2', [s], GAMES)
    expect(statsP1.wins).toBe(1) // p1 a le score le plus bas → gagne
    expect(statsP2.wins).toBe(0)
  })
})

// ── computePlayerDetailStats ─────────────────────────────────────────────────

describe('computePlayerDetailStats', () => {
  it('retourne des stats vides pour un joueur sans partie', () => {
    const stats = computePlayerDetailStats('p1', [], GAMES)
    expect(stats.gamesPlayed).toBe(0)
    expect(stats.wins).toBe(0)
    expect(stats.winRate).toBe(0)
    expect(stats.podiums).toBe(0)
    expect(stats.byGame).toEqual([])
    expect(stats.recentSessions).toEqual([])
  })

  it('compte les podiums (2e et 3e places)', () => {
    const first  = makeSession('1', ['p1', 'p2', 'p3'], [{ pid: 'p1', pts: 30 }, { pid: 'p2', pts: 20 }, { pid: 'p3', pts: 10 }])
    const second = makeSession('2', ['p1', 'p2', 'p3'], [{ pid: 'p1', pts: 20 }, { pid: 'p2', pts: 30 }, { pid: 'p3', pts: 10 }])
    const third  = makeSession('3', ['p1', 'p2', 'p3'], [{ pid: 'p1', pts: 10 }, { pid: 'p2', pts: 30 }, { pid: 'p3', pts: 20 }])
    const last   = makeSession('4', ['p1', 'p2', 'p3', 'p4'], [{ pid: 'p1', pts: 5 }, { pid: 'p2', pts: 30 }, { pid: 'p3', pts: 20 }, { pid: 'p4', pts: 10 }])
    const stats = computePlayerDetailStats('p1', [first, second, third, last], GAMES)
    expect(stats.wins).toBe(1)
    expect(stats.podiums).toBe(2) // 2e et 3e
  })

  it('ne compte pas les 1ères places en podiums', () => {
    const win = makeSession('1', ['p1', 'p2'], [{ pid: 'p1', pts: 20 }, { pid: 'p2', pts: 10 }])
    const stats = computePlayerDetailStats('p1', [win], GAMES)
    expect(stats.wins).toBe(1)
    expect(stats.podiums).toBe(0)
  })

  describe('byGame', () => {
    it('groupe les stats par jeu', () => {
      const s1 = makeSession('1', ['p1', 'p2'], [{ pid: 'p1', pts: 20 }, { pid: 'p2', pts: 10 }], { gameId: 'game1' })
      const s2 = makeSession('2', ['p1', 'p2'], [{ pid: 'p1', pts: 15 }, { pid: 'p2', pts: 10 }], { gameId: 'game2' })
      const stats = computePlayerDetailStats('p1', [s1, s2], GAMES)
      expect(stats.byGame).toHaveLength(2)
    })

    it('trie byGame par nombre de parties décroissant', () => {
      const g1a = makeSession('1', ['p1', 'p2'], [{ pid: 'p1', pts: 10 }, { pid: 'p2', pts: 5 }], { gameId: 'game1' })
      const g1b = makeSession('2', ['p1', 'p2'], [{ pid: 'p1', pts: 8 },  { pid: 'p2', pts: 5 }], { gameId: 'game1' })
      const g2a = makeSession('3', ['p1', 'p2'], [{ pid: 'p1', pts: 7 },  { pid: 'p2', pts: 5 }], { gameId: 'game2' })
      const stats = computePlayerDetailStats('p1', [g1a, g1b, g2a], GAMES)
      expect(stats.byGame[0].gameId).toBe('game1')
      expect(stats.byGame[0].gamesPlayed).toBe(2)
      expect(stats.byGame[1].gameId).toBe('game2')
    })

    it('calcule le meilleur score (max pour un jeu normal)', () => {
      const s1 = makeSession('1', ['p1', 'p2'], [{ pid: 'p1', pts: 20 }, { pid: 'p2', pts: 10 }])
      const s2 = makeSession('2', ['p1', 'p2'], [{ pid: 'p1', pts: 35 }, { pid: 'p2', pts: 10 }])
      const stats = computePlayerDetailStats('p1', [s1, s2], GAMES)
      expect(stats.byGame[0].bestScore).toBe(35)
    })

    it('calcule le meilleur score (min pour un jeu lowest_wins)', () => {
      const s1 = makeSession('1', ['p1', 'p2'], [{ pid: 'p1', pts: 20 }, { pid: 'p2', pts: 30 }], { gameId: 'game-low' })
      const s2 = makeSession('2', ['p1', 'p2'], [{ pid: 'p1', pts: 8  }, { pid: 'p2', pts: 30 }], { gameId: 'game-low' })
      const stats = computePlayerDetailStats('p1', [s1, s2], GAMES)
      expect(stats.byGame[0].bestScore).toBe(8)
    })

    it('calcule le score moyen arrondi', () => {
      const s1 = makeSession('1', ['p1', 'p2'], [{ pid: 'p1', pts: 10 }, { pid: 'p2', pts: 5 }])
      const s2 = makeSession('2', ['p1', 'p2'], [{ pid: 'p1', pts: 11 }, { pid: 'p2', pts: 5 }])
      const s3 = makeSession('3', ['p1', 'p2'], [{ pid: 'p1', pts: 12 }, { pid: 'p2', pts: 5 }])
      // avg = (10+11+12)/3 = 11
      const stats = computePlayerDetailStats('p1', [s1, s2, s3], GAMES)
      expect(stats.byGame[0].avgScore).toBe(11)
    })
  })

  describe('recentSessions', () => {
    it('retourne au plus 5 parties', () => {
      const sessions = Array.from({ length: 7 }, (_, i) =>
        makeSession(String(i + 1), ['p1', 'p2'], [{ pid: 'p1', pts: 10 }, { pid: 'p2', pts: 5 }], {
          createdAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
        })
      )
      const stats = computePlayerDetailStats('p1', sessions, GAMES)
      expect(stats.recentSessions).toHaveLength(5)
    })

    it('trie les parties les plus récentes en premier', () => {
      const old   = makeSession('1', ['p1', 'p2'], [{ pid: 'p1', pts: 10 }, { pid: 'p2', pts: 5 }], { createdAt: '2024-01-01T00:00:00.000Z' })
      const newer = makeSession('2', ['p1', 'p2'], [{ pid: 'p1', pts: 10 }, { pid: 'p2', pts: 5 }], { createdAt: '2024-03-01T00:00:00.000Z' })
      const stats = computePlayerDetailStats('p1', [old, newer], GAMES)
      expect(stats.recentSessions[0].sessionId).toBe('2')
      expect(stats.recentSessions[1].sessionId).toBe('1')
    })

    it('inclut le score et la position correcte', () => {
      const s = makeSession('1', ['p1', 'p2'], [{ pid: 'p1', pts: 10 }, { pid: 'p2', pts: 20 }])
      const stats = computePlayerDetailStats('p1', [s], GAMES)
      expect(stats.recentSessions[0].score).toBe(10)
      expect(stats.recentSessions[0].position).toBe(2)
    })
  })
})
