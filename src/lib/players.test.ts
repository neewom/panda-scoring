import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getPlayers, addPlayer, deletePlayer } from './players'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

describe('players', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  describe('getPlayers', () => {
    it('retourne une liste vide si aucun joueur en localStorage', () => {
      expect(getPlayers()).toEqual([])
    })

    it('retourne la liste correcte depuis localStorage', () => {
      const players = [
        { id: '1', name: 'Alice', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: '2', name: 'Bob', createdAt: '2026-01-02T00:00:00.000Z' },
      ]
      localStorageMock.setItem('panda-players', JSON.stringify(players))
      expect(getPlayers()).toEqual(players)
    })
  })

  describe('addPlayer', () => {
    it('ajoute bien un joueur en localStorage', () => {
      addPlayer('Alice')
      const players = getPlayers()
      expect(players).toHaveLength(1)
      expect(players[0].name).toBe('Alice')
      expect(players[0].id).toBeDefined()
      expect(players[0].createdAt).toBeDefined()
    })

    it('ajoute plusieurs joueurs sans écraser les précédents', () => {
      addPlayer('Alice')
      addPlayer('Bob')
      expect(getPlayers()).toHaveLength(2)
    })

    it('trim le nom du joueur', () => {
      addPlayer('  Charlie  ')
      expect(getPlayers()[0].name).toBe('Charlie')
    })
  })

  describe('deletePlayer', () => {
    it('supprime le bon joueur', () => {
      addPlayer('Alice')
      addPlayer('Bob')
      const [alice] = getPlayers()
      deletePlayer(alice.id)
      const remaining = getPlayers()
      expect(remaining).toHaveLength(1)
      expect(remaining[0].name).toBe('Bob')
    })

    it('ne fait rien si l\'id n\'existe pas', () => {
      addPlayer('Alice')
      deletePlayer('inexistant')
      expect(getPlayers()).toHaveLength(1)
    })
  })
})
