import { useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getGameById } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import { getSessionById, deleteSession, resolveSessionPlayers } from '@/lib/sessions'
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

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  if (!session || sessionPlayers.length === 0) {
    return <Navigate to="/history" replace />
  }

  function handleDeleteConfirm() {
    deleteSession(session!.id)
    navigate('/history', { replace: true })
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
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/history')}
            aria-label="Retour à l'historique"
            className="w-full h-12 font-semibold rounded-2xl border-2 border-purple-200 text-purple-600"
          >
            📜 Retour à l'historique
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(true)}
            aria-label="Supprimer cette partie"
            className="w-full h-10 text-sm font-medium rounded-2xl border border-red-200 text-red-400 hover:bg-red-50 hover:border-red-300"
          >
            🗑️ Supprimer cette partie
          </Button>
        </div>

      </div>

      {showDeleteModal && (
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
                onClick={() => setShowDeleteModal(false)}
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
