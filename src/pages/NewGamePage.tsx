import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { searchGames, getGameById } from '@/lib/games'
import { getPlayers, addPlayer } from '@/lib/players'
import { createSession } from '@/lib/sessions'
import type { Game } from '@/lib/games'
import type { Player } from '@/lib/players'
import PageHeader from '@/components/PageHeader'

type Step = 1 | 2 | 3

/* ---------- SortablePlayerChip ---------- */

interface SortablePlayerChipProps {
  player: Player
  onRemove: (id: string) => void
}

function SortablePlayerChip({ player, onRemove }: SortablePlayerChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2">
      <div
        {...attributes}
        {...listeners}
        className="flex-1 rounded-2xl px-4 py-3 border border-purple-300 bg-purple-50 cursor-grab active:cursor-grabbing touch-none"
        aria-label={`Réordonner ${player.name}`}
      >
        <span className="font-medium text-purple-800">{player.name}</span>
      </div>
      <button
        onClick={() => onRemove(player.id)}
        aria-label={`Retirer ${player.name}`}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-purple-400 hover:text-purple-700 hover:bg-purple-100 transition-colors text-lg leading-none"
      >
        ✕
      </button>
    </li>
  )
}

/* ---------- NewGamePage ---------- */

export default function NewGamePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const preSelectedGameId = (location.state as { gameId?: string } | null)?.gameId

  const [step, setStep] = useState<Step>(1)
  const [query, setQuery] = useState('')
  const [selectedGame, setSelectedGame] = useState<Game | null>(() =>
    preSelectedGameId ? (getGameById(preSelectedGameId) ?? null) : null
  )
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [players, setPlayers] = useState(() => getPlayers())
  const [newPlayerName, setNewPlayerName] = useState('')

  const filteredGames = searchGames(query)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newPlayerName.trim()
    if (!trimmed) return
    const player = addPlayer(trimmed)
    setPlayers(getPlayers())
    setSelectedPlayerIds((prev) => [...prev, player.id])
    setNewPlayerName('')
  }

  function addToSelection(id: string) {
    setSelectedPlayerIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  function removeFromSelection(id: string) {
    setSelectedPlayerIds((prev) => prev.filter((p) => p !== id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSelectedPlayerIds((prev) => {
        const oldIndex = prev.indexOf(active.id as string)
        const newIndex = prev.indexOf(over.id as string)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
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

  /* Derive ordered lists for step 2 */
  const availablePlayers = players.filter((p) => !selectedPlayerIds.includes(p.id))
  const selectedPlayers = selectedPlayerIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined)

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-linear-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-6">

        {/* Header + stepper */}
        <PageHeader title="Nouvelle partie" />
        <div className="flex items-center justify-center gap-2 -mt-4">
          {([1, 2, 3] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full transition-colors ${
                s === step ? 'bg-purple-600' : s < step ? 'bg-purple-300' : 'bg-purple-100'
              }`}
            />
          ))}
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
          <div className="space-y-6">
            <p className="text-sm font-semibold text-purple-500 uppercase tracking-wide">
              Étape 2 — Joueurs
            </p>
            <p className="text-xs text-purple-400 text-center">
              Sélectionnez {selectedGame.players.min}–{selectedGame.players.max} joueurs
            </p>

            {/* Section "Ordre de jeu" */}
            {selectedPlayers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
                  Ordre de jeu
                </p>
                {selectedPlayers.length >= 2 && (
                  <p className="text-xs text-purple-400">Glissez pour réorganiser</p>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedPlayerIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-2" aria-label="Ordre de jeu">
                      {selectedPlayers.map((player) => (
                        <SortablePlayerChip
                          key={player.id}
                          player={player}
                          onRemove={removeFromSelection}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Section "Joueurs disponibles" */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
                Joueurs disponibles
              </p>

              {/* Ajout rapide inline */}
              <form onSubmit={handleAddPlayer} className="flex gap-2">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Nouveau joueur…"
                  aria-label="Nom du nouveau joueur"
                  className="flex-1 h-10 rounded-xl border-2 border-purple-200 px-3 text-sm focus:outline-none focus:border-purple-400 bg-white"
                />
                <Button
                  type="submit"
                  disabled={!newPlayerName.trim()}
                  aria-label="Ajouter le joueur"
                  className="h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold"
                >
                  Ajouter
                </Button>
              </form>

              {availablePlayers.length === 0 ? (
                <p className="text-center text-purple-300 text-sm">
                  Tous les joueurs sont sélectionnés.
                </p>
              ) : (
                <ul className="space-y-2" aria-label="Joueurs disponibles">
                  {availablePlayers.map((player) => (
                    <li key={player.id} className="flex items-center gap-2">
                      <div className="flex-1 rounded-2xl px-4 py-3 border border-purple-100 bg-white">
                        <span className="font-medium text-purple-800">{player.name}</span>
                      </div>
                      <button
                        onClick={() => addToSelection(player.id)}
                        aria-label={`Ajouter ${player.name}`}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-purple-500 hover:text-purple-700 hover:bg-purple-100 transition-colors text-xl leading-none font-bold"
                      >
                        +
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

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
                <Collapsible>
                  <CollapsibleTrigger className="mt-1 text-xs text-purple-400 hover:text-purple-600 transition-colors flex items-center gap-1">
                    Détails ▾
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 text-sm text-purple-700 space-y-1">
                    <p>👥 Nombre de joueurs : {selectedGame.players.min} – {selectedGame.players.max}</p>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <div>
                <p className="text-xs text-purple-400">Joueurs</p>
                <ul className="mt-1 space-y-1">
                  {selectedPlayers.map((p) => (
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
