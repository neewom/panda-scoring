import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getPlayers, addPlayer, deletePlayer, type Player } from '@/lib/players'

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>(() => getPlayers())
  const [name, setName] = useState('')

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

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-1">
          <div className="text-5xl">👥</div>
          <h1 className="text-3xl font-bold text-purple-700">Joueurs</h1>
        </div>

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
            {players.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-purple-100"
              >
                <span className="font-medium text-purple-800">{player.name}</span>
                <button
                  onClick={() => handleDelete(player.id)}
                  aria-label={`Supprimer ${player.name}`}
                  className="text-pink-400 hover:text-pink-600 text-sm font-semibold transition-colors"
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
