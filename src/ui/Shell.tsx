import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { useSettings } from '../store/settings'
import { Announcer } from './a11y/Announcer'
import { useKeyboardPlay } from './a11y/useKeyboardPlay'
import { GameOverOverlay } from './GameOverOverlay'
import { GamePanel } from './panel/GamePanel'
import { PromotionPicker } from './PromotionPicker'
import { PlayWordmark } from './Wordmark'
import './ui.css'

interface ShellProps {
  readonly board: ReactNode
}

export function Shell({ board }: ShellProps) {
  const reducedMotion = useSettings((s) => s.reducedMotion)
  const keyboard = useKeyboardPlay()

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-bg app-bg text-text lg:flex-row">
        {/* Explicit height on phones, flex fill on desktop: the canvas needs a sized parent.
            On phones the panel below overlaps the board's empty bottom edge by 12px, like a sheet. */}
        <main className="relative h-[60dvh] min-h-0 w-full shrink-0 lg:h-auto lg:min-w-0 lg:flex-1 lg:shrink">
          <div
            tabIndex={0}
            role="application"
            aria-label="Chess board, use arrow keys to move the cursor, Enter to select"
            className="absolute inset-0 touch-none outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-focus"
            {...keyboard}
          >
            {board}
          </div>
          <PlayWordmark />
          <PromotionPicker />
          <GameOverOverlay />
        </main>
        <aside
          aria-label="Game"
          className="glass atelier-scroll relative z-10 -mt-3 min-h-0 w-full flex-1 overflow-y-auto rounded-t-md border-t border-line-strong bg-surface shadow-lg lg:my-4 lg:mr-4 lg:mt-4 lg:w-[372px] lg:flex-none lg:rounded-md lg:border"
        >
          <GamePanel />
        </aside>
        <Announcer />
      </div>
    </MotionConfig>
  )
}
