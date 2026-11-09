import { Html } from '@react-three/drei'
import { useEffect, useRef, type CSSProperties } from 'react'
import { cssBezier } from '../../design/tokens'
import { TACTIC_LABEL } from '../../rules/tacticNames'
import { useSettings } from '../../store/settings'
import { squareToPosition } from '../coords'
import { useLife, type FxProps } from './life'

/** Height above the board where the word floats (above the tallest piece). */
const LIFT = 1.45
const EXIT_EARLY_MS = 160

const wrap: CSSProperties = {
  pointerEvents: 'none',
  userSelect: 'none',
  display: 'grid',
  justifyItems: 'center',
  gap: '0.15em',
  opacity: 0,
  fontSize: 'clamp(1.6rem, 3.6vw + 0.6rem, 3.25rem)',
  letterSpacing: '0.07em',
}

// Brass gradient lettering; a tight dark shadow keeps it legible over light squares, a soft glow over dark ones.
const word: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 650,
  lineHeight: 1,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  backgroundImage: 'linear-gradient(180deg, color-mix(in oklab, var(--c-accent-strong) 55%, white) 0%, var(--c-accent-strong) 42%, var(--c-accent) 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  filter:
    'drop-shadow(0 1px 1px rgb(20 14 6 / 0.75)) drop-shadow(0 0 16px color-mix(in srgb, var(--c-accent) 55%, transparent))',
}

const rule: CSSProperties = {
  width: '70%',
  height: '2px',
  borderRadius: '2px',
  background: 'linear-gradient(90deg, transparent, var(--c-accent-strong), transparent)',
  transformOrigin: '50% 50%',
}

/**
 * The tactic's name over its anchor square. DOM, not geometry, so the display face stays crisp and
 * follows the theme. Hidden from assistive tech: the Announcer already speaks it.
 */
export function Callout({ event, startedAt, ending, onDone }: FxProps<'callout'>) {
  const reduced = useSettings((s) => s.reducedMotion)
  const box = useRef<HTMLDivElement>(null)
  const line = useRef<HTMLDivElement>(null)
  const [x, , z] = squareToPosition(event.square)
  const ms = event.duration * 1000

  useLife(startedAt, event.duration, onDone, () => {})

  useEffect(() => {
    const el = box.current
    const bar = line.current
    if (!el || !bar) return
    const opts = { duration: ms, fill: 'forwards' as const }
    const anims = reduced
      ? [el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], opts)]
      : [
          el.animate(
            [
              { offset: 0, opacity: 0, transform: 'translateY(16px) scale(0.7)', letterSpacing: '0.3em', easing: cssBezier('overshoot') },
              { offset: 0.2, opacity: 1, transform: 'translateY(0) scale(1)', letterSpacing: '0.07em' },
              { offset: 0.78, opacity: 1, transform: 'translateY(-5px) scale(1)', letterSpacing: '0.07em', easing: cssBezier('exit') },
              { offset: 1, opacity: 0, transform: 'translateY(-16px) scale(0.97)', letterSpacing: '0.1em' },
            ],
            opts,
          ),
          bar.animate(
            [
              { offset: 0, transform: 'scaleX(0)', opacity: 0, easing: cssBezier('enter') },
              { offset: 0.08, transform: 'scaleX(0)', opacity: 0, easing: cssBezier('enter') },
              { offset: 0.34, transform: 'scaleX(1)', opacity: 1 },
              { offset: 1, transform: 'scaleX(1)', opacity: 1 },
            ],
            opts,
          ),
        ]
    return () => anims.forEach((a) => a.cancel())
  }, [ms, reduced])

  // A new move clears the stage: leave quickly instead of finishing the hold.
  useEffect(() => {
    const el = box.current
    if (!ending || !el) return
    const from = getComputedStyle(el).opacity
    el.getAnimations().forEach((a) => a.pause())
    const a = el.animate([{ opacity: from }, { opacity: 0 }], { duration: EXIT_EARLY_MS, easing: cssBezier('exit'), fill: 'forwards' })
    a.onfinish = onDone
  }, [ending, onDone])

  return (
    <Html position={[x, LIFT, z]} center zIndexRange={[9, 0]} pointerEvents="none">
      <div ref={box} style={wrap} aria-hidden="true">
        <div style={word}>{TACTIC_LABEL[event.tactic.kind]}</div>
        <div ref={line} style={rule} />
      </div>
    </Html>
  )
}
