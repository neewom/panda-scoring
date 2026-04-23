import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getGames, getGameById, addGame, updateGame, searchGames, buildCustomGame, computeRoundCount, getCustomGames, clearCustomGames, deleteGame, type Game } from './games'

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
      validated: false,
      createdAt: new Date().toISOString(),
    }
    addGame(custom)
    expect(getGameById('custom-1')?.name).toBe('Custom')
  })
})

describe('getCustomGames / clearCustomGames', () => {
  const CUSTOM: Game = {
    id: 'custom-test',
    name: 'Custom Test',
    players: { min: 2, max: 4 },
    scoring_model: 'end_game',
    scoring: [],
    validated: true,
    createdAt: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('getCustomGames retourne une liste vide sans jeu custom', () => {
    expect(getCustomGames()).toEqual([])
  })

  it('getCustomGames retourne uniquement les jeux custom (pas les hardcodés)', () => {
    addGame(CUSTOM)
    const custom = getCustomGames()
    expect(custom).toHaveLength(1)
    expect(custom[0].id).toBe('custom-test')
    expect(custom.find((g) => g.id === 'endeavor')).toBeUndefined()
  })

  it('clearCustomGames supprime uniquement les jeux custom', () => {
    addGame(CUSTOM)
    expect(getCustomGames()).toHaveLength(1)
    clearCustomGames()
    expect(getCustomGames()).toHaveLength(0)
    expect(getGames().find((g) => g.id === 'endeavor')).toBeDefined()
  })

  it('clearCustomGames sur une liste vide ne génère pas d\'erreur', () => {
    expect(() => clearCustomGames()).not.toThrow()
    expect(getCustomGames()).toEqual([])
  })

  it('deleteGame supprime uniquement le jeu ciblé', () => {
    const other: Game = { ...CUSTOM, id: 'other-game', name: 'Other' }
    addGame(CUSTOM)
    addGame(other)
    deleteGame('custom-test')
    const custom = getCustomGames()
    expect(custom).toHaveLength(1)
    expect(custom[0].id).toBe('other-game')
  })

  it('deleteGame masque un jeu hardcodé via la blocklist', () => {
    deleteGame('endeavor')
    expect(getGameById('endeavor')).toBeUndefined()
    expect(getGames().find((g) => g.id === 'endeavor')).toBeUndefined()
  })

  it('deleteGame sur un id inexistant ne génère pas d\'erreur', () => {
    addGame(CUSTOM)
    expect(() => deleteGame('nonexistent')).not.toThrow()
    expect(getCustomGames()).toHaveLength(1)
  })
})

describe('updateGame', () => {
  const BASE: Game = {
    id: 'update-test',
    name: 'Update Test',
    players: { min: 2, max: 4 },
    scoring_model: 'end_game',
    scoring: [],
    validated: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  }

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('met à jour un jeu custom existant sans dupliquer', () => {
    addGame(BASE)
    updateGame({ ...BASE, name: 'Nouveau nom' })
    const custom = getCustomGames()
    expect(custom).toHaveLength(1)
    expect(custom[0].name).toBe('Nouveau nom')
  })

  it('préserve l\'id et le createdAt du jeu d\'origine', () => {
    addGame(BASE)
    updateGame({ ...BASE, name: 'Modifié' })
    const game = getGameById('update-test')
    expect(game?.id).toBe('update-test')
    expect(game?.createdAt).toBe('2024-01-01T00:00:00.000Z')
  })

  it('masque un jeu hardcodé lors de la première modification', () => {
    updateGame({ ...BASE, id: 'endeavor', name: 'Endeavor modifié' })
    const game = getGameById('endeavor')
    expect(game?.name).toBe('Endeavor modifié')
    // le hardcodé d'origine ne doit plus apparaître en double
    expect(getGames().filter((g) => g.id === 'endeavor')).toHaveLength(1)
  })
})

describe('buildCustomGame', () => {
  const BASE = {
    name: 'Test',
    playersMin: 2,
    playersMax: 4,
    scoringModel: 'end_game' as const,
  }

  it('end_game : génère des IDs positionnels field_N', () => {
    const game = buildCustomGame({
      ...BASE,
      categories: [{ label: 'Points' }, { label: 'Bonus' }],
    })
    expect(game.scoring[0].id).toBe('field_0')
    expect(game.scoring[1].id).toBe('field_1')
    expect(game.scoring.every((f) => f.type === 'number')).toBe(true)
  })

  it('per_round : crée automatiquement un champ Score unique', () => {
    const game = buildCustomGame({
      ...BASE,
      scoringModel: 'per_round',
      categories: [],
    })
    expect(game.scoring).toHaveLength(1)
    expect(game.scoring[0]).toMatchObject({ id: 'score', label: 'Score', type: 'number' })
  })

  it('validated est true', () => {
    const game = buildCustomGame({ ...BASE, categories: [{ label: 'Pts' }] })
    expect(game.validated).toBe(true)
  })

  it('scoring_model end_game : rounds est undefined', () => {
    const game = buildCustomGame({ ...BASE, categories: [] })
    expect(game.rounds).toBeUndefined()
  })

  it('per_round avec nombre fixe : rounds est un number', () => {
    const game = buildCustomGame({
      ...BASE,
      scoringModel: 'per_round',
      rounds: 5,
      categories: [],
    })
    expect(game.rounds).toBe(5)
    expect(game.scoring_model).toBe('per_round')
  })

  it('per_round avec perPlayer:1 : rounds est { perPlayer: 1 }', () => {
    const game = buildCustomGame({
      ...BASE,
      scoringModel: 'per_round',
      rounds: { perPlayer: 1 },
      categories: [],
    })
    expect(game.rounds).toEqual({ perPlayer: 1 })
  })

  it('deux catégories au même label → IDs différents', () => {
    const game = buildCustomGame({
      ...BASE,
      categories: [{ label: 'Points' }, { label: 'Points' }],
    })
    const ids = game.scoring.map((f) => f.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('label quelconque → field_N (pas de slug)', () => {
    const game = buildCustomGame({
      ...BASE,
      categories: [{ label: '!!!' }],
    })
    expect(game.scoring[0].id).toMatch(/^field_/)
  })
})

describe('buildCustomGame — lowest_wins & end_condition', () => {
  const BASE = {
    name: 'Test',
    playersMin: 2,
    playersMax: 4,
    scoringModel: 'per_round' as const,
    categories: [] as { label: string }[],
  }

  it('lowest_wins true est conservé', () => {
    const game = buildCustomGame({ ...BASE, lowest_wins: true })
    expect(game.lowest_wins).toBe(true)
  })

  it('lowest_wins false produit undefined (non stocké)', () => {
    const game = buildCustomGame({ ...BASE, lowest_wins: false })
    expect(game.lowest_wins).toBeUndefined()
  })

  it('lowest_wins absent produit undefined', () => {
    const game = buildCustomGame({ ...BASE })
    expect(game.lowest_wins).toBeUndefined()
  })

  it('end_condition est conservé', () => {
    const game = buildCustomGame({ ...BASE, end_condition: { score_threshold: 66 } })
    expect(game.end_condition).toEqual({ score_threshold: 66 })
  })

  it('end_condition absent produit undefined', () => {
    const game = buildCustomGame({ ...BASE })
    expect(game.end_condition).toBeUndefined()
  })
})

describe('jeux par défaut — 6 qui prend', () => {
  it('6 qui prend est dans la bibliothèque', () => {
    const ids = getGames().map((g) => g.id)
    expect(ids).toContain('6-qui-prend')
  })

  it('6 qui prend a lowest_wins et end_condition corrects', () => {
    const game = getGameById('6-qui-prend')
    expect(game).toBeDefined()
    expect(game!.lowest_wins).toBe(true)
    expect(game!.end_condition).toEqual({ score_threshold: 66 })
    expect(game!.scoring_model).toBe('per_round')
  })
})

describe('computeRoundCount', () => {
  it('retourne null si rounds est undefined', () => {
    const game = buildCustomGame({ name: 'G', playersMin: 2, playersMax: 4, scoringModel: 'end_game', categories: [] })
    expect(computeRoundCount(game, 3)).toBeNull()
  })

  it('retourne le nombre fixe si rounds est un number', () => {
    const game = buildCustomGame({ name: 'G', playersMin: 2, playersMax: 4, scoringModel: 'per_round', rounds: 5, categories: [] })
    expect(computeRoundCount(game, 3)).toBe(5)
    expect(computeRoundCount(game, 4)).toBe(5)
  })

  it('retourne playerCount × perPlayer quand rounds = { perPlayer: 1 }', () => {
    const game = buildCustomGame({ name: 'G', playersMin: 2, playersMax: 4, scoringModel: 'per_round', rounds: { perPlayer: 1 }, categories: [] })
    expect(computeRoundCount(game, 3)).toBe(3)
    expect(computeRoundCount(game, 4)).toBe(4)
  })
})
