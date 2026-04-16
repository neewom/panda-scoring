import { computePlayerTotal, computePlayerScores } from '@/lib/scoring'
import type { Game } from '@/lib/games'
import type { Player } from '@/lib/players'
import type { GameSession } from '@/lib/sessions'

function formatNames(names: string[]): string {
  if (names.length === 1) return names[0]
  return names.slice(0, -1).join(', ') + ' et ' + names[names.length - 1]
}

function formatCellValue(value: number | boolean | undefined): string | number {
  if (value === undefined) return 0
  if (typeof value === 'boolean') return value ? '✓' : '—'
  return value
}

interface GameResultSummaryProps {
  game: Game
  session: GameSession
  sessionPlayers: Player[]
}

export default function GameResultSummary({ game, session, sessionPlayers }: GameResultSummaryProps) {
  const ranked = sessionPlayers
    .map((p) => ({
      player: p,
      total: computePlayerTotal(game, session.scores, p.id),
      scores: computePlayerScores(game, session.scores, p.id),
    }))
    .sort((a, b) => b.total - a.total)

  const topScore = ranked[0].total
  let winners = ranked.filter((r) => r.total === topScore)
  let tieBreakLabel: string | undefined

  if (game.tieBreak && winners.length > 1) {
    for (const rule of game.tieBreak) {
      const sorted = [...winners].sort((a, b) => rule.compare(a.scores, b.scores))
      if (rule.compare(sorted[0].scores, sorted[1].scores) !== 0) {
        winners = [sorted[0]]
        tieBreakLabel = rule.label
        break
      }
    }
  }

  const winnerIds = new Set(winners.map((w) => w.player.id))
  const winnerNames = winners.map((w) => w.player.name)
  const isTie = winners.length > 1

  const tableCols = [
    ...game.scoring.map((f) => ({ id: f.id, label: f.label })),
    ...game.computed
      .filter((f) => f.id !== 'total')
      .map((f) => ({ id: f.id, label: f.label ?? f.id })),
    { id: 'total', label: 'Total' },
  ]

  return (
    <>
      {/* Winner block */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 text-center space-y-2">
        <div className="text-5xl">🏆</div>
        <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide">
          {isTie ? 'Égalité' : 'Vainqueur'}
        </p>
        <p className="text-3xl font-extrabold text-purple-700">{formatNames(winnerNames)}</p>
        {isTie && (
          <p className="text-xs text-amber-500">Victoire partagée</p>
        )}
        {tieBreakLabel && (
          <p className="text-xs text-purple-400">Départagé par : {tieBreakLabel}</p>
        )}
      </div>

      {/* Ranked list */}
      <div className="bg-white rounded-2xl border border-purple-100 divide-y divide-purple-50">
        {ranked.map(({ player, total }, i) => {
          const isWinner = winnerIds.has(player.id)
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between px-4 py-3 ${isWinner ? 'bg-amber-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-purple-300">#{i + 1}</span>
                <span className={`${isWinner ? 'font-bold' : 'font-medium'} text-purple-800`}>
                  {player.name}
                </span>
              </div>
              <span className={`${isWinner ? 'font-extrabold' : 'font-bold'} text-purple-600`}>
                {total} pts
              </span>
            </div>
          )
        })}
      </div>

      {/* Breakdown table */}
      <div className="overflow-x-auto rounded-2xl border border-purple-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-purple-50 text-purple-500 text-xs uppercase">
            <tr>
              <th scope="col" className="px-3 py-3 font-semibold sticky left-0 bg-purple-50">
                Joueur
              </th>
              {tableCols.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className="px-3 py-3 font-semibold whitespace-nowrap text-center"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ player, scores }) => {
              const isWinner = winnerIds.has(player.id)
              return (
                <tr
                  key={player.id}
                  data-winner={isWinner ? 'true' : undefined}
                  className={`border-t border-purple-50 ${isWinner ? 'bg-amber-50' : 'bg-white'}`}
                >
                  <td
                    className={`px-3 py-2 sticky left-0 ${
                      isWinner
                        ? 'bg-amber-50 font-bold text-purple-800'
                        : 'bg-white font-medium text-purple-700'
                    }`}
                  >
                    {player.name}
                  </td>
                  {tableCols.map((col) => (
                    <td
                      key={col.id}
                      className={`px-3 py-2 text-center whitespace-nowrap ${
                        col.id === 'total'
                          ? isWinner
                            ? 'font-extrabold text-purple-700'
                            : 'font-bold text-purple-600'
                          : 'text-purple-800'
                      }`}
                    >
                      {formatCellValue(scores[col.id])}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
