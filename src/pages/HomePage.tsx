import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const navigate = useNavigate()
  const [currentGame] = useState(() => {
    try {
      return localStorage.getItem('panda-current-game')
    } catch {
      return null
    }
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-bold tracking-tight text-purple-700">
          🐼 Scoring
        </h1>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        {/* Nouvelle partie — CTA principal */}
        <Button
          onClick={() => navigate('/new-game')}
          className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 rounded-2xl"
          aria-label="Créer une nouvelle partie"
        >
          🎲 Nouvelle partie
        </Button>

        {/* Reprendre — uniquement si partie en cours */}
        {currentGame && (
          <Button
            variant="outline"
            className="w-full h-12 text-base font-semibold border-2 border-green-400 text-green-700 hover:bg-green-50 rounded-2xl"
            aria-label="Reprendre la partie en cours"
          >
            ▶️ Reprendre la partie
          </Button>
        )}

        {/* Historique */}
        <Button
          variant="ghost"
          onClick={() => navigate('/history')}
          className="w-full h-12 text-base font-semibold text-pink-600 hover:bg-pink-50 rounded-2xl"
          aria-label="Voir l'historique des parties"
        >
          📜 Historique des parties
        </Button>

        {/* Joueurs */}
        <Button
          variant="ghost"
          onClick={() => navigate('/players')}
          className="w-full h-12 text-base font-semibold text-purple-500 hover:bg-purple-50 rounded-2xl"
          aria-label="Gérer les joueurs"
        >
          👥 Joueurs
        </Button>

        {/* Jeux */}
        <Button
          variant="ghost"
          onClick={() => navigate('/games')}
          className="w-full h-12 text-base font-semibold text-purple-500 hover:bg-purple-50 rounded-2xl"
          aria-label="Voir la bibliothèque de jeux"
        >
          🎲 Bibliothèque de jeux
        </Button>
      </div>


    </div>
  )
}
