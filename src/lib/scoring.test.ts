import { describe, it, expect } from 'vitest'
import { computePlayerTotal } from './scoring'
import { DEFAULT_GAMES } from './games-default'
import type { ScoreEntry } from './sessions'

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
