import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getFinishedSessions, resolveSessionPlayers } from '@/lib/sessions'
import { getGameById } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import { resolvePlayerTotal } from '@/lib/scoring'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatNames(names: string[]): string {
  if (names.length === 1) return names[0]
  return names.slice(0, -1).join(', ') + ' et ' + names[names.length - 1]
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const allPlayers = getPlayers()

  const sessions = getFinishedSessions().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  if (sessions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 pb-20 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
        <div className="text-5xl">📜</div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-purple-700">Historique</h1>
          <p className="text-purple-400">Aucune partie jouée pour le moment.</p>
        </div>
        <Button
          onClick={() => navigate('/new-game')}
          aria-label="Créer une nouvelle partie"
          className="h-12 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
        >
          🎲 Nouvelle partie
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 pb-24 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-purple-700">📜 Historique</h1>

        <ul className="space-y-3">
          {sessions.map((session) => {
            const game = getGameById(session.gameId)

            const sessionPlayers = resolveSessionPlayers(session, allPlayers)

            const ranked = sessionPlayers
              .map((p) => ({
                player: p,
                total: resolvePlayerTotal(session, game, p.id),
              }))
              .sort((a, b) => (game?.lowest_wins ? a.total - b.total : b.total - a.total))

            const topScore = ranked[0]?.total ?? 0
            const winners = ranked.filter((r) => r.total === topScore)
            const isTie = winners.length > 1
            const winnerNames = winners.map((w) => w.player.name)
            const winnerLabel = isTie
              ? `🏆 Égalité : ${formatNames(winnerNames)}`
              : `🏆 ${winnerNames[0]}`

            return (
              <li key={session.id}>
                <button
                  onClick={() => navigate(`/history/${session.id}`)}
                  aria-label={`Voir le détail de la partie de ${game?.name ?? 'jeu supprimé'}`}
                  className="w-full text-left bg-white rounded-2xl border border-purple-100 px-4 py-4 space-y-2 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-bold ${game ? 'text-purple-800' : 'italic text-purple-400'}`}>
                      {game?.name ?? 'Jeu supprimé'}
                    </p>
                    <p className="text-xs text-purple-300 whitespace-nowrap">
                      {formatDate(session.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm text-purple-500">
                    {sessionPlayers.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && ', '}
                        <span className={p.deleted ? 'italic text-purple-300' : undefined}>
                          {p.name}
                        </span>
                      </span>
                    ))}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-amber-600">{winnerLabel}</p>
                    <p className="text-sm font-bold text-purple-600">{topScore} pts</p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
