import { useGame } from '../../store/game'
import { colorName, describeStatus } from '../a11y/describeMove'

/** One short line under the headline: whose move it is for you, check, or an engine problem. */
function Detail() {
  const engine = useGame((s) => s.engine)
  const turn = useGame((s) => s.turn)
  const playerColor = useGame((s) => s.playerColor)
  const inCheck = useGame((s) => s.checkSquare !== null)
  const over = useGame((s) => s.status.kind !== 'playing')
  const moveNumber = useGame((s) => Math.floor(s.history.length / 2) + 1)

  if (engine === 'error') return <span className="text-danger">Stockfish could not load. Reload the page to try again.</span>
  if (over) return <span>You played {colorName(playerColor)}</span>
  if (inCheck) return <span className="text-danger">{turn === playerColor ? 'Your king is in check' : 'Check'}</span>
  const who = turn === playerColor ? 'Your move' : engine === 'loading' ? 'Loading Stockfish' : 'Stockfish is thinking'
  return (
    <span>
      {who}
      <span aria-hidden className="px-1.5 text-text-faint">·</span>
      Move {moveNumber}
    </span>
  )
}

/** Panel headline: the game state in the display serif, with one muted line of detail. */
export function StatusLine() {
  const turn = useGame((s) => s.turn)
  const status = useGame((s) => s.status)
  const headline = status.kind === 'playing' ? `${colorName(turn)} to move` : describeStatus(status)

  return (
    <div className="min-w-0 flex-1">
      <h2 className="atelier-display m-0 text-xl font-normal leading-tight text-text">{headline}</h2>
      <p className="m-0 mt-1 truncate text-sm text-text-muted">
        <Detail />
      </p>
    </div>
  )
}
