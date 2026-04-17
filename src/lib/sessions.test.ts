import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSession, getSessionById } from './sessions'

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

import { updateScore, finishSession, resolveSessionPlayers } from './sessions'

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
