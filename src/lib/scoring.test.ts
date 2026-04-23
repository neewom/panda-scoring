import { describe, it, expect } from 'vitest'
import { computePlayerTotal, computePerRoundTotal, resolvePlayerTotal } from './scoring'
import { buildCustomGame } from './games'
import { DEFAULT_GAMES } from './games-default'
import type { Game } from './games'
import type { GameSession, ScoreEntry } from './sessions'

const chateauCombo = DEFAULT_GAMES.find((g) => g.id === 'chateau-combo')!
const foretMixte = DEFAULT_GAMES.find((g) => g.id === 'foret-mixte-dartmoor')!

// ── computePlayerTotal (end_game) ────────────────────────────────────────────

describe('computePlayerTotal', () => {
  it('calcule le total Château Combo — somme de tous les champs', () => {
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

  it('calcule le total Forêt Mixte — somme simple', () => {
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

  it('ignore les scores d\'autres joueurs', () => {
    const scores: ScoreEntry[] = [
      { playerId: 'p1', fieldId: 'arbres', value: 10 },
      { playerId: 'p2', fieldId: 'arbres', value: 5 },
    ]
    expect(computePlayerTotal(foretMixte, scores, 'p1')).toBe(10)
    expect(computePlayerTotal(foretMixte, scores, 'p2')).toBe(5)
  })

  it('un champ sans score compte pour 0', () => {
    const scores: ScoreEntry[] = [
      { playerId: 'p1', fieldId: 'arbres', value: 7 },
      // landes, horizontal, haut, bas, grotte manquants → 0
    ]
    expect(computePlayerTotal(foretMixte, scores, 'p1')).toBe(7)
  })
})

// ── buildCustomGame + computePlayerTotal ─────────────────────────────────────

describe('buildCustomGame + computePlayerTotal', () => {
  it('per_round crée automatiquement un champ "Score" unique', () => {
    const game = buildCustomGame({
      name: 'Jeu par manche',
      playersMin: 2,
      playersMax: 4,
      scoringModel: 'per_round',
      categories: [],
    })
    expect(game.scoring).toHaveLength(1)
    expect(game.scoring[0].id).toBe('score')
    expect(game.scoring[0].label).toBe('Score')
    expect(game.scoring[0].type).toBe('number')
  })

  it('end_game génère des IDs positionnels field_N', () => {
    const game = buildCustomGame({
      name: 'Test',
      playersMin: 2,
      playersMax: 4,
      scoringModel: 'end_game',
      categories: [
        { label: '1er critère' },
        { label: 'Sanctuaires' },
        { label: '€ points' },
      ],
    })
    expect(game.scoring[0].id).toBe('field_0')
    expect(game.scoring[1].id).toBe('field_1')
    expect(game.scoring[2].id).toBe('field_2')
  })

  it('total = somme de toutes les catégories end_game', () => {
    const game = buildCustomGame({
      name: 'Mon Jeu',
      playersMin: 2,
      playersMax: 4,
      scoringModel: 'end_game',
      categories: [{ label: 'Points' }, { label: 'Bonus' }],
    })
    const scores: ScoreEntry[] = [
      { playerId: 'p1', fieldId: game.scoring[0].id, value: 10 },
      { playerId: 'p1', fieldId: game.scoring[1].id, value: 5 },
    ]
    expect(computePlayerTotal(game, scores, 'p1')).toBe(15)
  })

  it('Faraway : 9 catégories — total correct après round-trip JSON', () => {
    const gameRaw = buildCustomGame({
      name: 'Faraway',
      playersMin: 2,
      playersMax: 6,
      scoringModel: 'end_game',
      categories: [
        { label: '1' }, { label: '2' }, { label: '3' }, { label: '4' },
        { label: '5' }, { label: '6' }, { label: '7' }, { label: '8' },
        { label: 'Sanctuaires' },
      ],
    })
    const game = JSON.parse(JSON.stringify(gameRaw))
    const scores: ScoreEntry[] = game.scoring.map((f: { id: string }, i: number) => ({
      playerId: 'p1', fieldId: f.id, value: i + 1,
    }))
    // 1+2+3+4+5+6+7+8+9 = 45
    expect(computePlayerTotal(game, scores, 'p1')).toBe(45)
  })
})

// ── computePerRoundTotal ─────────────────────────────────────────────────────

describe('computePerRoundTotal', () => {
  const perRoundGame: Game = {
    id: 'per-round-test',
    name: 'Jeu par manche',
    players: { min: 2, max: 4 },
    scoring_model: 'per_round',
    scoring: [{ id: 'score', label: 'Score', type: 'number', confident: true }],
    validated: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  }

  it('somme les scores par manche', () => {
    const scores: ScoreEntry[] = [
      { playerId: 'p1', fieldId: 'score', value: 10, round: 1 },
      { playerId: 'p1', fieldId: 'score', value: 7, round: 2 },
      { playerId: 'p1', fieldId: 'score', value: 13, round: 3 },
    ]
    expect(computePerRoundTotal(perRoundGame, scores, 'p1')).toBe(30)
  })

  it('retourne 0 si aucune manche', () => {
    expect(computePerRoundTotal(perRoundGame, [], 'p1')).toBe(0)
  })

  it('plusieurs joueurs indépendants', () => {
    const scores: ScoreEntry[] = [
      { playerId: 'p1', fieldId: 'score', value: 10, round: 1 },
      { playerId: 'p2', fieldId: 'score', value: 4, round: 1 },
      { playerId: 'p1', fieldId: 'score', value: 6, round: 2 },
      { playerId: 'p2', fieldId: 'score', value: 9, round: 2 },
    ]
    expect(computePerRoundTotal(perRoundGame, scores, 'p1')).toBe(16)
    expect(computePerRoundTotal(perRoundGame, scores, 'p2')).toBe(13)
  })
})

// ── resolvePlayerTotal ───────────────────────────────────────────────────────

describe('resolvePlayerTotal', () => {
  const simpleGame: Game = {
    id: 'some-game',
    name: 'Simple',
    players: { min: 2, max: 4 },
    scoring_model: 'end_game',
    scoring: [
      { id: 'pts', label: 'Points', type: 'number', confident: true },
      { id: 'bonus', label: 'Bonus', type: 'number', confident: true },
    ],
    validated: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  }

  const baseSession: GameSession = {
    id: 's1',
    gameId: 'some-game',
    players: ['p1', 'p2'],
    createdAt: '2024-01-01T00:00:00.000Z',
    status: 'finished',
    scores: [
      { playerId: 'p1', fieldId: 'pts', value: 10 },
      { playerId: 'p1', fieldId: 'bonus', value: 5 },
    ],
  }

  it('recalcule depuis les scores quand le jeu est disponible', () => {
    expect(resolvePlayerTotal(baseSession, simpleGame, 'p1')).toBe(15)
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
