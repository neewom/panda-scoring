import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getGameById } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import { getSessionById } from '@/lib/sessions'
import GameResultSummary from '@/components/GameResultSummary'

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const session = id ? getSessionById(id) : undefined
  const game = session ? getGameById(session.gameId) : undefined
  const allPlayers = getPlayers()
  const sessionPlayers = (session?.players ?? [])
    .map((pid) => allPlayers.find((p) => p.id === pid))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)

  if (!session || !game || sessionPlayers.length === 0) {
    return <Navigate to="/history" replace />
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
        <Button
          variant="outline"
          onClick={() => navigate('/history')}
          aria-label="Retour à l'historique"
          className="w-full h-12 font-semibold rounded-2xl border-2 border-purple-200 text-purple-600"
        >
          ← Retour à l'historique
        </Button>

      </div>
    </div>
  )
}
