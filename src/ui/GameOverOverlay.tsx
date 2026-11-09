import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { GameStatus } from '../rules/types'
import { useGame } from '../store/game'
import { usePresentation } from '../store/presentation'
import { useSettings } from '../store/settings'
import { colorName, drawReasonText } from './a11y/describeMove'
import { Button } from './Button'
import { bezier, sec } from './motionTokens'
import { labelClass } from './styles'
import { useFocusTrap } from './useFocusTrap'

type Finished = Exclude<GameStatus, { kind: 'playing' }>

const HEADLINE: Record<Finished['kind'], string> = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate',
  draw: 'Draw',
}

function subline(status: Finished, turn: 'w' | 'b', fullMoves: number): string {
  switch (status.kind) {
    case 'checkmate':
      return `${colorName(status.winner)} wins in ${fullMoves} ${fullMoves === 1 ? 'move' : 'moves'}`
    case 'stalemate':
      return `${colorName(turn)} has no legal move, and the king is not in check`
    case 'draw':
      return `Drawn by ${drawReasonText(status.reason)}`
  }
}

function ResultCard({ status, onReview }: { status: Finished; onReview: () => void }) {
  const turn = useGame((s) => s.turn)
  const playerColor = useGame((s) => s.playerColor)
  const fullMoves = useGame((s) => Math.ceil(s.history.length / 2))
  const newGame = useGame((s) => s.newGame)
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, onReview)

  return (
    <motion.div
      className="glass-scrim absolute inset-0 z-20 grid place-items-center bg-bg/50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: sec('slow'), ease: bezier('soft') }}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-labelledby="game-over-headline"
        tabIndex={-1}
        initial={{ y: 16 }}
        animate={{ y: 0, transition: { duration: sec('deliberate'), ease: bezier('enter') } }}
        exit={{ y: 8, transition: { duration: sec('fast'), ease: bezier('exit') } }}
        className="glass w-full max-w-sm rounded-md border border-line-strong bg-surface p-6 shadow-lg outline-none lg:p-8"
      >
        <p className={`${labelClass} m-0`}>Result</p>
        <h2 id="game-over-headline" className="atelier-display m-0 mt-3 text-4xl font-light leading-none text-text lg:text-5xl">
          {HEADLINE[status.kind]}
        </h2>
        <p className="m-0 mt-4 text-base text-text-muted">{subline(status, turn, fullMoves)}</p>
        <div className="mt-8 grid grid-cols-2 gap-3 border-t border-line pt-6">
          <Button variant="primary" data-autofocus onClick={() => newGame(playerColor)}>
            Play again
          </Button>
          <Button onClick={onReview}>Review</Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

const CINEMATIC_SETTLE_MS = 400

/** True once the final position's choreography has finished (plus a short breath). */
function useChoreographySettled(): boolean {
  const plies = useGame((s) => s.history.length)
  const settledPly = usePresentation((s) => s.settledPly)
  const reducedMotion = useSettings((s) => s.reducedMotion)
  const caughtUp = settledPly >= plies
  // Keyed by ply so a breath taken for an earlier position never counts for this one.
  const [breathedAt, setBreathedAt] = useState<number | null>(null)
  useEffect(() => {
    if (!caughtUp) return
    const id = window.setTimeout(() => setBreathedAt(plies), CINEMATIC_SETTLE_MS)
    return () => window.clearTimeout(id)
  }, [caughtUp, plies])
  return caughtUp && (reducedMotion || breathedAt === plies)
}

export function GameOverOverlay() {
  const status = useGame((s) => s.status)
  const ready = useChoreographySettled()
  const [dismissed, setDismissed] = useState(false)
  // Re-arm for the next game. Setting state during render is React's pattern for derived resets.
  if (status.kind === 'playing' && dismissed) setDismissed(false)

  return (
    <AnimatePresence>
      {status.kind !== 'playing' && !dismissed && ready && (
        <ResultCard key="result" status={status} onReview={() => setDismissed(true)} />
      )}
    </AnimatePresence>
  )
}
