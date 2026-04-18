import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getGameById } from '@/lib/games'
import PageHeader from '@/components/PageHeader'

const SCORING_MODEL_LABELS: Record<string, string> = {
  end_game: 'Fin de partie',
  per_round: 'Par manche',
  hybrid: 'Hybride',
}

function prettifyFormula(formula: string): string {
  return formula.replace(/\*/g, '×').replace(/\//g, '÷')
}

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const game = id ? getGameById(id) : undefined

  if (!game) {
    return <Navigate to="/games" replace />
  }

  const computedFields = game.computed.filter((f) => f.id !== 'total')
  const scoringModelLabel = SCORING_MODEL_LABELS[game.scoring_model] ?? game.scoring_model

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <PageHeader title={game.name} />
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
              <li key={field.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-purple-800">{field.label}</span>
                <span className="text-xs text-purple-400 bg-purple-50 px-2 py-0.5 rounded-full">
                  {field.type === 'boolean' ? 'oui / non' : 'nombre'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Calculs automatiques */}
        {computedFields.length > 0 && (
          <div className="bg-white rounded-2xl border border-purple-100 px-4 py-4 space-y-3">
            <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
              Calculs automatiques
            </p>
            <ul className="space-y-2" aria-label="Calculs automatiques">
              {computedFields.map((field) => (
                <li key={field.id} className="text-sm space-y-0.5">
                  <p className="font-medium text-purple-800">{field.label ?? field.id}</p>
                  <p className="text-xs text-purple-400 font-mono">
                    {prettifyFormula(field.formula)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

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
          onClick={() => navigate('/new-game', { state: { gameId: game.id } })}
          aria-label={`Jouer à ${game.name}`}
          className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
        >
          🎮 Jouer
        </Button>

      </div>
    </div>
  )
}
