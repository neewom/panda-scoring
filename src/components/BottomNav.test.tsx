import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import BottomNav from './BottomNav'

function renderWithRoute(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
    </MemoryRouter>
  )
}

describe('BottomNav', () => {
  it('s\'affiche sur la page Home /', () => {
    renderWithRoute('/')
    expect(screen.getByRole('navigation', { name: /navigation principale/i })).toBeInTheDocument()
  })

  it('met en évidence l\'entrée Home sur /', () => {
    renderWithRoute('/')
    const homeLink = screen.getByRole('link', { name: /^home$/i })
    expect(homeLink).toHaveClass('text-purple-700')
  })

  it('s\'affiche sur /players', () => {
    renderWithRoute('/players')
    expect(screen.getByRole('navigation', { name: /navigation principale/i })).toBeInTheDocument()
  })

  it('s\'affiche sur /new-game', () => {
    renderWithRoute('/new-game')
    expect(screen.getByRole('navigation', { name: /navigation principale/i })).toBeInTheDocument()
  })

  it('s\'affiche sur /history', () => {
    renderWithRoute('/history')
    expect(screen.getByRole('navigation', { name: /navigation principale/i })).toBeInTheDocument()
  })

  it('s\'affiche sur /settings', () => {
    renderWithRoute('/settings')
    expect(screen.getByRole('navigation', { name: /navigation principale/i })).toBeInTheDocument()
  })

  it('met en évidence l\'entrée active sur /players', () => {
    renderWithRoute('/players')
    const activeLink = screen.getByRole('link', { name: /joueurs/i })
    expect(activeLink).toHaveClass('text-purple-700')
  })

  it('met en évidence l\'entrée active sur /new-game', () => {
    renderWithRoute('/new-game')
    const activeLink = screen.getByRole('link', { name: /nouvelle partie/i })
    expect(activeLink).toHaveClass('text-purple-700')
  })

  it('les entrées inactives ont la classe text-purple-300', () => {
    renderWithRoute('/players')
    const historyLink = screen.getByRole('link', { name: /historique/i })
    expect(historyLink).toHaveClass('text-purple-300')
  })
})
