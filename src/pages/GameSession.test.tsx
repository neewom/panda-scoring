import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import GameSession from './GameSession'
import { createSession, updateScore, getSessionById } from '@/lib/sessions'
import { addGame, computeRoundCount } from '@/lib/games'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

const PLAYERS = [
  { id: 'p1', name: 'Alice', createdAt: '' },
  { id: 'p2', name: 'Bob', createdAt: '' },
]

function renderSession(sessionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/game/${sessionId}`]}>
      <Routes>
        <Route path="/game/:id" element={<GameSession />} />
        <Route path="/game/:id/results" element={<div>Page résultats</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('GameSession — navigation arrière (end_game, Château Combo)', () => {
  let sessionId: string

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS))
    const session = createSession('chateau-combo', ['p1', 'p2'])
    sessionId = session.id
  })

  it('le bouton "Précédent" est absent sur le premier champ, premier joueur', () => {
    renderSession(sessionId)
    expect(
      screen.queryByRole('button', { name: /étape précédente/i })
    ).not.toBeInTheDocument()
  })

  it('le bouton "Précédent" est présent dès le deuxième joueur (même champ)', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /suivant/i }))
    expect(screen.getByRole('button', { name: /étape précédente/i })).toBeInTheDocument()
  })

  it('naviguer en arrière depuis le 2e joueur ramène sur le 1er avec valeur pré-remplie', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Alice saisit 7 sur Carte 1-1
    const input = screen.getByRole('spinbutton', { name: /carte 1-1/i })
    await user.clear(input)
    await user.type(input, '7')

    // Avancer vers Bob
    await user.click(screen.getByRole('button', { name: /suivant/i }))

    // Revenir vers Alice
    await user.click(screen.getByRole('button', { name: /étape précédente/i }))

    // La valeur d'Alice doit être pré-remplie
    expect(screen.getByRole('spinbutton', { name: /carte 1-1/i })).toHaveValue(7)
  })

  it('naviguer en arrière depuis le 1er joueur du 2e champ ramène sur le dernier joueur du 1er champ', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Alice saisit 3 sur Carte 1-1
    await user.type(screen.getByRole('spinbutton', { name: /carte 1-1/i }), '3')
    // Avancer → Bob (Carte 1-1)
    await user.click(screen.getByRole('button', { name: /suivant/i }))
    // Bob saisit 5 sur Carte 1-1
    await user.type(screen.getByRole('spinbutton', { name: /carte 1-1/i }), '5')
    // Valider → Alice (Carte 1-2)
    await user.click(screen.getByRole('button', { name: /valider la catégorie/i }))

    // Vérifier qu'on est bien sur Carte 1-2
    expect(screen.getByRole('spinbutton', { name: /carte 1-2/i })).toBeInTheDocument()

    // Précédent → retour au dernier joueur du champ 1 (Bob, valeur 5)
    await user.click(screen.getByRole('button', { name: /étape précédente/i }))
    expect(screen.getByRole('spinbutton', { name: /carte 1-1/i })).toHaveValue(5)
  })

  it('le bouton "Précédent" reste présent sur le dernier champ (pas le 1er joueur)', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()
    // Avancer d'un pas (Alice → Bob, même champ)
    await user.click(screen.getByRole('button', { name: /suivant/i }))
    expect(screen.getByRole('button', { name: /étape précédente/i })).toBeInTheDocument()
  })
})

describe('GameSession — recalcul après édition (end_game, Château Combo)', () => {
  let sessionId: string

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS))
    const session = createSession('chateau-combo', ['p1', 'p2'])
    sessionId = session.id
  })

  it('modifier une valeur après navigation arrière met à jour la saisie', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Alice saisit 10 sur Carte 1-1
    const input = screen.getByRole('spinbutton', { name: /carte 1-1/i })
    await user.clear(input)
    await user.type(input, '10')

    // Avancer → Bob
    await user.click(screen.getByRole('button', { name: /suivant/i }))

    // Revenir → Alice
    await user.click(screen.getByRole('button', { name: /étape précédente/i }))

    // Modifier la valeur à 5
    const inputBack = screen.getByRole('spinbutton', { name: /carte 1-1/i })
    await user.clear(inputBack)
    await user.type(inputBack, '5')

    // La nouvelle valeur est bien prise en compte
    expect(inputBack).toHaveValue(5)
  })
})

describe('GameSession — recalcul après édition (end_game, Endeavor — computed)', () => {
  let sessionId: string

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify([
      { id: 'p1', name: 'Alice', createdAt: '' },
      { id: 'p2', name: 'Bob', createdAt: '' },
      { id: 'p3', name: 'Charlie', createdAt: '' },
    ]))
    const session = createSession('endeavor', ['p1', 'p2', 'p3'])
    sessionId = session.id
  })

  it('modifier "universites" après navigation arrière change la valeur visible', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Alice saisit 2 pour Villes (1er champ)
    await user.type(screen.getByRole('spinbutton', { name: /villes/i }), '2')

    // Avancer jusqu'à Charlie (3e joueur, même champ)
    await user.click(screen.getByRole('button', { name: /suivant/i })) // → Bob
    await user.click(screen.getByRole('button', { name: /suivant/i })) // → Charlie

    // Revenir à Bob
    await user.click(screen.getByRole('button', { name: /étape précédente/i }))

    // Bob saisit une valeur différente pour Villes
    const input = screen.getByRole('spinbutton', { name: /villes/i })
    await user.clear(input)
    await user.type(input, '9')

    expect(input).toHaveValue(9)
  })
})

describe('GameSession — autofocus', () => {
  let sessionId: string

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS))
    const session = createSession('chateau-combo', ['p1', 'p2'])
    sessionId = session.id
  })

  it("l'input reçoit le focus au montage de l'écran de saisie", () => {
    renderSession(sessionId)
    const input = screen.getByRole('spinbutton', { name: /carte 1-1/i })
    expect(document.activeElement).toBe(input)
  })

  it("l'input reçoit le focus après navigation arrière", async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Avancer vers Bob
    await user.click(screen.getByRole('button', { name: /suivant/i }))
    // Revenir vers Alice
    await user.click(screen.getByRole('button', { name: /étape précédente/i }))

    const input = screen.getByRole('spinbutton', { name: /carte 1-1/i })
    expect(document.activeElement).toBe(input)
  })

  it("cliquer sur l'onglet d'un autre joueur déplace le focus sur son input", async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Cliquer sur l'onglet Bob
    await user.click(screen.getByRole('button', { name: /^bob$/i }))

    const input = screen.getByRole('spinbutton', { name: /carte 1-1/i })
    expect(document.activeElement).toBe(input)
  })
})

describe('GameSession — Détail calcul (intégration)', () => {
  let sessionId: string

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS))
    const session = createSession('chateau-combo', ['p1', 'p2'])
    sessionId = session.id
  })

  it('saisir "5+3" dans le détail met 8 dans le champ valeur', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Ouvrir le détail calcul
    await user.click(screen.getByRole('button', { name: /détail calcul/i }))

    // Saisir une expression valide
    await user.type(screen.getByRole('textbox', { name: /détail calcul/i }), '5+3')

    // La valeur doit être 8
    expect(screen.getByRole('spinbutton', { name: /carte 1-1/i })).toHaveValue(8)
  })

  it('expression invalide → champ valeur inchangé + erreur visible', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Pré-remplir une valeur
    const valueInput = screen.getByRole('spinbutton', { name: /carte 1-1/i })
    await user.clear(valueInput)
    await user.type(valueInput, '10')

    // Ouvrir le détail et saisir une expression invalide dès le 1er caractère
    // (on utilise 'abc' pour éviter qu'un état intermédiaire valide écrase la valeur)
    await user.click(screen.getByRole('button', { name: /détail calcul/i }))
    await user.type(screen.getByRole('textbox', { name: /détail calcul/i }), 'abc')

    // La valeur reste 10
    expect(screen.getByRole('spinbutton', { name: /carte 1-1/i })).toHaveValue(10)

    // L'erreur est visible
    expect(screen.getByText(/expression invalide/i)).toBeInTheDocument()
  })

  it('le détail est persisté et réaffiché en revenant sur le champ', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Ouvrir le détail et saisir une expression
    await user.click(screen.getByRole('button', { name: /détail calcul/i }))
    await user.type(screen.getByRole('textbox', { name: /détail calcul/i }), '5+3')

    // Avancer vers Bob
    await user.click(screen.getByRole('button', { name: /suivant/i }))

    // Revenir vers Alice — l'expandable reste ouvert (état préservé),
    // l'expression doit toujours être affichée
    await user.click(screen.getByRole('button', { name: /étape précédente/i }))
    expect(screen.getByRole('textbox', { name: /détail calcul/i })).toHaveValue('5+3')
  })

  it("l'édition manuelle de la valeur n'efface pas le détail", async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Saisir une expression via le détail
    await user.click(screen.getByRole('button', { name: /détail calcul/i }))
    await user.type(screen.getByRole('textbox', { name: /détail calcul/i }), '5+3')

    // Éditer la valeur manuellement
    const valueInput = screen.getByRole('spinbutton', { name: /carte 1-1/i })
    await user.clear(valueInput)
    await user.type(valueInput, '99')

    // Le détail est toujours présent
    expect(screen.getByRole('textbox', { name: /détail calcul/i })).toHaveValue('5+3')
  })

  it("l'input de valeur garde le focus à l'arrivée même si l'expandable est présent", async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Ouvrir le détail sur le 1er champ
    await user.click(screen.getByRole('button', { name: /détail calcul/i }))

    // Avancer et revenir (retrigger autofocus)
    await user.click(screen.getByRole('button', { name: /suivant/i }))
    await user.click(screen.getByRole('button', { name: /étape précédente/i }))

    // L'input de valeur (pas le détail) a le focus
    expect(document.activeElement).toBe(
      screen.getByRole('spinbutton', { name: /carte 1-1/i })
    )
  })
})

describe('GameSession — fin de saisie sans écran intermédiaire (end_game, 1 champ)', () => {
  // Jeu de test minimal : 1 champ, 2 joueurs
  // Séquence : Alice → Bob (validation finale → résultats)

  let sessionId: string

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS))
    addGame({
      id: 'test-game-1field',
      name: 'Test 1 champ',
      players: { min: 2, max: 5 },
      scoring_model: 'end_game',
      scoring: [{ id: 'points', label: 'Points', type: 'number', confident: true }],
      computed: [],
      validated: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    })
    const session = createSession('test-game-1field', ['p1', 'p2'])
    sessionId = session.id
  })

  it('après le dernier score, on arrive directement sur la page de résultats sans écran intermédiaire', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Alice (pas le dernier joueur) → Suivant
    await user.click(screen.getByRole('button', { name: /suivant/i }))

    // Bob (dernier joueur, dernier champ) → validation finale
    await user.click(screen.getByRole('button', { name: /valider la catégorie/i }))

    // Aucun écran "Saisie terminée" — on est directement sur la page de résultats
    expect(screen.queryByText(/saisie terminée/i)).not.toBeInTheDocument()
    expect(screen.getByText(/page résultats/i)).toBeInTheDocument()
  })

  it('la partie est persistée (status finished) au moment de la redirection', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Alice → Suivant, Bob → Valider (validation finale)
    await user.click(screen.getByRole('button', { name: /suivant/i }))
    await user.click(screen.getByRole('button', { name: /valider la catégorie/i }))

    const session = getSessionById(sessionId)
    expect(session?.status).toBe('finished')
  })
})

// ============================================================
// computeRoundCount — tests unitaires
// ============================================================

describe('computeRoundCount', () => {
  it('nombre fixe de manches : rounds=10 → 10', () => {
    expect(computeRoundCount({ rounds: 10 } as Parameters<typeof computeRoundCount>[0], 4)).toBe(10)
  })

  it('dynamique { perPlayer: 1 } avec 4 joueurs → 4', () => {
    expect(computeRoundCount({ rounds: { perPlayer: 1 } } as Parameters<typeof computeRoundCount>[0], 4)).toBe(4)
  })

  it('dynamique { perPlayer: 1, offset: 0 } avec 4 joueurs → 4', () => {
    expect(computeRoundCount({ rounds: { perPlayer: 1, offset: 0 } } as Parameters<typeof computeRoundCount>[0], 4)).toBe(4)
  })

  it('dynamique { perPlayer: 2, offset: 1 } avec 3 joueurs → 7', () => {
    expect(computeRoundCount({ rounds: { perPlayer: 2, offset: 1 } } as Parameters<typeof computeRoundCount>[0], 3)).toBe(7)
  })

  it('rounds absent → null', () => {
    expect(computeRoundCount({} as Parameters<typeof computeRoundCount>[0], 4)).toBeNull()
  })
})

// ============================================================
// Helper : jeu per_round minimal pour les tests
// ============================================================

function setupPerRoundGame() {
  // 2 joueurs = 2 rounds (perPlayer: 1)
  addGame({
    id: 'test-per-round',
    name: 'Test Per Round',
    players: { min: 2, max: 4 },
    scoring_model: 'per_round',
    rounds: { perPlayer: 1 },
    scoring: [{ id: 'score', label: 'Score', type: 'number', confident: true }],
    computed: [{ id: 'total', label: 'Total', formula: 'score', confident: true }],
    validated: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  })
}

// ============================================================
// GameSession — navigation per_round
// ============================================================

describe('GameSession — navigation per_round', () => {
  let sessionId: string

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS))
    setupPerRoundGame()
    const session = createSession('test-per-round', ['p1', 'p2'])
    sessionId = session.id
  })

  it('le bouton "Précédent" est absent au round 1, champ 0, joueur 0', () => {
    renderSession(sessionId)
    expect(screen.queryByRole('button', { name: /étape précédente/i })).not.toBeInTheDocument()
  })

  it('le bouton "Suivant →" est présent pour le joueur non-dernier', () => {
    renderSession(sessionId)
    expect(screen.getByRole('button', { name: /suivant/i })).toBeInTheDocument()
  })

  it('le label devient "Valider le round" quand dernier joueur, dernier champ', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()
    // Avancer vers Bob (dernier joueur, dernier champ)
    await user.click(screen.getByRole('button', { name: /suivant/i }))
    expect(screen.getByRole('button', { name: /valider le round/i })).toBeInTheDocument()
  })

  it('après "Valider le round", on voit le récapitulatif du round', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /suivant/i })) // → Bob
    await user.click(screen.getByRole('button', { name: /valider le round/i })) // → round summary
    expect(screen.getByText(/round 1 terminé/i)).toBeInTheDocument()
  })

  it('le récapitulatif affiche les totaux cumulés des joueurs', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Alice saisit 10
    const input = screen.getByRole('spinbutton', { name: /score/i })
    await user.clear(input)
    await user.type(input, '10')

    // Avancer → Bob, saisir 7
    await user.click(screen.getByRole('button', { name: /suivant/i }))
    const inputBob = screen.getByRole('spinbutton', { name: /score/i })
    await user.clear(inputBob)
    await user.type(inputBob, '7')

    // Valider le round → récapitulatif
    await user.click(screen.getByRole('button', { name: /valider le round/i }))

    expect(screen.getByText('10 pts')).toBeInTheDocument()
    expect(screen.getByText('7 pts')).toBeInTheDocument()
  })

  it('depuis round summary, "Démarrer Round 2" ouvre le round 2', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /suivant/i }))
    await user.click(screen.getByRole('button', { name: /valider le round/i }))
    await user.click(screen.getByRole('button', { name: /démarrer round 2/i }))
    // Le header affiche "Round 2" et le champ Score est visible
    expect(screen.getByRole('heading', { level: 2, name: /round 2/i })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: /score/i })).toBeInTheDocument()
  })

  it('depuis round summary du dernier round, le bouton "Voir les résultats" est affiché', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Compléter le round 1
    await user.click(screen.getByRole('button', { name: /suivant/i }))
    await user.click(screen.getByRole('button', { name: /valider le round/i }))
    await user.click(screen.getByRole('button', { name: /démarrer round 2/i }))

    // Compléter le round 2 (dernier)
    await user.click(screen.getByRole('button', { name: /suivant/i }))
    await user.click(screen.getByRole('button', { name: /valider le round/i }))

    expect(screen.getByRole('button', { name: /voir les résultats/i })).toBeInTheDocument()
  })

  it('navigation arrière depuis joueur > 0 revient au joueur précédent', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /suivant/i })) // → Bob
    await user.click(screen.getByRole('button', { name: /étape précédente/i })) // → Alice
    // L'onglet Alice est actif (bg-white) et Précédent est absent (premier step)
    expect(screen.getByRole('button', { name: /^alice$/i })).toHaveClass('bg-white')
    expect(screen.queryByRole('button', { name: /étape précédente/i })).not.toBeInTheDocument()
  })

  it('navigation arrière depuis round 2, champ 0, joueur 0 revient à la dernière étape du round 1', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Compléter round 1
    await user.click(screen.getByRole('button', { name: /suivant/i })) // → Bob round 1
    await user.click(screen.getByRole('button', { name: /valider le round/i })) // → round summary
    await user.click(screen.getByRole('button', { name: /démarrer round 2/i })) // → round 2 Alice

    // Précédent depuis round 2, Alice → devrait aller à Bob, round 1
    await user.click(screen.getByRole('button', { name: /étape précédente/i }))

    // On est sur Bob, round 1
    // L'onglet Bob doit être actif et on affiche le header Round 1
    expect(screen.getByRole('button', { name: /^bob$/i })).toHaveClass('bg-white')
  })
})

// ============================================================
// GameSession — cumulative total per_round
// ============================================================

describe('GameSession — total cumulé per_round', () => {
  let sessionId: string

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS))
    setupPerRoundGame()
    const session = createSession('test-per-round', ['p1', 'p2'])
    sessionId = session.id
    // Pré-remplir le round 1 : Alice=10, Bob=7
    updateScore(session.id, { playerId: 'p1', fieldId: 'score', value: 10, round: 1 })
    updateScore(session.id, { playerId: 'p2', fieldId: 'score', value: 7, round: 1 })
  })

  it('affiche "Total cumulé" uniquement pour les jeux per_round', () => {
    renderSession(sessionId)
    expect(screen.getByText(/total cumulé/i)).toBeInTheDocument()
  })

  it('au round 2, le total cumulé reflète le score du round 1', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Aller au round 2
    await user.click(screen.getByRole('button', { name: /suivant/i }))
    await user.click(screen.getByRole('button', { name: /valider le round/i }))
    await user.click(screen.getByRole('button', { name: /démarrer round 2/i }))

    // Alice est au round 2, total cumulé = 10 (son score du round 1)
    expect(screen.getByText('10 pts')).toBeInTheDocument()
  })
})

// ============================================================
// GameSession — fin de partie per_round + persistance
// ============================================================

describe('GameSession — fin per_round et persistance', () => {
  let sessionId: string

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS))
    setupPerRoundGame()
    const session = createSession('test-per-round', ['p1', 'p2'])
    sessionId = session.id
  })

  it('la partie est marquée "finished" après le dernier round', async () => {
    renderSession(sessionId)
    const user = userEvent.setup()

    // Round 1
    await user.click(screen.getByRole('button', { name: /suivant/i }))
    await user.click(screen.getByRole('button', { name: /valider le round/i }))
    await user.click(screen.getByRole('button', { name: /démarrer round 2/i }))
    // Round 2
    await user.click(screen.getByRole('button', { name: /suivant/i }))
    await user.click(screen.getByRole('button', { name: /valider le round/i }))
    await user.click(screen.getByRole('button', { name: /voir les résultats/i }))

    expect(getSessionById(sessionId)?.status).toBe('finished')
  })
})
