import { computePlayerTotal, computePerRoundTotal } from '@/lib/scoring'
import type { Game } from '@/lib/games'
import type { GameSession, ScoreEntry, SessionPlayer } from '@/lib/sessions'

function formatNames(names: string[]): string {
  if (names.length === 1) return names[0]
  return names.slice(0, -1).join(', ') + ' et ' + names[names.length - 1]
}

/** Raw field values for a player (end_game, no round) */
function getRawScores(
  scores: ScoreEntry[],
  playerId: string,
  game: Game
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const field of game.scoring) {
    const entry = scores.find(
      (s) => s.playerId === playerId && s.fieldId === field.id && s.round === undefined
    )
    result[field.id] = entry ? Number(entry.value) : 0
  }
  return result
}

interface GameResultSummaryProps {
  game: Game
  session: GameSession
  sessionPlayers: SessionPlayer[]
}

export default function GameResultSummary({ game, session, sessionPlayers }: GameResultSummaryProps) {
  const isPerRound = game.scoring_model === 'per_round'

  const ranked = sessionPlayers
    .map((p) => ({
      player: p,
      total: isPerRound
        ? computePerRoundTotal(game, session.scores, p.id)
        : computePlayerTotal(game, session.scores, p.id),
      scores: getRawScores(session.scores, p.id, game),
    }))
    .sort((a, b) => game.lowest_wins ? a.total - b.total : b.total - a.total)

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

  // Table columns
  const perRoundScores = session.scores.filter((s) => s.round !== undefined)
  const roundsPlayed =
    isPerRound && perRoundScores.length > 0
      ? Math.max(...perRoundScores.map((s) => s.round!))
      : 0

  type TableCol = { id: string; label: string; roundNum?: number }

  const tableCols: TableCol[] = isPerRound
    ? Array.from({ length: roundsPlayed }, (_, i) => ({
        id: `round_${i + 1}`,
        label: `Manche ${i + 1}`,
        roundNum: i + 1,
      }))
    : game.scoring.map((f) => ({ id: f.id, label: f.label }))

  const tableRows = sessionPlayers.map((p) => ({
    player: p,
    scores: getRawScores(session.scores, p.id, game),
  }))

  return (
    <>
      {/* Winner block */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 text-center space-y-2">
        <div className="text-5xl">🏆</div>
        <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide">
          {isTie ? 'Égalité' : 'Vainqueur'}
        </p>
        <p className="text-3xl font-extrabold text-purple-700">{formatNames(winnerNames)}</p>
        {isTie && !tieBreakLabel && !game.tiebreak_description && (
          <p className="text-xs text-amber-500">Victoire partagée</p>
        )}
        {isTie && game.tiebreak_description && !tieBreakLabel && (
          <p className="text-xs text-purple-500">{game.tiebreak_description}</p>
        )}
        {tieBreakLabel && (
          <p className="text-xs text-purple-400">Départagé par : {tieBreakLabel}</p>
        )}
        {game.end_condition && (
          <p className="text-xs text-amber-500">
            Partie terminée : seuil de {game.end_condition.score_threshold} points atteint
          </p>
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
                <span className={`${isWinner ? 'font-bold' : 'font-medium'} ${player.deleted ? 'italic text-purple-400' : 'text-purple-800'}`}>
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
            {tableRows.map(({ player, scores }) => {
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
                    <span className={player.deleted ? 'italic text-purple-400' : undefined}>
                      {player.name}
                    </span>
                  </td>
                  {tableCols.map((col) => {
                    const cellValue: number = isPerRound
                      ? computePlayerTotal(game, session.scores, player.id, col.roundNum)
                      : (scores[col.id] ?? 0)
                    return (
                      <td
                        key={col.id}
                        className="px-3 py-2 text-center whitespace-nowrap text-purple-800"
                      >
                        {cellValue}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
