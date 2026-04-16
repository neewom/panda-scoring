import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import GameResults from './GameResults'
import { createSession, updateScore } from '@/lib/sessions'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

const PLAYERS_2 = [
  { id: 'p1', name: 'Alice', createdAt: '' },
  { id: 'p2', name: 'Bob', createdAt: '' },
]

const PLAYERS_3 = [
  { id: 'p1', name: 'Alice', createdAt: '' },
  { id: 'p2', name: 'Bob', createdAt: '' },
  { id: 'p3', name: 'Charlie', createdAt: '' },
]

function renderResults(sessionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/game/${sessionId}/results`]}>
      <Routes>
        <Route path="/game/:id/results" element={<GameResults />} />
      </Routes>
    </MemoryRouter>
  )
}

// Forêt Mixte Dartmoor — 6 champs : arbres, landes, horizontal, haut, bas, grotte
const FORET_FIELDS = ['arbres', 'landes', 'horizontal', 'haut', 'bas', 'grotte']

function setupForetMixte(p1Scores: number[], p2Scores: number[]): string {
  const session = createSession('foret-mixte-dartmoor', ['p1', 'p2'])
  FORET_FIELDS.forEach((fieldId, i) => {
    updateScore(session.id, { playerId: 'p1', fieldId, value: p1Scores[i] })
    updateScore(session.id, { playerId: 'p2', fieldId, value: p2Scores[i] })
  })
  return session.id
}

// --- nom du jeu ---

describe('GameResults — nom du jeu', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS_2))
  })

  it('affiche le nom du jeu joué', () => {
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderResults(sessionId)
    expect(screen.getByText('Forêt Mixte Dartmoor')).toBeInTheDocument()
  })
})

// --- vainqueur unique ---

describe('GameResults — vainqueur unique', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS_2))
  })

  it('affiche le libellé "Vainqueur" quand un seul joueur est en tête', () => {
    // Alice : 21 pts, Bob : 17 pts
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderResults(sessionId)
    expect(screen.getByText('Vainqueur')).toBeInTheDocument()
    expect(screen.queryByText('Égalité')).not.toBeInTheDocument()
  })

  it('affiche le nom du vainqueur dans le bloc mis en avant', () => {
    // Alice : 21 pts, Bob : 17 pts
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderResults(sessionId)
    const winnerBlock = screen.getByText('Vainqueur').closest('div')!
    expect(within(winnerBlock).getByText('Alice')).toBeInTheDocument()
  })
})

// --- égalité au 1er rang ---

describe('GameResults — égalité', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS_2))
  })

  it('affiche "Égalité" et "Victoire partagée" quand deux joueurs ont le même total', () => {
    // Alice : 10 pts, Bob : 10 pts
    const sessionId = setupForetMixte([5, 5, 0, 0, 0, 0], [0, 0, 5, 5, 0, 0])
    renderResults(sessionId)
    expect(screen.getByText('Égalité')).toBeInTheDocument()
    expect(screen.getByText('Victoire partagée')).toBeInTheDocument()
  })

  it('liste tous les joueurs ex aequo dans le bloc vainqueur', () => {
    // Alice : 10 pts, Bob : 10 pts
    const sessionId = setupForetMixte([5, 5, 0, 0, 0, 0], [0, 0, 5, 5, 0, 0])
    renderResults(sessionId)
    // formatNames(['Alice', 'Bob']) → "Alice et Bob"
    expect(screen.getByText('Alice et Bob')).toBeInTheDocument()
  })

  it('ne mentionne pas "Victoire partagée" quand il y a un vainqueur unique', () => {
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderResults(sessionId)
    expect(screen.queryByText('Victoire partagée')).not.toBeInTheDocument()
  })
})

// --- tableau récapitulatif (Forêt Mixte) ---

describe('GameResults — tableau (Forêt Mixte Dartmoor)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS_2))
  })

  it('affiche 7 colonnes de données (6 scoring + Total)', () => {
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderResults(sessionId)
    const allHeaders = screen.getAllByRole('columnheader')
    // Exclut la colonne "Joueur" (en-tête de ligne)
    const dataHeaders = allHeaders.filter((h) => h.textContent !== 'Joueur')
    expect(dataHeaders).toHaveLength(7)
  })

  it('affiche les labels des champs scoring et le Total en en-tête', () => {
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderResults(sessionId)
    for (const label of ['Arbres', 'Landes', 'Horizontal', 'Haut', 'Bas', 'Grotte', 'Total']) {
      expect(screen.getByRole('columnheader', { name: label })).toBeInTheDocument()
    }
  })
})

// --- tableau récapitulatif (Endeavor) ---

describe('GameResults — tableau (Endeavor)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS_3))
  })

  it('affiche les colonnes computed intermédiaires (bonus_*) entre scoring et Total', () => {
    const session = createSession('endeavor', ['p1', 'p2', 'p3'])
    renderResults(session.id)
    expect(screen.getByRole('columnheader', { name: 'Bonus gouverneur' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Bonus universités' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Bonus population' })).toBeInTheDocument()
  })

  it('la colonne "Total" vient en dernier', () => {
    const session = createSession('endeavor', ['p1', 'p2', 'p3'])
    renderResults(session.id)
    const headers = screen.getAllByRole('columnheader')
    expect(headers[headers.length - 1]).toHaveTextContent('Total')
  })
})

// --- tri décroissant ---

describe('GameResults — tri décroissant', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS_2))
  })

  it('affiche les joueurs dans l\'ordre décroissant de score', () => {
    // Alice : 21 pts, Bob : 17 pts
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderResults(sessionId)
    const rows = screen.getAllByRole('row')
    // rows[0] = thead, rows[1] = Alice (21 pts), rows[2] = Bob (17 pts)
    expect(rows[1]).toHaveTextContent('Alice')
    expect(rows[2]).toHaveTextContent('Bob')
  })
})

// --- mise en évidence de la ligne vainqueur ---

describe('GameResults — mise en évidence de la ligne vainqueur', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS_2))
  })

  it('la ligne du vainqueur dans le tableau a data-winner="true"', () => {
    // Alice : 21 pts, Bob : 17 pts
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderResults(sessionId)
    const winnerRows = document.querySelectorAll('tr[data-winner="true"]')
    expect(winnerRows).toHaveLength(1)
    expect(winnerRows[0]).toHaveTextContent('Alice')
  })

  it('en cas d\'égalité, toutes les lignes ex aequo ont data-winner="true"', () => {
    // Alice : 10 pts, Bob : 10 pts
    const sessionId = setupForetMixte([5, 5, 0, 0, 0, 0], [0, 0, 5, 5, 0, 0])
    renderResults(sessionId)
    const winnerRows = document.querySelectorAll('tr[data-winner="true"]')
    expect(winnerRows).toHaveLength(2)
  })
})

// --- tiebreak_description ---

describe('GameResults — tiebreak_description', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS_2))
  })

  // Égalité sur Forêt Mixte (pas de tiebreak_description)
  it('affiche "Victoire partagée" en cas d\'égalité sans tiebreak_description', () => {
    // Alice : 10 pts, Bob : 10 pts
    const sessionId = setupForetMixte([5, 5, 0, 0, 0, 0], [0, 0, 5, 5, 0, 0])
    renderResults(sessionId)
    expect(screen.getByText('Victoire partagée')).toBeInTheDocument()
  })

  it('n\'affiche pas "Victoire partagée" quand un vainqueur unique est désigné', () => {
    // Alice : 21 pts, Bob : 17 pts
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderResults(sessionId)
    expect(screen.queryByText('Victoire partagée')).not.toBeInTheDocument()
  })

  // Égalité sur Nokosu Dice (a un tiebreak_description)
  it('affiche le tiebreak_description en cas d\'égalité pour Nokosu Dice', () => {
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS_2))
    const session = createSession('nokosu-dice', ['p1', 'p2'])
    // Alice et Bob : même score sur les 2 rounds
    updateScore(session.id, { playerId: 'p1', fieldId: 'score', value: 5, round: 1 })
    updateScore(session.id, { playerId: 'p2', fieldId: 'score', value: 5, round: 1 })
    updateScore(session.id, { playerId: 'p1', fieldId: 'score', value: 3, round: 2 })
    updateScore(session.id, { playerId: 'p2', fieldId: 'score', value: 3, round: 2 })
    renderResults(session.id)

    expect(screen.getByText(/plus grand chiffre sur son dernier dé/i)).toBeInTheDocument()
  })

  it('n\'affiche pas "Victoire partagée" pour Nokosu Dice en cas d\'égalité', () => {
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS_2))
    const session = createSession('nokosu-dice', ['p1', 'p2'])
    updateScore(session.id, { playerId: 'p1', fieldId: 'score', value: 5, round: 1 })
    updateScore(session.id, { playerId: 'p2', fieldId: 'score', value: 5, round: 1 })
    renderResults(session.id)

    expect(screen.queryByText('Victoire partagée')).not.toBeInTheDocument()
  })
})
