import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getGames, searchGames } from '@/lib/games'

export default function GamesPage() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const games = query ? searchGames(query) : getGames()

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 pb-24 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="text-5xl">🎲</div>
          <h1 className="text-3xl font-bold text-purple-700">Jeux</h1>
        </div>

        <Button
          onClick={() => navigate('/games/new')}
          aria-label="Ajouter un jeu"
          className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl"
        >
          + Ajouter un jeu
        </Button>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un jeu…"
          aria-label="Rechercher un jeu"
          className="w-full h-10 rounded-xl border-2 border-purple-200 px-3 text-sm focus:outline-none focus:border-purple-400 bg-white"
        />

        {games.length === 0 ? (
          <p className="text-center text-purple-300 text-sm">Aucun jeu trouvé.</p>
        ) : (
          <ul className="space-y-2" aria-label="Liste des jeux">
            {games.map((game) => (
              <li key={game.id}>
                <button
                  onClick={() => navigate(`/games/${game.id}`)}
                  aria-label={`Voir la fiche de ${game.name}`}
                  className="w-full text-left flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-purple-100 hover:border-purple-300 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-purple-800">{game.name}</p>
                    <p className="text-xs text-purple-400">
                      {game.players.min}–{game.players.max} joueurs
                    </p>
                  </div>
                  {game.validated && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      validé
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
