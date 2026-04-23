import { useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getGameById, deleteGame } from '@/lib/games'
import PageHeader from '@/components/PageHeader'

const SCORING_MODEL_LABELS: Record<string, string> = {
  end_game: 'Fin de partie',
  per_round: 'Par manche',
  hybrid: 'Hybride',
}

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const game = id ? getGameById(id) : undefined

  if (!game) {
    return <Navigate to="/games" replace />
  }

  const scoringModelLabel = SCORING_MODEL_LABELS[game.scoring_model] ?? game.scoring_model

  function handleDeleteConfirm() {
    deleteGame(game!.id)
    navigate('/games', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <PageHeader title={game.name} onBack={() => navigate('/games')} backLabel="Bibliothèque" />
        {game.validated && (
          <div className="-mt-4 text-center">
            <span className="inline-block text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              validé
            </span>
          </div>
        )}

        {/* Informations */}
        <div className="bg-white rounded-2xl border border-purple-100 px-4 py-4 space-y-2">
          <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
            Informations
          </p>
          {game.publisher && (
            <div className="flex justify-between text-sm">
              <span className="text-purple-400">Éditeur</span>
              <span className="font-medium text-purple-800">{game.publisher}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-purple-400">Joueurs</span>
            <span className="font-medium text-purple-800">
              {game.players.min === game.players.max
                ? `${game.players.min} joueurs`
                : `${game.players.min} à ${game.players.max} joueurs`}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-purple-400">Scoring</span>
            <span className="font-medium text-purple-800">{scoringModelLabel}</span>
          </div>
          {game.lowest_wins && (
            <div className="flex justify-between text-sm">
              <span className="text-purple-400">Victoire</span>
              <span className="font-medium text-purple-800">Score le plus bas</span>
            </div>
          )}
          {game.end_condition && (
            <div className="flex justify-between text-sm">
              <span className="text-purple-400">Fin de partie</span>
              <span className="font-medium text-purple-800">
                Premier joueur à {game.end_condition.score_threshold} points
              </span>
            </div>
          )}
        </div>

        {/* Catégories de scoring */}
        <div className="bg-white rounded-2xl border border-purple-100 px-4 py-4 space-y-3">
          <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
            Catégories de scoring
          </p>
          <ul className="space-y-2" aria-label="Catégories de scoring">
            {game.scoring.map((field) => (
              <li key={field.id} className="text-sm font-medium text-purple-800">
                {field.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Départage */}
        <div className="bg-white rounded-2xl border border-purple-100 px-4 py-4 space-y-3">
          <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
            Départage
          </p>
          {game.tieBreak && game.tieBreak.length > 0 ? (
            <ul className="space-y-1" aria-label="Règles de départage">
              {game.tieBreak.map((rule, i) => (
                <li key={i} className="text-sm text-purple-800">
                  {i + 1}. {rule.label}
                </li>
              ))}
            </ul>
          ) : game.tiebreak_description ? (
            <p className="text-sm text-purple-800">{game.tiebreak_description}</p>
          ) : (
            <p className="text-sm text-purple-400">Victoire partagée en cas d'égalité</p>
          )}
        </div>

        {/* Notes de scoring */}
        {game.scoring_notes && (
          <div className="bg-white rounded-2xl border border-purple-100 px-4 py-4 space-y-2">
            <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
              Notes de scoring
            </p>
            <p className="text-sm text-purple-700">{game.scoring_notes}</p>
          </div>
        )}

        {/* Actions */}
        <Button
          onClick={() => navigate('/new-game', { state: { gameId: game.id, startAtStep: 2 } })}
          aria-label={`Jouer à ${game.name}`}
          className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
        >
          🎮 Jouer
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/games/${game.id}/edit`)}
            className="flex-1"
          >
            Modifier
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(true)}
            className="flex-1 border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400 hover:text-red-600"
          >
            Supprimer
          </Button>
        </div>

      </div>

      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-game-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs space-y-4 shadow-xl">
            <h2 id="delete-game-title" className="font-bold text-purple-800 text-lg leading-snug">
              Supprimer ce jeu ?
            </h2>
            <p className="text-sm text-purple-500">
              Les parties déjà jouées seront conservées dans l'historique.
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteModal(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
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
