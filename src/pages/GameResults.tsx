import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getGameById } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import { getSessionById } from '@/lib/sessions'
import { computePlayerTotal } from '@/lib/scoring'

export default function GameResults() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const session = id ? getSessionById(id) : undefined
  const game = session ? getGameById(session.gameId) : undefined
  const allPlayers = getPlayers()
  const sessionPlayers = allPlayers.filter((p) => session?.players.includes(p.id))

  if (!session || !game || sessionPlayers.length === 0) {
    return <Navigate to="/" replace />
  }

  const ranked = sessionPlayers
    .map((p) => ({ player: p, total: computePlayerTotal(game, session.scores, p.id) }))
    .sort((a, b) => b.total - a.total)

  const winner = ranked[0]
  const others = ranked.slice(1)

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 pb-24 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-8">

        {/* Gagnant */}
        <div className="text-center space-y-2">
          <div className="text-7xl">🏆</div>
          <p className="text-sm font-medium text-purple-400 uppercase tracking-wide">Gagnant</p>
          <p className="text-4xl font-extrabold text-purple-700">{winner.player.name}</p>
          <p className="text-2xl font-bold text-purple-500">{winner.total} pts</p>
        </div>

        {/* Autres joueurs */}
        {others.length > 0 && (
          <div className="bg-white rounded-2xl border border-purple-100 divide-y divide-purple-50">
            {others.map(({ player, total }, i) => (
              <div key={player.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-purple-300">#{i + 2}</span>
                  <span className="font-medium text-purple-800">{player.name}</span>
                </div>
                <span className="font-bold text-purple-600">{total} pts</span>
              </div>
            ))}
          </div>
        )}

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
