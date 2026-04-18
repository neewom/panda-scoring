import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { getPlayers } from '@/lib/players'
import { getGames } from '@/lib/games'
import { getFinishedSessions } from '@/lib/sessions'
import { computePlayerDetailStats } from '@/lib/player-stats'
import PageHeader from '@/components/PageHeader'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function positionLabel(position: number): string {
  if (position === 1) return '🥇'
  if (position === 2) return '🥈'
  if (position === 3) return '🥉'
  return `#${position}`
}

export default function PlayerDetailPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const navigate = useNavigate()

  const player = getPlayers().find((p) => p.id === playerId)
  if (!player) return <Navigate to="/players" replace />

  const sessions = getFinishedSessions()
  const games = new Map(getGames().map((g) => [g.id, g]))
  const stats = computePlayerDetailStats(player.id, sessions, games)

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <PageHeader title={player.name} />

        {stats.gamesPlayed === 0 ? (
          <div className="bg-white rounded-2xl border border-purple-100 px-4 py-8 text-center">
            <p className="text-purple-300 text-sm">Aucune partie jouée</p>
          </div>
        ) : (
          <>
            {/* Section Résumé */}
            <div className="bg-white rounded-2xl border border-purple-100 px-4 py-4 space-y-3">
              <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
                Résumé
              </p>
              <div className="grid grid-cols-2 gap-3">
                <StatCell label="Parties jouées" value={stats.gamesPlayed} />
                <StatCell label="Victoires" value={stats.wins} />
                <StatCell label="Taux de victoire" value={`${stats.winRate}%`} />
                <StatCell label="Podiums" value={stats.podiums} />
              </div>
            </div>

            {/* Section Par jeu */}
            {stats.byGame.length > 0 && (
              <div className="bg-white rounded-2xl border border-purple-100 px-4 py-4 space-y-3">
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
                  Par jeu
                </p>
                <div className="space-y-3">
                  {stats.byGame.map((g) => (
                    <div
                      key={g.gameId}
                      className="border-t border-purple-50 pt-3 first:border-t-0 first:pt-0"
                    >
                      <p className="font-medium text-purple-800 text-sm mb-1.5">{g.gameName}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <span className="text-purple-400">Parties</span>
                        <span className="font-medium text-purple-700 text-right">{g.gamesPlayed}</span>
                        <span className="text-purple-400">Victoires</span>
                        <span className="font-medium text-purple-700 text-right">{g.wins}</span>
                        <span className="text-purple-400">Meilleur score</span>
                        <span className="font-medium text-purple-700 text-right">{g.bestScore}</span>
                        <span className="text-purple-400">Score moyen</span>
                        <span className="font-medium text-purple-700 text-right">{g.avgScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section Dernières parties */}
            {stats.recentSessions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide px-1">
                  Dernières parties
                </p>
                <ul className="space-y-2">
                  {stats.recentSessions.map((s) => (
                    <li key={s.sessionId}>
                      <button
                        onClick={() => navigate(`/history/${s.sessionId}`)}
                        aria-label={`Voir le détail de la partie de ${s.gameName}`}
                        className="w-full text-left bg-white rounded-2xl border border-purple-100 px-4 py-3 hover:border-purple-300 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-purple-800 text-sm">{s.gameName}</p>
                          <p className="text-xs text-purple-300 whitespace-nowrap">{formatDate(s.createdAt)}</p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-lg">{positionLabel(s.position)}</span>
                          <span className="text-sm font-bold text-purple-600">{s.score} pts</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-purple-50 rounded-xl px-3 py-2 text-center">
      <p className="text-lg font-bold text-purple-700">{value}</p>
      <p className="text-xs text-purple-400">{label}</p>
    </div>
  )
}
