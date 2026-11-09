import { motion } from 'motion/react'
import { useId } from 'react'
import type { SkillState } from '../../academy/types'
import type { TacticKind } from '../../rules/types'
import { bezier } from '../motionTokens'

/** 12×12 line icons, one per tactic, drawn in currentColor. */
const TACTIC_ICON: Record<TacticKind, string> = {
  fork: 'M6 11V6M6 6 2.5 1.5M6 6l3.5-4.5',
  pin: 'M1 6h10M8.5 3v6',
  skewer: 'M1 6h10M4 3.5v5M8 3.5v5',
  discovered: 'M2 10 10 2M5 2h5v5',
  doubleCheck: 'M2 3l3.5 3L2 9M6.5 3 10 6 6.5 9',
  backRank: 'M1 10h10M3 10V5M6 10V3.5M9 10V5',
  sacrifice: 'M6 1.5v8M2.5 6.5 6 10l3.5-3.5',
}

interface MedallionProps {
  readonly state: SkillState
  /** 1-based position in the curriculum, shown until the skill is mastered. */
  readonly ordinal: number
  readonly size: number
  readonly tactic?: TacticKind
  readonly reduced: boolean
}

/**
 * One skill's seal. Each state has its own shape, not just its own colour:
 * later is a hairline ring, recommended a double brass ring with a halo,
 * in progress is half filled, mastered is solid brass with a check.
 */
export function SkillMedallion({ state, ordinal, size, tactic, reduced }: MedallionProps) {
  const clip = useId()
  const num = String(ordinal).padStart(2, '0')
  const text = (cls: string) =>
    ordinal > 0 && (
    <text x="26" y="26" dy="0.36em" textAnchor="middle" className={`font-mono ${cls}`} style={{ fontSize: 11, letterSpacing: '0.04em' }}>
      {num}
    </text>
    )

  return (
    <span aria-hidden className="relative block shrink-0" style={{ width: size, height: size }}>
      {state === 'recommended' && (
        <motion.span
          className={`absolute rounded-full ${size < 30 ? '-inset-0.5' : '-inset-1.5'} border border-accent/50 shadow-glow`}
          initial={false}
          animate={reduced ? { opacity: 0.8 } : { opacity: [0.45, 1, 0.45], scale: [0.97, 1.03, 0.97] }}
          transition={reduced ? { duration: 0 } : { duration: 3.2, ease: bezier('soft'), repeat: Infinity }}
        />
      )}
      <svg viewBox="0 0 52 52" width={size} height={size} className="relative block overflow-visible">
        {state === 'later' && (
          <>
            <circle cx="26" cy="26" r="24.5" className="fill-surface stroke-line-strong" strokeWidth="1.25" />
            {text('fill-text-muted')}
          </>
        )}
        {state === 'recommended' && (
          <>
            <circle cx="26" cy="26" r="24.5" className="fill-surface stroke-accent-strong" strokeWidth="2" />
            <circle cx="26" cy="26" r="19.5" className="fill-none stroke-accent" strokeWidth="0.75" strokeDasharray="1.5 2.5" />
            {text('fill-accent-strong font-semibold')}
          </>
        )}
        {state === 'inProgress' && (
          <>
            <defs>
              <clipPath id={clip}>
                <rect x="0" y="26" width="52" height="26" />
              </clipPath>
            </defs>
            <circle cx="26" cy="26" r="24.5" className="fill-surface" />
            <circle cx="26" cy="26" r="24.5" className="fill-accent/45" clipPath={`url(#${clip})`} />
            <line x1="2" y1="26" x2="50" y2="26" className="stroke-accent-strong" strokeWidth="1" />
            <circle cx="26" cy="26" r="24.5" className="fill-none stroke-accent-strong" strokeWidth="1.5" />
            {text('fill-text font-semibold')}
          </>
        )}
        {state === 'mastered' && (
          <>
            <circle cx="26" cy="26" r="25" className="fill-accent-strong" />
            <circle cx="26" cy="26" r="20.5" className="fill-none stroke-accent-ink/25" strokeWidth="0.75" />
            <path d="M17.5 26.5l6 6 11-12" className="fill-none stroke-accent-ink" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
      {tactic && (
        <span
          className="absolute -right-1 -top-1 grid place-items-center rounded-full border border-line-strong bg-surface2 text-text-muted"
          style={{ width: Math.round(size * 0.38), height: Math.round(size * 0.38) }}
        >
          <svg viewBox="0 0 12 12" className="size-[60%]" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d={TACTIC_ICON[tactic]} />
          </svg>
        </span>
      )}
    </span>
  )
}
