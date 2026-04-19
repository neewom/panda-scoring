import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getGameById, computeRoundCount } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import {
  getInProgressSessions,
  getFinishedSessions,
  abandonSession,
  resolveSessionPlayers,
  type GameSession,
} from '@/lib/sessions'
import { resolvePlayerTotal } from '@/lib/scoring'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  })
}

function progressLabel(session: GameSession): string {
  const game = getGameById(session.gameId)
  if (!game || !session.progress) return ''
  const { phase, round, fieldIndex } = session.progress
  if (phase === 'round_summary') return `Résumé manche ${round}`
  if (game.scoring_model === 'per_round') {
    const total = computeRoundCount(game, session.players.length)
    return total ? `Manche ${round}/${total}` : `Manche ${round}`
  }
  return `Étape ${fieldIndex + 1}/${game.scoring.length}`
}

export default function HomePage() {
  const navigate = useNavigate()
  const allPlayers = getPlayers()

  const [inProgress, setInProgress] = useState(() => getInProgressSessions())
  const [abandonTarget, setAbandonTarget] = useState<string | null>(null)

  const finishedSessions = getFinishedSessions()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

  function handleAbandonConfirm() {
    if (!abandonTarget) return
    abandonSession(abandonTarget)
    setInProgress(getInProgressSessions())
    setAbandonTarget(null)
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-purple-700">🐼 Scoring</h1>
        </div>

        {/* Parties en cours */}
        {inProgress.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
              Parties en cours
            </p>
            <ul className="space-y-2">
              {inProgress.map((session) => {
                const game = getGameById(session.gameId)
                const players = resolveSessionPlayers(session, allPlayers)
                const label = progressLabel(session)
                return (
                  <li key={session.id} className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/game/${session.id}`)}
                      aria-label={`Reprendre la partie de ${game?.name ?? 'jeu supprimé'}`}
                      className="flex-1 min-w-0 text-left bg-white rounded-2xl border border-purple-200 px-4 py-3 hover:border-purple-400 transition-colors"
                    >
                      <p className={`font-semibold text-sm ${game ? 'text-purple-800' : 'italic text-purple-400'}`}>
                        {game?.name ?? 'Jeu supprimé'}
                      </p>
                      <p className="text-xs text-purple-400 truncate">
                        {players.map((p) => p.name).join(', ')}
                      </p>
                      {label && (
                        <p className="text-xs font-medium text-purple-500 mt-0.5">{label}</p>
                      )}
                    </button>
                    <button
                      onClick={() => setAbandonTarget(session.id)}
                      aria-label="Abandonner cette partie"
                      className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-purple-300 hover:text-red-400 hover:bg-red-50 transition-colors text-base"
                    >
                      🗑️
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* CTA principale */}
        <Button
          onClick={() => navigate('/new-game')}
          className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 rounded-2xl"
          aria-label="Créer une nouvelle partie"
        >
          🎲 Nouvelle partie
        </Button>

        {/* Dernières parties */}
        {finishedSessions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
              Dernières parties
            </p>
            <ul className="space-y-2">
              {finishedSessions.map((session) => {
                const game = getGameById(session.gameId)
                const players = resolveSessionPlayers(session, allPlayers)
                const ranked = players
                  .map((p) => ({ name: p.name, total: resolvePlayerTotal(session, game, p.id) }))
                  .sort((a, b) => (game?.lowest_wins ? a.total - b.total : b.total - a.total))
                const winner = ranked[0]
                return (
                  <li key={session.id}>
                    <button
                      onClick={() => navigate(`/history/${session.id}`)}
                      aria-label={`Voir la partie de ${game?.name ?? 'jeu supprimé'}`}
                      className="w-full text-left bg-white rounded-2xl border border-purple-100 px-4 py-3 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-semibold text-sm ${game ? 'text-purple-800' : 'italic text-purple-400'}`}>
                          {game?.name ?? 'Jeu supprimé'}
                        </p>
                        <p className="text-xs text-purple-300 whitespace-nowrap">
                          {formatDate(session.createdAt)}
                        </p>
                      </div>
                      {winner && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          🏆 {winner.name} · {winner.total} pts
                        </p>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
            <button
              onClick={() => navigate('/history')}
              className="w-full text-xs text-purple-400 hover:text-purple-600 transition-colors text-right py-1"
            >
              Voir tout l'historique →
            </button>
          </div>
        )}

        {/* CTAs secondaires */}
        <div className="flex flex-col gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate('/players')}
            className="w-full h-12 text-base font-semibold text-purple-500 hover:bg-purple-50 rounded-2xl"
            aria-label="Gérer les joueurs"
          >
            👥 Joueurs
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/games')}
            className="w-full h-12 text-base font-semibold text-purple-500 hover:bg-purple-50 rounded-2xl"
            aria-label="Voir la bibliothèque de jeux"
          >
            🎮 Bibliothèque de jeux
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/settings')}
            className="w-full h-10 text-sm font-medium text-purple-300 hover:text-purple-500 hover:bg-purple-50 rounded-2xl"
            aria-label="Paramètres"
          >
            ⚙️ Paramètres
          </Button>
        </div>

      </div>

      {/* Modale d'abandon */}
      {abandonTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="abandon-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs space-y-4 shadow-xl">
            <h2 id="abandon-title" className="font-bold text-purple-800 text-lg">
              Abandonner cette partie ?
            </h2>
            <p className="text-sm text-purple-500">
              La partie sera supprimée définitivement, sans être sauvegardée dans l'historique.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setAbandonTarget(null)}
                aria-label="Annuler"
                className="flex-1 h-10 rounded-xl border-purple-200 text-purple-600"
              >
                Annuler
              </Button>
              <Button
                onClick={handleAbandonConfirm}
                aria-label="Confirmer l'abandon"
                className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold"
              >
                Abandonner
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
