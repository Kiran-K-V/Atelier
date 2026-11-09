import { motion } from 'motion/react'
import { useGame } from '../../store/game'
import { useSettings } from '../../store/settings'
import { colorName, describeStatus } from '../a11y/describeMove'
import { bezier } from '../motionTokens'

/** A brass segment slides along a hairline. Static when motion is reduced. */
function ThinkingBar() {
  const reduced = useSettings((s) => s.reducedMotion)
  return (
    <span aria-hidden className="relative block h-px w-10 overflow-hidden bg-line-strong">
      <motion.span
        className="absolute inset-y-0 left-0 w-1/3 bg-accent-strong"
        initial={reduced ? false : { x: '-100%' }}
        animate={reduced ? { x: '100%' } : { x: ['-100%', '300%'] }}
        transition={reduced ? { duration: 0 } : { duration: 1.4, ease: bezier('soft'), repeat: Infinity }}
      />
    </span>
  )
}

function Detail() {
  const engine = useGame((s) => s.engine)
  const turn = useGame((s) => s.turn)
  const playerColor = useGame((s) => s.playerColor)
  const inCheck = useGame((s) => s.checkSquare !== null)
  const over = useGame((s) => s.status.kind !== 'playing')

  if (engine === 'error') {
    return <span className="text-danger">Stockfish could not load. Reload the page to try again.</span>
  }
  if (engine === 'thinking') {
    return (
      <span className="flex items-center gap-3">
        Stockfish is thinking
        <ThinkingBar />
      </span>
    )
  }
  if (engine === 'loading') {
    return (
      <span className="flex items-center gap-3">
        Loading Stockfish
        <ThinkingBar />
      </span>
    )
  }
  if (over) return <span>You played {colorName(playerColor)}</span>
  if (inCheck) return <span className="text-danger">{colorName(turn)} is in check</span>
  return <span>{turn === playerColor ? 'Your move' : `You play ${colorName(playerColor)}`}</span>
}

export function StatusLine() {
  const turn = useGame((s) => s.turn)
  const status = useGame((s) => s.status)
  const headline = status.kind === 'playing' ? `${colorName(turn)} to move` : describeStatus(status)

  return (
    <div className="px-4 pb-5 lg:px-6">
      <p className="atelier-display m-0 text-2xl font-normal leading-tight text-text">{headline}</p>
      <p className="m-0 mt-2 flex min-h-5 items-center text-sm text-text-muted">
        <Detail />
      </p>
    </div>
  )
}
