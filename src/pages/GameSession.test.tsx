import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import GameSession from './GameSession'
import { createSession } from '@/lib/sessions'

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
