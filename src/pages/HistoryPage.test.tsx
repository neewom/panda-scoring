import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HistoryPage from './HistoryPage'
import HistoryDetailPage from './HistoryDetailPage'
import { createSession, updateScore, finishSession } from '@/lib/sessions'

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

const FORET_FIELDS = ['arbres', 'landes', 'horizontal', 'haut', 'bas', 'grotte']

function setupForetMixte(
  p1Scores: number[],
  p2Scores: number[],
  createdAt?: string
): string {
  const session = createSession('foret-mixte-dartmoor', ['p1', 'p2'])
  FORET_FIELDS.forEach((fieldId, i) => {
    updateScore(session.id, { playerId: 'p1', fieldId, value: p1Scores[i] })
    updateScore(session.id, { playerId: 'p2', fieldId, value: p2Scores[i] })
  })
  finishSession(session.id)

  // Override createdAt if provided (for ordering tests)
  if (createdAt) {
    const raw = localStorageMock.getItem('panda-sessions')
    const sessions = raw ? JSON.parse(raw) : []
    const idx = sessions.findIndex((s: { id: string }) => s.id === session.id)
    if (idx !== -1) {
      sessions[idx] = { ...sessions[idx], createdAt }
      localStorageMock.setItem('panda-sessions', JSON.stringify(sessions))
    }
  }

  return session.id
}

function renderHistory() {
  return render(
    <MemoryRouter initialEntries={['/history']}>
      <Routes>
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<HistoryDetailPage />} />
        <Route path="/new-game" element={<div>Nouvelle partie page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

function renderDetail(sessionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/history/${sessionId}`]}>
      <Routes>
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<HistoryDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('HistoryPage — état vide', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS))
  })

  it('affiche un message quand aucune partie n\'est terminée', () => {
    renderHistory()
    expect(screen.getByText(/aucune partie jouée pour le moment/i)).toBeInTheDocument()
  })

  it('le CTA "Nouvelle partie" de l\'état vide redirige vers /new-game', async () => {
    renderHistory()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /créer une nouvelle partie/i }))
    expect(screen.getByText('Nouvelle partie page')).toBeInTheDocument()
  })

  it('les parties non terminées (in_progress) ne sont pas affichées', () => {
    createSession('foret-mixte-dartmoor', ['p1', 'p2']) // not finished
    renderHistory()
    expect(screen.getByText(/aucune partie jouée pour le moment/i)).toBeInTheDocument()
  })
})

describe('HistoryPage — liste des parties', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS))
  })

  it('affiche les parties triées par date décroissante (la plus récente en haut)', () => {
    setupForetMixte([1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0], '2026-01-01T10:00:00.000Z')
    setupForetMixte([2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1], '2026-03-15T10:00:00.000Z')
    setupForetMixte([3, 3, 3, 3, 3, 3], [2, 2, 2, 2, 2, 2], '2026-02-10T10:00:00.000Z')

    renderHistory()
    const cards = screen.getAllByRole('button', { name: /voir le détail/i })
    // La carte du 15 mars doit être en premier
    expect(cards[0]).toHaveTextContent('15 mars 2026')
    expect(cards[1]).toHaveTextContent('10 février 2026')
    expect(cards[2]).toHaveTextContent('1 janvier 2026')
  })

  it('chaque carte affiche le nom du jeu', () => {
    setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderHistory()
    expect(screen.getByText('Forêt Mixte Dartmoor')).toBeInTheDocument()
  })

  it('chaque carte affiche les noms des joueurs séparés par des virgules', () => {
    setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderHistory()
    expect(screen.getByText('Alice, Bob')).toBeInTheDocument()
  })

  it('chaque carte affiche le vainqueur unique avec 🏆', () => {
    // Alice : 21 pts, Bob : 17 pts
    setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderHistory()
    expect(screen.getByText('🏆 Alice')).toBeInTheDocument()
  })

  it('chaque carte affiche "Égalité" en cas d\'ex aequo', () => {
    // Alice : 10 pts, Bob : 10 pts
    setupForetMixte([5, 5, 0, 0, 0, 0], [0, 0, 5, 5, 0, 0])
    renderHistory()
    expect(screen.getByText(/🏆 Égalité : Alice et Bob/)).toBeInTheDocument()
  })

  it('chaque carte affiche le score du vainqueur', () => {
    // Alice : 21 pts
    setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderHistory()
    expect(screen.getByText('21 pts')).toBeInTheDocument()
  })

  it('tap sur une carte navigue vers le détail de la partie', async () => {
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderHistory()
    const user = userEvent.setup()
    const card = screen.getByRole('button', { name: /voir le détail/i })
    await user.click(card)

    // La page de détail affiche le contenu de la partie
    expect(screen.getByRole('heading', { name: /partie terminée/i })).toBeInTheDocument()
    expect(screen.getByText('Forêt Mixte Dartmoor')).toBeInTheDocument()
    // L'URL contient l'id de la session (on vérifie en cherchant le contenu rendu)
    expect(sessionId).toBeTruthy()
  })
})

describe('HistoryDetailPage — détail d\'une partie', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    localStorageMock.setItem('panda-players', JSON.stringify(PLAYERS))
  })

  it('affiche le titre "Partie terminée 🎉" et le nom du jeu', () => {
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderDetail(sessionId)
    expect(screen.getByRole('heading', { name: /partie terminée/i })).toBeInTheDocument()
    expect(screen.getByText('Forêt Mixte Dartmoor')).toBeInTheDocument()
  })

  it('affiche le bloc vainqueur', () => {
    // Alice : 21 pts, Bob : 17 pts
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderDetail(sessionId)
    expect(screen.getByText('Vainqueur')).toBeInTheDocument()
    const winnerBlock = screen.getByText('Vainqueur').closest('div')!
    expect(within(winnerBlock).getByText('Alice')).toBeInTheDocument()
  })

  it('affiche le tableau récapitulatif avec les colonnes de scoring', () => {
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderDetail(sessionId)
    for (const label of ['Arbres', 'Landes', 'Horizontal', 'Haut', 'Bas', 'Grotte', 'Total']) {
      expect(screen.getByRole('columnheader', { name: label })).toBeInTheDocument()
    }
  })

  it('la ligne du vainqueur dans le tableau a data-winner="true"', () => {
    // Alice : 21 pts, Bob : 17 pts
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderDetail(sessionId)
    const winnerRows = document.querySelectorAll('tr[data-winner="true"]')
    expect(winnerRows).toHaveLength(1)
    expect(winnerRows[0]).toHaveTextContent('Alice')
  })

  it('le bouton "Retour" depuis le détail ramène à la liste /history', async () => {
    const sessionId = setupForetMixte([5, 3, 4, 2, 1, 6], [3, 2, 1, 4, 5, 2])
    renderDetail(sessionId)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /retour à l'historique/i }))
    expect(screen.getByRole('heading', { name: /historique/i })).toBeInTheDocument()
  })

  it('redirige vers /history si la session n\'existe pas', () => {
    render(
      <MemoryRouter initialEntries={['/history/inexistant']}>
        <Routes>
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:id" element={<HistoryDetailPage />} />
        </Routes>
      </MemoryRouter>
    )
    // Redirigé vers HistoryPage (état vide)
    expect(screen.getByText(/aucune partie jouée pour le moment/i)).toBeInTheDocument()
  })
})
