import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getGames, getGameById, addGame, searchGames, type Game } from './games'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

describe('games', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('getGames() retourne les jeux hardcodés', () => {
    const games = getGames()
    expect(games.length).toBeGreaterThanOrEqual(3)
    const ids = games.map((g) => g.id)
    expect(ids).toContain('endeavor')
    expect(ids).toContain('chateau-combo')
    expect(ids).toContain('foret-mixte-dartmoor')
  })

  it('getGames() retourne uniquement des jeux validés parmi les hardcodés', () => {
    const games = getGames()
    const defaults = games.filter((g) => ['endeavor', 'chateau-combo', 'foret-mixte-dartmoor'].includes(g.id))
    defaults.forEach((g) => expect(g.validated).toBe(true))
  })

  it('searchGames("endeavor") retourne Endeavor', () => {
    const results = searchGames('endeavor')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('endeavor')
  })

  it('searchGames est insensible à la casse', () => {
    const results = searchGames('ENDEAVOR')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('endeavor')
  })

  it('searchGames("") retourne tous les jeux', () => {
    expect(searchGames('')).toHaveLength(getGames().length)
  })

  it('addGame() persiste en localStorage', () => {
    const custom: Game = {
      id: 'test-game',
      name: 'Test Game',
      players: { min: 2, max: 4 },
      scoring_model: 'end_game',
      scoring: [],
      computed: [],
      validated: false,
      createdAt: new Date().toISOString(),
    }
    addGame(custom)
    const stored = JSON.parse(localStorageMock.getItem('panda-custom-games') ?? '[]') as Game[]
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('test-game')
  })

  it('addGame() rend le jeu disponible via getGames()', () => {
    const custom: Game = {
      id: 'another-game',
      name: 'Another Game',
      players: { min: 1, max: 2 },
      scoring_model: 'per_round',
      scoring: [],
      computed: [],
      validated: false,
      createdAt: new Date().toISOString(),
    }
    addGame(custom)
    const ids = getGames().map((g) => g.id)
    expect(ids).toContain('another-game')
  })

  it('getGameById() retourne le bon jeu', () => {
    const game = getGameById('chateau-combo')
    expect(game).toBeDefined()
    expect(game?.name).toBe('Château Combo')
  })

  it('getGameById() retourne undefined pour un id inconnu', () => {
    expect(getGameById('unknown')).toBeUndefined()
  })

  it('getGameById() trouve un jeu custom ajouté', () => {
    const custom: Game = {
      id: 'custom-1',
      name: 'Custom',
      players: { min: 2, max: 2 },
      scoring_model: 'end_game',
      scoring: [],
      computed: [],
      validated: false,
      createdAt: new Date().toISOString(),
    }
    addGame(custom)
    expect(getGameById('custom-1')?.name).toBe('Custom')
  })
})
