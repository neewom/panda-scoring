import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPlayers, addPlayer, deletePlayer, renamePlayer, type Player } from '@/lib/players'
import { getGames } from '@/lib/games'
import { getFinishedSessions } from '@/lib/sessions'
import { computePlayerSummaryStats } from '@/lib/player-stats'
import PageHeader from '@/components/PageHeader'

export default function PlayersPage() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Player[]>(() => getPlayers())
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Computed once per render — these don't change while the page is open
  const sessions = getFinishedSessions()
  const games = new Map(getGames().map((g) => [g.id, g]))

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    addPlayer(trimmed)
    setPlayers(getPlayers())
    setName('')
  }

  function handleDelete(id: string) {
    deletePlayer(id)
    setPlayers(getPlayers())
  }

  function handleStartEdit(player: Player) {
    setEditingId(player.id)
    setEditName(player.name)
    setEditError('')
  }

  function handleSave() {
    const trimmed = editName.trim()
    if (!trimmed) return
    const duplicate = players.find((p) => p.id !== editingId && p.name === trimmed)
    if (duplicate) {
      setEditError('Ce nom existe déjà')
      return
    }
    renamePlayer(editingId!, trimmed)
    setPlayers(getPlayers())
    setEditingId(null)
    setEditError('')
  }

  function handleCancel() {
    setEditingId(null)
    setEditError('')
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-8">
        <PageHeader title="Joueurs" />

        {/* Formulaire d'ajout */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du joueur"
            aria-label="Nom du joueur"
            className="flex-1 h-10 rounded-xl border-2 border-purple-200 px-3 text-sm focus:outline-none focus:border-purple-400 bg-white"
          />
          <Button
            type="submit"
            disabled={!name.trim()}
            className="h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold"
            aria-label="Ajouter le joueur"
          >
            Ajouter
          </Button>
        </form>

        {/* Liste des joueurs */}
        {players.length === 0 ? (
          <p className="text-center text-purple-300 text-sm">Aucun joueur pour l'instant.</p>
        ) : (
          <ul className="space-y-2" aria-label="Liste des joueurs">
            {players.map((player) => {
              const stats = computePlayerSummaryStats(player.id, sessions, games)
              return (
                <li
                  key={player.id}
                  className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-purple-100"
                >
                  {editingId === player.id ? (
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <div className="flex flex-col flex-1 min-w-0">
                        <input
                          ref={inputRef}
                          type="text"
                          value={editName}
                          onChange={(e) => { setEditName(e.target.value); setEditError('') }}
                          onKeyDown={handleEditKeyDown}
                          aria-label={`Renommer ${player.name}`}
                          className="h-8 rounded-lg border-2 border-purple-300 px-2 text-sm focus:outline-none focus:border-purple-500 bg-white"
                        />
                        {editError && (
                          <p className="text-xs text-pink-500 mt-1">{editError}</p>
                        )}
                      </div>
                      <button
                        onClick={handleSave}
                        aria-label="Valider le renommage"
                        className="text-purple-500 hover:text-purple-700 transition-colors shrink-0"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={handleCancel}
                        aria-label="Annuler le renommage"
                        className="text-purple-300 hover:text-purple-500 transition-colors shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => navigate(`/players/${player.id}`)}
                        aria-label={`Voir les statistiques de ${player.name}`}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="font-medium text-purple-800">{player.name}</p>
                        {stats.gamesPlayed > 0 ? (
                          <p className="text-xs text-purple-400">
                            {stats.gamesPlayed} {stats.gamesPlayed === 1 ? 'partie' : 'parties'} · {stats.wins} {stats.wins === 1 ? 'victoire' : 'victoires'} · {stats.winRate}%
                          </p>
                        ) : (
                          <p className="text-xs text-purple-300">Aucune partie jouée</p>
                        )}
                      </button>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <button
                          onClick={() => handleStartEdit(player)}
                          aria-label={`Renommer ${player.name}`}
                          className="text-purple-300 hover:text-purple-500 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(player.id)}
                          aria-label={`Supprimer ${player.name}`}
                          className="text-pink-400 hover:text-pink-600 text-sm font-semibold transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
