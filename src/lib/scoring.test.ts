import { describe, it, expect } from 'vitest'
import { computePlayerTotal, computePerRoundTotal, resolvePlayerTotal } from './scoring'
import { buildCustomGame } from './games'
import { DEFAULT_GAMES } from './games-default'
import type { Game } from './games'
import type { GameSession, ScoreEntry } from './sessions'

const chateauCombo = DEFAULT_GAMES.find((g) => g.id === 'chateau-combo')!
const endeavor = DEFAULT_GAMES.find((g) => g.id === 'endeavor')!
const foretMixte = DEFAULT_GAMES.find((g) => g.id === 'foret-mixte-dartmoor')!

describe('computePlayerTotal', () => {
  it('calcule le total Château Combo (somme simple)', () => {
    const scores: ScoreEntry[] = [
      { playerId: 'p1', fieldId: 'carte_1_1', value: 3 },
      { playerId: 'p1', fieldId: 'carte_1_2', value: 2 },
      { playerId: 'p1', fieldId: 'carte_1_3', value: 1 },
      { playerId: 'p1', fieldId: 'carte_2_1', value: 4 },
      { playerId: 'p1', fieldId: 'carte_2_2', value: 2 },
      { playerId: 'p1', fieldId: 'carte_2_3', value: 3 },
      { playerId: 'p1', fieldId: 'carte_3_1', value: 1 },
      { playerId: 'p1', fieldId: 'carte_3_2', value: 2 },
      { playerId: 'p1', fieldId: 'carte_3_3', value: 5 },
      { playerId: 'p1', fieldId: 'cles_restantes', value: 2 },
    ]
    expect(computePlayerTotal(chateauCombo, scores, 'p1')).toBe(25)
  })

  it('retourne 0 si aucun score', () => {
    expect(computePlayerTotal(chateauCombo, [], 'p1')).toBe(0)
  })

  it('calcule le total Forêt Mixte (somme simple)', () => {
    const scores: ScoreEntry[] = [
      { playerId: 'p1', fieldId: 'arbres', value: 4 },
      { playerId: 'p1', fieldId: 'landes', value: 3 },
      { playerId: 'p1', fieldId: 'horizontal', value: 2 },
      { playerId: 'p1', fieldId: 'haut', value: 1 },
      { playerId: 'p1', fieldId: 'bas', value: 5 },
      { playerId: 'p1', fieldId: 'grotte', value: 2 },
    ]
    expect(computePlayerTotal(foretMixte, scores, 'p1')).toBe(17)
  })

  it('calcule le total Endeavor avec bonus gouverneur (boolean true)', () => {
    const scores: ScoreEntry[] = [
      { playerId: 'p1', fieldId: 'villes', value: 5 },
      { playerId: 'p1', fieldId: 'routes', value: 3 },
      { playerId: 'p1', fieldId: 'industrie', value: 2 },
      { playerId: 'p1', fieldId: 'culture', value: 1 },
      { playerId: 'p1', fieldId: 'finances', value: 4 },
      { playerId: 'p1', fieldId: 'politique', value: 2 },
      { playerId: 'p1', fieldId: 'cartes_actifs', value: 3 },
      { playerId: 'p1', fieldId: 'gouverneur_vide', value: true },  // +3
      { playerId: 'p1', fieldId: 'universites', value: 2 },          // +6
      { playerId: 'p1', fieldId: 'population_port', value: 9 },      // +3
      { playerId: 'p1', fieldId: 'esclavage', value: 1 },
    ]
    // base: 5+3+2+1+4+2+3 = 20
    // bonus_gouverneur: 3, bonus_universites: 6, bonus_population: floor(9/3)=3
    // total: 20 + 3 + 6 + 3 - 1 = 31
    expect(computePlayerTotal(endeavor, scores, 'p1')).toBe(31)
  })

  it('ignore les scores d\'autres joueurs', () => {
    const scores: ScoreEntry[] = [
      { playerId: 'p1', fieldId: 'arbres', value: 10 },
      { playerId: 'p2', fieldId: 'arbres', value: 5 },
    ]
    expect(computePlayerTotal(foretMixte, scores, 'p1')).toBe(10)
    expect(computePlayerTotal(foretMixte, scores, 'p2')).toBe(5)
  })
})

describe('buildCustomGame + computePlayerTotal', () => {
  it('génère des IDs positionnels field_N indépendants du label', () => {
    const game = buildCustomGame({
      name: 'Test',
      playersMin: 2,
      playersMax: 4,
      scoringModel: 'end_game',
      categories: [
        { label: '1', type: 'number' },
        { label: 'Sanctuaires', type: 'number' },
        { label: '€ points', type: 'number' },
      ],
    })
    expect(game.scoring[0].id).toBe('field_0')
    expect(game.scoring[1].id).toBe('field_1')
    expect(game.scoring[2].id).toBe('field_2')
    expect(game.computed[0].formula).toBe('field_0 + field_1 + field_2')
  })

  it('calcule le total pour un jeu custom avec des catégories classiques', () => {
    const game = buildCustomGame({
      name: 'Mon Jeu',
      playersMin: 2,
      playersMax: 4,
      scoringModel: 'end_game',
      categories: [
        { label: 'Points', type: 'number' },
        { label: 'Bonus', type: 'number' },
      ],
    })
    const scores: ScoreEntry[] = [
      { playerId: 'p1', fieldId: game.scoring[0].id, value: 10 },
      { playerId: 'p1', fieldId: game.scoring[1].id, value: 5 },
    ]
    expect(computePlayerTotal(game, scores, 'p1')).toBe(15)
  })

  it('calcule le total pour un jeu custom dont les catégories commencent par un chiffre', () => {
    const game = buildCustomGame({
      name: 'Mon Jeu',
      playersMin: 2,
      playersMax: 4,
      scoringModel: 'end_game',
      categories: [
        { label: '1er critère', type: 'number' },
        { label: '2e critère', type: 'number' },
      ],
    })
    const scores: ScoreEntry[] = [
      { playerId: 'p1', fieldId: game.scoring[0].id, value: 7 },
      { playerId: 'p1', fieldId: game.scoring[1].id, value: 3 },
    ]
    expect(computePlayerTotal(game, scores, 'p1')).toBe(10)
  })

  it('Faraway : 8 catégories chiffres + Sanctuaires — simule le round-trip localStorage', () => {
    // Reproduit exactement le cas signalé : labels "1","2",...,"8","Sanctuaires"
    const gameRaw = buildCustomGame({
      name: 'Faraway',
      playersMin: 2,
      playersMax: 6,
      scoringModel: 'end_game',
      categories: [
        { label: '1', type: 'number' },
        { label: '2', type: 'number' },
        { label: '3', type: 'number' },
        { label: '4', type: 'number' },
        { label: '5', type: 'number' },
        { label: '6', type: 'number' },
        { label: '7', type: 'number' },
        { label: '8', type: 'number' },
        { label: 'Sanctuaires', type: 'number' },
      ],
    })
    // Simule le round-trip JSON (localStorage)
    const game = JSON.parse(JSON.stringify(gameRaw))

    // Les scores sont stockés avec les field IDs du jeu (comme le fait GameSession.tsx)
    const scores: ScoreEntry[] = game.scoring.map((f: { id: string }, i: number) => ({
      playerId: 'p1',
      fieldId: f.id,
      value: i + 1, // 1, 2, 3, 4, 5, 6, 7, 8, 9
    }))

    // Total attendu : 1+2+3+4+5+6+7+8+9 = 45
    expect(computePlayerTotal(game, scores, 'p1')).toBe(45)
  })
})

// ── Recalcul dynamique : régression et nouveaux cas ─────────────────────────

describe('recalcul dynamique des totaux', () => {
  // Simule un jeu custom créé AVANT le fix v2 (IDs = "1","2",...  formule = "1 + 2 + sanctuaires")
  const legacyGame: Game = {
    id: 'legacy-custom',
    name: 'Vieux jeu custom',
    players: { min: 2, max: 4 },
    scoring_model: 'end_game',
    scoring: [
      { id: '1', label: '1', type: 'number', confident: true },
      { id: '2', label: '2', type: 'number', confident: true },
      { id: 'sanctuaires', label: 'Sanctuaires', type: 'number', confident: true },
    ],
    computed: [{ id: 'total', formula: '1 + 2 + sanctuaires', confident: true }],
    validated: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  }

  it('partie avec total=0 stocké mais scores non nuls → recalcule correctement', () => {
    const scores: ScoreEntry[] = [
      { playerId: 'p1', fieldId: '1', value: 10 },
      { playerId: 'p1', fieldId: '2', value: 5 },
      { playerId: 'p1', fieldId: 'sanctuaires', value: 3 },
    ]
    // Avant le fix : formula "1 + 2 + sanctuaires" échouait → 0
    // Après le fix : la substitution inline produit "10 + 5 + 3" → 18
    expect(computePlayerTotal(legacyGame, scores, 'p1')).toBe(18)
  })

  it('Endeavor hardcodé : le total recalculé inclut les bonus computed', () => {
    const scores: ScoreEntry[] = [
      { playerId: 'p1', fieldId: 'villes', value: 5 },
      { playerId: 'p1', fieldId: 'routes', value: 3 },
      { playerId: 'p1', fieldId: 'industrie', value: 2 },
      { playerId: 'p1', fieldId: 'culture', value: 1 },
      { playerId: 'p1', fieldId: 'finances', value: 4 },
      { playerId: 'p1', fieldId: 'politique', value: 2 },
      { playerId: 'p1', fieldId: 'cartes_actifs', value: 3 },
      { playerId: 'p1', fieldId: 'gouverneur_vide', value: true },  // +3
      { playerId: 'p1', fieldId: 'universites', value: 2 },          // +6
      { playerId: 'p1', fieldId: 'population_port', value: 9 },      // +3
      { playerId: 'p1', fieldId: 'esclavage', value: 1 },
    ]
    const endeavor = DEFAULT_GAMES.find((g) => g.id === 'endeavor')!
    expect(computePlayerTotal(endeavor, scores, 'p1')).toBe(31)
  })

  it('jeu per_round : le total recalculé = somme des manches', () => {
    const perRoundGame: Game = {
      id: 'per-round-test',
      name: 'Jeu par manche',
      players: { min: 2, max: 4 },
      scoring_model: 'per_round',
      scoring: [{ id: 'pts', label: 'Points', type: 'number', confident: true }],
      computed: [{ id: 'total', formula: 'pts', confident: true }],
      validated: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    }
    const scores: ScoreEntry[] = [
      { playerId: 'p1', fieldId: 'pts', value: 10, round: 1 },
      { playerId: 'p1', fieldId: 'pts', value: 7, round: 2 },
      { playerId: 'p1', fieldId: 'pts', value: 13, round: 3 },
    ]
    expect(computePerRoundTotal(perRoundGame, scores, 'p1')).toBe(30)
  })
})

// ── resolvePlayerTotal ───────────────────────────────────────────────────────

describe('resolvePlayerTotal', () => {
  const baseSession: GameSession = {
    id: 's1',
    gameId: 'some-game',
    players: ['p1', 'p2'],
    createdAt: '2024-01-01T00:00:00.000Z',
    status: 'finished',
    scores: [
      { playerId: 'p1', fieldId: '1', value: 10 },
      { playerId: 'p1', fieldId: '2', value: 5 },
      { playerId: 'p1', fieldId: 'sanctuaires', value: 3 },
    ],
  }

  const legacyGame: Game = {
    id: 'some-game',
    name: 'Legacy',
    players: { min: 2, max: 4 },
    scoring_model: 'end_game',
    scoring: [
      { id: '1', label: '1', type: 'number', confident: true },
      { id: '2', label: '2', type: 'number', confident: true },
      { id: 'sanctuaires', label: 'Sanctuaires', type: 'number', confident: true },
    ],
    computed: [{ id: 'total', formula: '1 + 2 + sanctuaires', confident: true }],
    validated: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  }

  it('recalcule depuis les scores quand le jeu est disponible', () => {
    expect(resolvePlayerTotal(baseSession, legacyGame, 'p1')).toBe(18)
  })

  it('fallback sur playerTotals stockés quand le jeu est supprimé', () => {
    const sessionWithTotals: GameSession = {
      ...baseSession,
      playerTotals: { p1: 42, p2: 17 },
    }
    expect(resolvePlayerTotal(sessionWithTotals, undefined, 'p1')).toBe(42)
    expect(resolvePlayerTotal(sessionWithTotals, undefined, 'p2')).toBe(17)
  })

  it('retourne 0 si jeu supprimé et aucun total stocké', () => {
    expect(resolvePlayerTotal(baseSession, undefined, 'p1')).toBe(0)
  })
})
