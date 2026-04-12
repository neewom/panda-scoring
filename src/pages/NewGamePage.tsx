import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { searchGames } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import { createSession } from '@/lib/sessions'
import type { Game } from '@/lib/games'

type Step = 1 | 2 | 3

export default function NewGamePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [query, setQuery] = useState('')
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])

  const players = getPlayers()
  const filteredGames = searchGames(query)

  function togglePlayer(id: string) {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const playerCountValid =
    selectedGame !== null &&
    selectedPlayerIds.length >= selectedGame.players.min &&
    selectedPlayerIds.length <= selectedGame.players.max

  function handleLaunch() {
    if (!selectedGame || !playerCountValid) return
    const session = createSession(selectedGame.id, selectedPlayerIds)
    navigate(`/game/${session.id}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 pb-24 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-6">

        {/* Header + stepper */}
        <div className="text-center space-y-2">
          <div className="text-5xl">🎮</div>
          <h1 className="text-3xl font-bold text-purple-700">Nouvelle partie</h1>
          <div className="flex items-center justify-center gap-2 pt-1">
            {([1, 2, 3] as Step[]).map((s) => (
              <div
                key={s}
                className={`h-2 w-2 rounded-full transition-colors ${
                  s === step ? 'bg-purple-600' : s < step ? 'bg-purple-300' : 'bg-purple-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Étape 1 — Choisir un jeu */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-purple-500 uppercase tracking-wide">
              Étape 1 — Choisir un jeu
            </p>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un jeu…"
              aria-label="Rechercher un jeu"
              className="w-full h-10 rounded-xl border-2 border-purple-200 px-3 text-sm focus:outline-none focus:border-purple-400 bg-white"
            />
            <ul className="space-y-2" aria-label="Résultats de recherche">
              {filteredGames.map((game) => (
                <li key={game.id}>
                  <button
                    onClick={() => setSelectedGame(game)}
                    aria-pressed={selectedGame?.id === game.id}
                    className={`w-full text-left rounded-2xl px-4 py-3 border transition-colors ${
                      selectedGame?.id === game.id
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-purple-100 bg-white hover:border-purple-200'
                    }`}
                  >
                    <p className="font-semibold text-purple-800">{game.name}</p>
                    <p className="text-xs text-purple-400">
                      {game.players.min}–{game.players.max} joueurs
                    </p>
                  </button>
                </li>
              ))}
              {filteredGames.length === 0 && (
                <p className="text-center text-purple-300 text-sm">Aucun jeu trouvé.</p>
              )}
            </ul>
            <Button
              onClick={() => setStep(2)}
              disabled={selectedGame === null}
              aria-label="Passer à l'étape suivante"
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
            >
              Suivant
            </Button>
          </div>
        )}

        {/* Étape 2 — Sélectionner les joueurs */}
        {step === 2 && selectedGame && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-purple-500 uppercase tracking-wide">
              Étape 2 — Joueurs
            </p>
            <p className="text-xs text-purple-400 text-center">
              Sélectionnez {selectedGame.players.min}–{selectedGame.players.max} joueurs
            </p>
            {players.length === 0 ? (
              <p className="text-center text-purple-300 text-sm">
                Aucun joueur enregistré.{' '}
                <button
                  onClick={() => navigate('/players')}
                  className="underline text-purple-500"
                >
                  Ajouter des joueurs
                </button>
              </p>
            ) : (
              <ul className="space-y-2" aria-label="Liste des joueurs">
                {players.map((player) => {
                  const selected = selectedPlayerIds.includes(player.id)
                  return (
                    <li key={player.id}>
                      <button
                        onClick={() => togglePlayer(player.id)}
                        aria-pressed={selected}
                        className={`w-full text-left rounded-2xl px-4 py-3 border transition-colors ${
                          selected
                            ? 'border-purple-400 bg-purple-50'
                            : 'border-purple-100 bg-white hover:border-purple-200'
                        }`}
                      >
                        <span className="font-medium text-purple-800">{player.name}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                aria-label="Retour à l'étape précédente"
                className="flex-1 h-12 font-semibold rounded-2xl border-2 border-purple-200 text-purple-600"
              >
                Retour
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!playerCountValid}
                aria-label="Passer à l'étape suivante"
                className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
              >
                Suivant
              </Button>
            </div>
          </div>
        )}

        {/* Étape 3 — Confirmation */}
        {step === 3 && selectedGame && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-purple-500 uppercase tracking-wide">
              Étape 3 — Confirmation
            </p>
            <div className="bg-white rounded-2xl px-4 py-4 border border-purple-100 space-y-3">
              <div>
                <p className="text-xs text-purple-400">Jeu</p>
                <p className="font-bold text-purple-800 text-lg">{selectedGame.name}</p>
              </div>
              <div>
                <p className="text-xs text-purple-400">Joueurs</p>
                <ul className="mt-1 space-y-1">
                  {players
                    .filter((p) => selectedPlayerIds.includes(p.id))
                    .map((p) => (
                      <li key={p.id} className="font-medium text-purple-700">
                        {p.name}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                aria-label="Retour à l'étape précédente"
                className="flex-1 h-12 font-semibold rounded-2xl border-2 border-purple-200 text-purple-600"
              >
                Retour
              </Button>
              <Button
                onClick={handleLaunch}
                aria-label="Lancer la partie"
                className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl"
              >
                Lancer la partie
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
