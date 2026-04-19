import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { getSessionCount, clearSessions } from '@/lib/sessions'
import { getPlayers, clearPlayers } from '@/lib/players'
import { getCustomGames, clearCustomGames } from '@/lib/games'
import PageHeader from '@/components/PageHeader'

type ConfirmAction = 'sessions' | 'players' | 'customGames'

interface ConfirmConfig {
  title: string
  description: string
  successMessage: string
}

const CONFIRM_CONFIGS: Record<ConfirmAction, ConfirmConfig> = {
  sessions: {
    title: 'Supprimer toutes les parties ?',
    description: 'Cette action est irréversible.',
    successMessage: 'Toutes les parties ont été supprimées.',
  },
  players: {
    title: 'Supprimer tous les joueurs ?',
    description:
      "Cette action est irréversible. Les joueurs apparaissant dans l'historique resteront visibles.",
    successMessage: 'Tous les joueurs ont été supprimés.',
  },
  customGames: {
    title: 'Supprimer les jeux personnalisés ?',
    description: 'Cette action est irréversible.',
    successMessage: 'Les jeux personnalisés ont été supprimés.',
  },
}

export default function SettingsPage() {
  const [sessionCount, setSessionCount] = useState(() => getSessionCount())
  const [playerCount, setPlayerCount] = useState(() => getPlayers().length)
  const [customGameCount, setCustomGameCount] = useState(() => getCustomGames().length)

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!successMessage) return
    const timer = setTimeout(() => setSuccessMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [successMessage])

  function handleConfirm() {
    if (!confirmAction) return
    const config = CONFIRM_CONFIGS[confirmAction]

    if (confirmAction === 'sessions') {
      clearSessions()
      setSessionCount(0)
    } else if (confirmAction === 'players') {
      clearPlayers()
      setPlayerCount(0)
    } else if (confirmAction === 'customGames') {
      clearCustomGames()
      setCustomGameCount(0)
    }

    setConfirmAction(null)
    setSuccessMessage(config.successMessage)
  }

  const config = confirmAction ? CONFIRM_CONFIGS[confirmAction] : null

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-8">

        {/* Header */}
        <PageHeader title="Paramètres" />

        {/* Success toast */}
        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm font-medium text-green-700 text-center"
          >
            {successMessage}
          </div>
        )}

        {/* Section Données */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-purple-500 uppercase tracking-wide">
            Données
          </h2>

          <div className="bg-white rounded-2xl border border-purple-100 divide-y divide-purple-50">

            {/* Supprimer toutes les parties */}
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <span className="text-xs text-purple-400">
                {sessionCount} {sessionCount === 1 ? 'partie' : 'parties'}
              </span>
              <Button
                variant="outline"
                onClick={() => setConfirmAction('sessions')}
                aria-label="Supprimer toutes les parties"
                className="h-9 text-sm border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 rounded-xl"
              >
                Supprimer toutes les parties
              </Button>
            </div>

            {/* Supprimer tous les joueurs */}
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <span className="text-xs text-purple-400">
                {playerCount} {playerCount === 1 ? 'joueur' : 'joueurs'}
              </span>
              <Button
                variant="outline"
                onClick={() => setConfirmAction('players')}
                aria-label="Supprimer tous les joueurs"
                className="h-9 text-sm border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 rounded-xl"
              >
                Supprimer tous les joueurs
              </Button>
            </div>

            {/* Supprimer les jeux personnalisés — masqué si aucun */}
            {customGameCount > 0 && (
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <span className="text-xs text-purple-400">
                  {customGameCount} {customGameCount === 1 ? 'jeu' : 'jeux'}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction('customGames')}
                  aria-label="Supprimer les jeux personnalisés"
                  className="h-9 text-sm border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 rounded-xl"
                >
                  Supprimer les jeux perso
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Section À propos */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-purple-500 uppercase tracking-wide">
            À propos
          </h2>
          <div className="bg-white rounded-2xl border border-purple-100 px-4 py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-purple-400">Application</span>
              <span className="font-medium text-purple-800">Panda Scoring 🐼</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-purple-400">Version</span>
              <span className="font-medium text-purple-800">1.0.0</span>
            </div>
            <p className="text-xs text-center text-purple-300 pt-1">
              Fait avec 💜 en vibe coding
            </p>
          </div>
        </div>

      </div>

      {/* Confirmation modal */}
      {confirmAction && config && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs space-y-4 shadow-xl">
            <h2 id="confirm-title" className="font-bold text-purple-800 text-lg leading-snug">
              {config.title}
            </h2>
            <p className="text-sm text-purple-500">{config.description}</p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setConfirmAction(null)}
                aria-label="Annuler"
                className="flex-1 h-10 rounded-xl border-purple-200 text-purple-600"
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirm}
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
