import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getGameById } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import { getSessionById, resolveSessionPlayers } from '@/lib/sessions'
import { resolvePlayerTotal } from '@/lib/scoring'
import GameResultSummary from '@/components/GameResultSummary'
import PageHeader from '@/components/PageHeader'

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const session = id ? getSessionById(id) : undefined
  const game = session ? getGameById(session.gameId) : undefined
  const allPlayers = getPlayers()
  const sessionPlayers = session ? resolveSessionPlayers(session, allPlayers) : []

  if (!session || sessionPlayers.length === 0) {
    return <Navigate to="/history" replace />
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-2xl space-y-8">

        {/* Header */}
        <PageHeader title="Partie terminée 🎉" onBack={() => navigate('/history')} backLabel="Historique" />
        <p className={`-mt-4 text-sm font-medium text-center ${game ? 'text-purple-400' : 'italic text-purple-300'}`}>
          {game?.name ?? 'Jeu supprimé'}
        </p>

        {game ? (
          <GameResultSummary game={game} session={session} sessionPlayers={sessionPlayers} />
        ) : (
          /* Fallback: game config deleted — show ranking from stored totals */
          <div className="bg-white rounded-2xl border border-purple-100 divide-y divide-purple-50">
            {sessionPlayers
              .map((p) => ({ player: p, total: resolvePlayerTotal(session, undefined, p.id) }))
              .sort((a, b) => b.total - a.total)
              .map(({ player, total }, i) => (
                <div key={player.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-purple-300">#{i + 1}</span>
                    <span className={`font-medium ${player.deleted ? 'italic text-purple-400' : 'text-purple-800'}`}>
                      {player.name}
                    </span>
                  </div>
                  <span className="font-bold text-purple-600">{total} pts</span>
                </div>
              ))}
          </div>
        )}

        {/* Actions */}
        <Button
          variant="outline"
          onClick={() => navigate('/history')}
          aria-label="Retour à l'historique"
          className="w-full h-12 font-semibold rounded-2xl border-2 border-purple-200 text-purple-600"
        >
          📜 Retour à l'historique
        </Button>

      </div>
    </div>
  )
}
