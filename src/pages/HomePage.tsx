import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-bold tracking-tight text-purple-700">
          🐼 Scoring
        </h1>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4 w-full">
        {/* 1. Nouvelle partie — CTA principal */}
        <Button
          onClick={() => navigate('/new-game')}
          className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 rounded-2xl"
          aria-label="Créer une nouvelle partie"
        >
          🎲 Nouvelle partie
        </Button>

        {/* 2. Historique */}
        <Button
          variant="ghost"
          onClick={() => navigate('/history')}
          className="w-full h-12 text-base font-semibold text-pink-600 hover:bg-pink-50 rounded-2xl"
          aria-label="Voir l'historique des parties"
        >
          📜 Historique des parties
        </Button>

        {/* 3. Joueurs */}
        <Button
          variant="ghost"
          onClick={() => navigate('/players')}
          className="w-full h-12 text-base font-semibold text-purple-500 hover:bg-purple-50 rounded-2xl"
          aria-label="Gérer les joueurs"
        >
          👥 Joueurs
        </Button>

        {/* 4. Bibliothèque de jeux */}
        <Button
          variant="ghost"
          onClick={() => navigate('/games')}
          className="w-full h-12 text-base font-semibold text-purple-500 hover:bg-purple-50 rounded-2xl"
          aria-label="Voir la bibliothèque de jeux"
        >
          🎮 Bibliothèque de jeux
        </Button>

        {/* 5. Paramètres — style tertiaire */}
        <Button
          variant="ghost"
          onClick={() => navigate('/settings')}
          className="w-full h-10 text-sm font-medium text-purple-300 hover:text-purple-500 hover:bg-purple-50 rounded-2xl"
          aria-label="Paramètres"
        >
          ⚙️ Paramètres
        </Button>
      </div>
    </div>
  )
}
