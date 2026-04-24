import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSession, getSessionById, getSessionCount, clearSessions } from './sessions'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

describe('sessions', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('createSession persiste bien en localStorage', () => {
    createSession('endeavor', ['p1', 'p2'])
    const raw = localStorageMock.getItem('panda-sessions')
    expect(raw).not.toBeNull()
    const sessions = JSON.parse(raw!)
    expect(sessions).toHaveLength(1)
    expect(sessions[0].gameId).toBe('endeavor')
    expect(sessions[0].players).toEqual(['p1', 'p2'])
    expect(sessions[0].status).toBe('in_progress')
  })

  it('createSession retourne la session créée avec un id', () => {
    const session = createSession('chateau-combo', ['p1'])
    expect(session.id).toBeTruthy()
    expect(session.gameId).toBe('chateau-combo')
  })

  it('getSessionById retourne la bonne session', () => {
    const session = createSession('endeavor', ['p1'])
    const found = getSessionById(session.id)
    expect(found).toBeDefined()
    expect(found?.id).toBe(session.id)
  })

  it('getSessionById retourne undefined pour un id inconnu', () => {
    expect(getSessionById('unknown')).toBeUndefined()
  })
})

import {
  updateScore,
  finishSession,
  resolveSessionPlayers,
  getFinishedSessions,
  getInProgressSessions,
  updateSessionProgress,
  abandonSession,
  deleteSession,
  getRecentGameIds,
} from './sessions'

describe('updateScore', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('ajoute un score en localStorage', () => {
    const session = createSession('endeavor', ['p1'])
    updateScore(session.id, { playerId: 'p1', fieldId: 'villes', value: 5 })
    const updated = getSessionById(session.id)
    expect(updated?.scores).toHaveLength(1)
    expect(updated?.scores[0]).toMatchObject({ playerId: 'p1', fieldId: 'villes', value: 5 })
  })

  it('met à jour un score existant sans doublon', () => {
    const session = createSession('endeavor', ['p1'])
    updateScore(session.id, { playerId: 'p1', fieldId: 'villes', value: 5 })
    updateScore(session.id, { playerId: 'p1', fieldId: 'villes', value: 8 })
    const updated = getSessionById(session.id)
    expect(updated?.scores).toHaveLength(1)
    expect(updated?.scores[0].value).toBe(8)
  })

  it('distingue les scores par round', () => {
    const session = createSession('game', ['p1'])
    updateScore(session.id, { playerId: 'p1', fieldId: 'pts', value: 3, round: 1 })
    updateScore(session.id, { playerId: 'p1', fieldId: 'pts', value: 5, round: 2 })
    const updated = getSessionById(session.id)
    expect(updated?.scores).toHaveLength(2)
  })
})

describe('finishSession', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('passe le status à "finished"', () => {
    const session = createSession('endeavor', ['p1'])
    expect(getSessionById(session.id)?.status).toBe('in_progress')
    finishSession(session.id, { p1: 'Alice' })
    expect(getSessionById(session.id)?.status).toBe('finished')
  })

  it('stocke les noms des joueurs en dur dans playerNames', () => {
    const session = createSession('endeavor', ['p1', 'p2'])
    finishSession(session.id, { p1: 'Alice', p2: 'Bob' })
    const saved = getSessionById(session.id)
    expect(saved?.playerNames).toEqual({ p1: 'Alice', p2: 'Bob' })
  })
})

describe('clearSessions / getSessionCount', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('getSessionCount retourne 0 si aucune session', () => {
    expect(getSessionCount()).toBe(0)
  })

  it('getSessionCount retourne le bon nombre de sessions', () => {
    createSession('game', ['p1'])
    createSession('game', ['p2'])
    expect(getSessionCount()).toBe(2)
  })

  it('getSessionCount inclut les sessions in_progress et finished', () => {
    const session = createSession('game', ['p1'])
    finishSession(session.id, { p1: 'Alice' })
    createSession('game', ['p2'])
    expect(getSessionCount()).toBe(2)
    expect(getFinishedSessions()).toHaveLength(1)
  })

  it('clearSessions vide le localStorage des sessions', () => {
    createSession('game', ['p1'])
    createSession('game', ['p2'])
    clearSessions()
    expect(localStorageMock.getItem('panda-sessions')).toBeNull()
    expect(getSessionCount()).toBe(0)
  })
})

describe('getInProgressSessions', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('retourne uniquement les sessions in_progress', () => {
    const s1 = createSession('game', ['p1'])
    const s2 = createSession('game', ['p2'])
    finishSession(s1.id, { p1: 'Alice' })
    const result = getInProgressSessions()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(s2.id)
  })

  it('retourne un tableau vide si aucune session en cours', () => {
    const s = createSession('game', ['p1'])
    finishSession(s.id, { p1: 'Alice' })
    expect(getInProgressSessions()).toHaveLength(0)
  })
})

describe('updateSessionProgress', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('sauvegarde la progression dans la session', () => {
    const session = createSession('game', ['p1'])
    updateSessionProgress(session.id, { fieldIndex: 2, playerIndex: 1, round: 3, phase: 'scoring' })
    const updated = getSessionById(session.id)
    expect(updated?.progress).toEqual({ fieldIndex: 2, playerIndex: 1, round: 3, phase: 'scoring' })
  })

  it('écrase la progression précédente', () => {
    const session = createSession('game', ['p1'])
    updateSessionProgress(session.id, { fieldIndex: 0, playerIndex: 0, round: 1, phase: 'scoring' })
    updateSessionProgress(session.id, { fieldIndex: 1, playerIndex: 0, round: 1, phase: 'round_summary' })
    const updated = getSessionById(session.id)
    expect(updated?.progress?.fieldIndex).toBe(1)
    expect(updated?.progress?.phase).toBe('round_summary')
  })

  it('ne fait rien pour un id inconnu', () => {
    expect(() => updateSessionProgress('unknown', { fieldIndex: 0, playerIndex: 0, round: 1, phase: 'scoring' })).not.toThrow()
  })
})

describe('abandonSession', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('supprime la session du localStorage', () => {
    const s = createSession('game', ['p1'])
    abandonSession(s.id)
    expect(getSessionById(s.id)).toBeUndefined()
  })

  it('ne supprime que la session ciblée', () => {
    const s1 = createSession('game', ['p1'])
    const s2 = createSession('game', ['p2'])
    abandonSession(s1.id)
    expect(getSessionById(s1.id)).toBeUndefined()
    expect(getSessionById(s2.id)).toBeDefined()
  })

  it('ne fait rien pour un id inconnu', () => {
    createSession('game', ['p1'])
    expect(() => abandonSession('unknown')).not.toThrow()
    expect(getSessionCount()).toBe(1)
  })
})

describe('deleteSession', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('supprime une partie terminée du localStorage', () => {
    const s = createSession('game', ['p1'])
    finishSession(s.id, { p1: 'Alice' })
    deleteSession(s.id)
    expect(getSessionById(s.id)).toBeUndefined()
    expect(getFinishedSessions()).toHaveLength(0)
  })

  it('ne supprime que la session ciblée', () => {
    const s1 = createSession('game', ['p1'])
    const s2 = createSession('game', ['p2'])
    finishSession(s1.id, { p1: 'Alice' })
    finishSession(s2.id, { p2: 'Bob' })
    deleteSession(s1.id)
    expect(getSessionById(s1.id)).toBeUndefined()
    expect(getSessionById(s2.id)).toBeDefined()
  })

  it('ne fait rien pour un id inconnu', () => {
    createSession('game', ['p1'])
    expect(() => deleteSession('unknown')).not.toThrow()
    expect(getSessionCount()).toBe(1)
  })
})

describe('getRecentGameIds', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('retourne un tableau vide si aucune session terminée', () => {
    createSession('game-a', ['p1'])
    expect(getRecentGameIds(3)).toEqual([])
  })

  it('retourne les game IDs des parties terminées, plus récent en premier', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T10:00:00Z'))
    const s1 = createSession('game-a', ['p1'])
    finishSession(s1.id, { p1: 'Alice' })
    vi.setSystemTime(new Date('2024-01-01T11:00:00Z'))
    const s2 = createSession('game-b', ['p1'])
    finishSession(s2.id, { p1: 'Alice' })
    vi.useRealTimers()
    // s2 (game-b) plus récent que s1 (game-a)
    const result = getRecentGameIds(3)
    expect(result[0]).toBe('game-b')
    expect(result[1]).toBe('game-a')
  })

  it('déduplique les game IDs', () => {
    const s1 = createSession('game-a', ['p1'])
    finishSession(s1.id, { p1: 'Alice' })
    const s2 = createSession('game-a', ['p1'])
    finishSession(s2.id, { p1: 'Alice' })
    expect(getRecentGameIds(3)).toEqual(['game-a'])
  })

  it('limite à n résultats', () => {
    for (const id of ['g1', 'g2', 'g3', 'g4']) {
      const s = createSession(id, ['p1'])
      finishSession(s.id, { p1: 'Alice' })
    }
    expect(getRecentGameIds(2)).toHaveLength(2)
  })

  it('ignore les sessions in_progress', () => {
    createSession('game-a', ['p1'])
    expect(getRecentGameIds(3)).toEqual([])
  })
})

describe('resolveSessionPlayers', () => {
  const PLAYERS = [
    { id: 'p1', name: 'Alice', createdAt: '' },
    { id: 'p2', name: 'Bob', createdAt: '' },
  ]

  it('utilise le nom dénormalisé quand playerNames est présent', () => {
    const session = {
      id: 's1', gameId: 'g', players: ['p1', 'p2'],
      playerNames: { p1: 'Alice (ancienne)', p2: 'Bob (ancien)' },
      createdAt: '', status: 'finished' as const, scores: [],
    }
    const result = resolveSessionPlayers(session, PLAYERS)
    expect(result[0].name).toBe('Alice (ancienne)')
    expect(result[1].name).toBe('Bob (ancien)')
    expect(result[0].deleted).toBeUndefined()
  })

  it('utilise le nom de la base quand playerNames est absent (ancienne partie)', () => {
    const session = {
      id: 's1', gameId: 'g', players: ['p1', 'p2'],
      createdAt: '', status: 'finished' as const, scores: [],
    }
    const result = resolveSessionPlayers(session, PLAYERS)
    expect(result[0].name).toBe('Alice')
    expect(result[1].name).toBe('Bob')
  })

  it('retourne "Joueur supprimé" pour un joueur absent de la base', () => {
    const session = {
      id: 's1', gameId: 'g', players: ['p1', 'p99'],
      createdAt: '', status: 'finished' as const, scores: [],
    }
    const result = resolveSessionPlayers(session, PLAYERS)
    expect(result[1].name).toBe('Joueur supprimé')
    expect(result[1].deleted).toBe(true)
  })

  it('conserve l\'id du joueur supprimé pour le calcul des scores', () => {
    const session = {
      id: 's1', gameId: 'g', players: ['p99'],
      createdAt: '', status: 'finished' as const, scores: [],
    }
    const result = resolveSessionPlayers(session, PLAYERS)
    expect(result[0].id).toBe('p99')
  })
})
