import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import GamesPage from './GamesPage'
import GameDetailPage from './GameDetailPage'
import NewGamePage from './NewGamePage'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

function renderGames() {
  return render(
    <MemoryRouter initialEntries={['/games']}>
      <Routes>
        <Route path="/games" element={<GamesPage />} />
        <Route path="/games/:id" element={<GameDetailPage />} />
        <Route path="/new-game" element={<NewGamePage />} />
      </Routes>
    </MemoryRouter>
  )
}

function renderDetail(gameId: string) {
  return render(
    <MemoryRouter initialEntries={[`/games/${gameId}`]}>
      <Routes>
        <Route path="/games" element={<GamesPage />} />
        <Route path="/games/:id" element={<GameDetailPage />} />
        <Route path="/new-game" element={<NewGamePage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('GamesPage — navigation vers le détail', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('tap sur un jeu navigue vers la page détail du jeu', async () => {
    renderGames()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /voir la fiche de forêt mixte dartmoor/i }))
    expect(screen.getByRole('heading', { name: /forêt mixte dartmoor/i })).toBeInTheDocument()
  })
})

describe('GameDetailPage — Forêt Mixte Dartmoor', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('affiche le nom du jeu en titre', () => {
    renderDetail('foret-mixte-dartmoor')
    expect(screen.getByRole('heading', { name: /forêt mixte dartmoor/i })).toBeInTheDocument()
  })

  it('affiche le nombre de joueurs', () => {
    renderDetail('foret-mixte-dartmoor')
    expect(screen.getByText('2 à 5 joueurs')).toBeInTheDocument()
  })

  it('affiche le modèle de scoring en français (Fin de partie)', () => {
    renderDetail('foret-mixte-dartmoor')
    expect(screen.getByText('Fin de partie')).toBeInTheDocument()
  })

  it('affiche toutes les catégories de scoring', () => {
    renderDetail('foret-mixte-dartmoor')
    for (const label of ['Arbres', 'Landes', 'Horizontal', 'Haut', 'Bas', 'Grotte']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('n\'affiche pas la section "Calculs automatiques" (que total, pas de computed métier)', () => {
    renderDetail('foret-mixte-dartmoor')
    expect(screen.queryByText(/calculs automatiques/i)).not.toBeInTheDocument()
  })

  it('affiche "Victoire partagée en cas d\'égalité" (pas de tieBreak)', () => {
    renderDetail('foret-mixte-dartmoor')
    expect(screen.getByText(/victoire partagée en cas d'égalité/i)).toBeInTheDocument()
  })

  it('le bouton "Retour" ramène à la bibliothèque /games', async () => {
    renderDetail('foret-mixte-dartmoor')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /retour à la bibliothèque/i }))
    expect(screen.getByRole('heading', { name: /jeux/i })).toBeInTheDocument()
  })
})

describe('GameDetailPage — Endeavor', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('affiche le nom du jeu et l\'éditeur', () => {
    renderDetail('endeavor')
    expect(screen.getByRole('heading', { name: /endeavor/i })).toBeInTheDocument()
    expect(screen.getByText('Endeavor Games')).toBeInTheDocument()
  })

  it('affiche les champs boolean avec "oui / non"', () => {
    renderDetail('endeavor')
    // "Gouverneur vide" est un champ boolean
    const items = screen.getAllByText('oui / non')
    expect(items.length).toBeGreaterThan(0)
  })

  it('affiche la section "Calculs automatiques" avec les computed métier', () => {
    renderDetail('endeavor')
    expect(screen.getByText(/calculs automatiques/i)).toBeInTheDocument()
    expect(screen.getByText('Bonus gouverneur')).toBeInTheDocument()
    expect(screen.getByText('Bonus universités')).toBeInTheDocument()
    expect(screen.getByText('Bonus population')).toBeInTheDocument()
  })

  it('affiche les formules avec × à la place de *', () => {
    renderDetail('endeavor')
    // "universites * 3" doit devenir "universites × 3"
    expect(screen.getByText(/universites × 3/i)).toBeInTheDocument()
    expect(screen.queryByText(/universites \* 3/i)).not.toBeInTheDocument()
  })

  it('affiche les formules avec ÷ à la place de /', () => {
    renderDetail('endeavor')
    // "floor(population_port / 3)" → "floor(population_port ÷ 3)"
    expect(screen.getByText(/population_port ÷ 3/i)).toBeInTheDocument()
  })
})

describe('GameDetailPage — bouton Jouer', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('le bouton "Jouer" redirige vers le stepper avec le jeu pré-sélectionné', async () => {
    renderDetail('foret-mixte-dartmoor')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /jouer à forêt mixte dartmoor/i }))

    // On est maintenant sur le stepper NewGamePage
    // Le jeu est pré-sélectionné : le bouton "Suivant" doit être activé
    expect(screen.getByRole('button', { name: /passer à l'étape suivante/i })).toBeEnabled()
  })

  it('le stepper affiche le jeu pré-sélectionné avec aria-pressed=true', async () => {
    renderDetail('foret-mixte-dartmoor')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /jouer à forêt mixte dartmoor/i }))

    // Le bouton du jeu dans le stepper doit être marqué comme sélectionné
    const gameBtn = screen.getByRole('button', { name: /forêt mixte dartmoor/i })
    expect(gameBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('redirige vers /games si le gameId est inconnu', () => {
    render(
      <MemoryRouter initialEntries={['/games/jeu-inconnu']}>
        <Routes>
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/:id" element={<GameDetailPage />} />
        </Routes>
      </MemoryRouter>
    )
    // Redirigé vers GamesPage
    expect(screen.getByRole('heading', { name: /jeux/i })).toBeInTheDocument()
  })
})
