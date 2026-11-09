import { AnimatePresence, motion } from 'motion/react'
import { useRef, type KeyboardEvent } from 'react'
import type { MoveIntent } from '../rules/types'
import { useGame } from '../store/game'
import { glyph } from './glyphs'
import { bezier, sec } from './motionTokens'
import { labelClass } from './styles'
import { useFocusTrap } from './useFocusTrap'

type Choice = NonNullable<MoveIntent['promotion']>

const CHOICES: readonly { piece: Choice; name: string }[] = [
  { piece: 'q', name: 'Queen' },
  { piece: 'r', name: 'Rook' },
  { piece: 'b', name: 'Bishop' },
  { piece: 'n', name: 'Knight' },
]

const MOVE_KEYS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

function PromotionDialog() {
  const color = useGame((s) => s.turn)
  const choosePromotion = useGame((s) => s.choosePromotion)
  const cancelPromotion = useGame((s) => s.cancelPromotion)
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, cancelPromotion)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
    const index = buttons.findIndex((b) => b === document.activeElement)
    const delta = MOVE_KEYS[event.key]
    if (delta !== undefined) {
      event.preventDefault()
      buttons[(index + delta + buttons.length) % buttons.length]?.focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      buttons[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      buttons.at(-1)?.focus()
    }
  }

  return (
    <motion.div
      className="absolute inset-0 z-20 grid place-items-center bg-bg/70 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: sec('base'), ease: bezier('standard') }}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Promote pawn. Choose a piece."
        tabIndex={-1}
        onKeyDown={onKeyDown}
        initial={{ y: 12, scale: 0.98 }}
        animate={{ y: 0, scale: 1, transition: { duration: sec('slow'), ease: bezier('enter') } }}
        exit={{ y: 6, transition: { duration: sec('fast'), ease: bezier('exit') } }}
        className="max-w-full rounded-xs border border-line-strong bg-surface p-5 shadow-lg outline-none"
      >
        <p className={`${labelClass} m-0 mb-4`}>Promote to</p>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {CHOICES.map(({ piece, name }, i) => (
            <button
              key={piece}
              type="button"
              data-autofocus={i === 0 ? '' : undefined}
              aria-label={name}
              onClick={() => choosePromotion(piece)}
              className="group flex size-[4.25rem] flex-col items-center justify-center gap-1 rounded-xs border border-line text-text transition-[background-color,border-color,transform] duration-fast ease-standard hover:border-accent hover:bg-surface2 active:scale-[0.97] active:bg-surface3 sm:size-24"
            >
              <span aria-hidden className="font-display text-4xl leading-none sm:text-5xl">
                {glyph(color, piece)}
              </span>
              <span aria-hidden className={`${labelClass} text-[0.625rem] tracking-[0.12em] group-hover:text-text`}>
                {name}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

export function PromotionPicker() {
  const pending = useGame((s) => s.pendingPromotion !== null)
  return <AnimatePresence>{pending && <PromotionDialog key="promotion" />}</AnimatePresence>
}
