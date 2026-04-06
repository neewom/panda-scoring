import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const [currentGame] = useState(() => {
    try {
      return localStorage.getItem('panda-current-game')
    } catch {
      return null
    }
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12 bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-6xl">🐼🎲</div>
        <h1 className="text-5xl font-bold tracking-tight text-purple-700">
          Panda Scoring
        </h1>
        <p className="text-lg text-purple-400 font-medium">
          Le compagnon de vos soirées jeux !
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        {/* Nouvelle partie — CTA principal */}
        <Button
          className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 rounded-2xl"
          aria-label="Créer une nouvelle partie"
        >
          🎮 Nouvelle partie
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
          className="w-full h-12 text-base font-semibold text-pink-600 hover:bg-pink-50 rounded-2xl"
          aria-label="Voir l'historique des parties"
        >
          📜 Historique des parties
        </Button>
      </div>

      {/* Footer fun */}
      <p className="text-sm text-gray-400 mt-4">✨ Bonne partie à tous ! ✨</p>
    </div>
  )
}
