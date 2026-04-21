import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getFinishedSessions, deleteSession, resolveSessionPlayers } from '@/lib/sessions'
import { getGameById } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import { resolvePlayerTotal } from '@/lib/scoring'
import PageHeader from '@/components/PageHeader'

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

  const [sessions, setSessions] = useState(() =>
    getFinishedSessions().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  )
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteSession(deleteTarget)
    setSessions((prev) => prev.filter((s) => s.id !== deleteTarget))
    setDeleteTarget(null)
  }

  if (sessions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
        <div className="w-full max-w-sm">
          <PageHeader title="Historique" />
          <div className="flex flex-col items-center gap-6 mt-8">
            <div className="text-5xl">📜</div>
            <p className="text-purple-400">Aucune partie jouée pour le moment.</p>
            <Button
              onClick={() => navigate('/new-game')}
              aria-label="Créer une nouvelle partie"
              className="h-12 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
            >
              🎲 Nouvelle partie
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-6">
        <PageHeader title="Historique" />

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
              <li key={session.id} className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/history/${session.id}`)}
                  aria-label={`Voir le détail de la partie de ${game?.name ?? 'jeu supprimé'}`}
                  className="flex-1 min-w-0 text-left bg-white rounded-2xl border border-purple-100 px-4 py-4 space-y-2 hover:border-purple-300 transition-colors"
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
                <button
                  onClick={() => setDeleteTarget(session.id)}
                  aria-label="Supprimer cette partie"
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-purple-300 hover:text-red-400 hover:bg-red-50 transition-colors text-base"
                >
                  🗑️
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs space-y-4 shadow-xl">
            <h2 id="delete-title" className="font-bold text-purple-800 text-lg">
              Supprimer cette partie ?
            </h2>
            <p className="text-sm text-purple-500">
              Cette action est irréversible.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                aria-label="Annuler"
                className="flex-1 h-10 rounded-xl border-purple-200 text-purple-600"
              >
                Annuler
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                aria-label="Confirmer la suppression"
                className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold"
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
