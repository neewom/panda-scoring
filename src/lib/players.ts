export interface Player {
  id: string
  name: string
  createdAt: string
}

const STORAGE_KEY = 'panda-players'

export function getPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Player[]) : []
  } catch {
    return []
  }
}

export function addPlayer(name: string): Player {
  const player: Player = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  }
  const players = getPlayers()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...players, player]))
  return player
}

export function deletePlayer(id: string): void {
  const players = getPlayers().filter((p) => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players))
}
