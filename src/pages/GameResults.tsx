import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getGameById } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import { getSessionById, resolveSessionPlayers } from '@/lib/sessions'
import GameResultSummary from '@/components/GameResultSummary'

export default function GameResults() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const session = id ? getSessionById(id) : undefined
  const game = session ? getGameById(session.gameId) : undefined
  const allPlayers = getPlayers()
  const sessionPlayers = session ? resolveSessionPlayers(session, allPlayers) : []

  if (!session || !game || sessionPlayers.length === 0) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 pb-24 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-2xl space-y-8">

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-purple-700">Partie terminée 🎉</h1>
          <p className="text-sm font-medium text-purple-400">{game.name}</p>
        </div>

        <GameResultSummary game={game} session={session} sessionPlayers={sessionPlayers} />

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => navigate('/new-game')}
            aria-label="Nouvelle partie"
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
          >
            🎮 Nouvelle partie
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            aria-label="Retour accueil"
            className="w-full h-12 font-semibold text-purple-500 hover:bg-purple-50 rounded-2xl"
          >
            🏠 Retour accueil
          </Button>
        </div>

      </div>
    </div>
  )
}
