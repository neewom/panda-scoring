import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
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

function renderPage() {
  return render(
    <MemoryRouter>
      <NewGamePage />
    </MemoryRouter>
  )
}

describe('NewGamePage — étape 1', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('le bouton "Suivant" est désactivé sans jeu sélectionné', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /passer à l'étape suivante/i })).toBeDisabled()
  })

  it('le bouton "Suivant" est activé après sélection d\'un jeu', async () => {
    renderPage()
    const user = userEvent.setup()
    const gameButtons = screen.getAllByRole('button', { name: /endeavor/i })
    await user.click(gameButtons[0])
    expect(screen.getByRole('button', { name: /passer à l'étape suivante/i })).toBeEnabled()
  })
})

describe('NewGamePage — étape 2', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    // Seed 2 joueurs
    localStorageMock.setItem('panda-players', JSON.stringify([
      { id: 'p1', name: 'Alice', createdAt: '' },
      { id: 'p2', name: 'Bob', createdAt: '' },
      { id: 'p3', name: 'Charlie', createdAt: '' },
    ]))
  })

  async function goToStep2() {
    const user = userEvent.setup()
    renderPage()
    // Sélectionne Endeavor (min 3, max 5)
    const gameButtons = screen.getAllByRole('button', { name: /endeavor/i })
    await user.click(gameButtons[0])
    await user.click(screen.getByRole('button', { name: /passer à l'étape suivante/i }))
    return user
  }

  it('le bouton "Suivant" est désactivé si nb joueurs insuffisant', async () => {
    const user = await goToStep2()
    // Endeavor min=3, on sélectionne seulement 2
    await user.click(screen.getByRole('button', { name: /alice/i }))
    await user.click(screen.getByRole('button', { name: /bob/i }))
    const nextButtons = screen.getAllByRole('button', { name: /passer à l'étape suivante/i })
    expect(nextButtons[nextButtons.length - 1]).toBeDisabled()
  })

  it('le bouton "Suivant" est activé avec le bon nombre de joueurs', async () => {
    const user = await goToStep2()
    // Endeavor min=3, on sélectionne 3
    await user.click(screen.getByRole('button', { name: /alice/i }))
    await user.click(screen.getByRole('button', { name: /bob/i }))
    await user.click(screen.getByRole('button', { name: /charlie/i }))
    const nextButtons = screen.getAllByRole('button', { name: /passer à l'étape suivante/i })
    expect(nextButtons[nextButtons.length - 1]).toBeEnabled()
  })
})
