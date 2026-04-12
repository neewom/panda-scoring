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
