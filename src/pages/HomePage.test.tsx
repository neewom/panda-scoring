import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import HomePage from './HomePage'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

describe('HomePage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('affiche le bouton "Nouvelle partie"', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /créer une nouvelle partie/i })).toBeInTheDocument()
  })

  it('affiche le bouton "Historique des parties"', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /voir l'historique/i })).toBeInTheDocument()
  })

  it('n\'affiche pas le bouton "Reprendre" quand aucune partie n\'est en cours', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: /reprendre/i })).not.toBeInTheDocument()
  })

  it('affiche le bouton "Reprendre" quand une partie est sauvegardée en localStorage', () => {
    localStorageMock.setItem('panda-current-game', JSON.stringify({ id: '1', players: [] }))
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /reprendre/i })).toBeInTheDocument()
  })
})
