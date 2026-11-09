import { motion } from 'motion/react'
import { useSettings } from '../store/settings'
import { bezier } from './motionTokens'
import { labelClass } from './styles'

const LOOP_SECONDS = 3.6

/** A brass hairline draws a square, holds, and fades. Calm on purpose: no spinner. */
export function BoardLoading() {
  const reduced = useSettings((s) => s.reducedMotion)
  return (
    <div role="status" className="flex size-full flex-col items-center justify-center gap-6 bg-bg">
      <svg viewBox="0 0 100 100" aria-hidden className="size-24 overflow-visible">
        <motion.rect
          x="4"
          y="4"
          width="92"
          height="92"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          initial={reduced ? false : { pathLength: 0, opacity: 1 }}
          animate={reduced ? { pathLength: 1, opacity: 0.7 } : { pathLength: [0, 1, 1], opacity: [1, 1, 0] }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: LOOP_SECONDS, times: [0, 0.72, 1], ease: bezier('soft'), repeat: Infinity }
          }
        />
      </svg>
      <p className={labelClass}>Setting the board</p>
    </div>
  )
}
