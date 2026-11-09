import { Html } from '@react-three/drei'
import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { cssBezier } from '../../design/tokens'
import { TACTIC_LABEL } from '../../rules/tacticNames'
import { useSettings } from '../../store/settings'
import { squareToPosition } from '../coords'
import type { FxProps } from './life'

/** Height above the board where the word floats (above the tallest piece). */
const LIFT = 1.45
const EXIT_EARLY_MS = 160
/** Screen margin (px) the label keeps from the canvas edges. */
const EDGE = 12
const projected = new THREE.Vector3()

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
export function Callout({ event, ending, onDone }: FxProps<'callout'>) {
  const reduced = useSettings((s) => s.reducedMotion)
  // Html renders its children in a separate React root, so the node arrives through a callback ref.
  const [el, setEl] = useState<HTMLDivElement | null>(null)
  const [x, , z] = squareToPosition(event.square)
  const ms = event.duration * 1000

  // Centred over the square, but slid inward so a label over an edge file never clips.
  const place = useCallback(
    (obj: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }) => {
      projected.setFromMatrixPosition(obj.matrixWorld).project(camera)
      const x = (projected.x * 0.5 + 0.5) * size.width
      const y = (0.5 - projected.y * 0.5) * size.height
      const hw = Math.min(size.width / 2, (el?.offsetWidth ?? 0) / 2 + EDGE)
      const hh = Math.min(size.height / 2, (el?.offsetHeight ?? 0) / 2 + EDGE)
      return [THREE.MathUtils.clamp(x, hw, size.width - hw), THREE.MathUtils.clamp(y, hh, size.height - hh)]
    },
    [el],
  )

  useEffect(() => {
    const bar = el?.lastElementChild
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
    // The animation is the clock: the label lives exactly as long as it is on screen.
    anims[0].onfinish = onDone
    return () => anims.forEach((a) => a.cancel())
  }, [el, ms, reduced, onDone])

  // A new move clears the stage: leave quickly instead of finishing the hold.
  useEffect(() => {
    if (!ending) return
    if (!el) return onDone()
    const from = getComputedStyle(el).opacity
    el.getAnimations().forEach((a) => a.pause())
    const a = el.animate([{ opacity: from }, { opacity: 0 }], { duration: EXIT_EARLY_MS, easing: cssBezier('exit'), fill: 'forwards' })
    a.onfinish = onDone
  }, [el, ending, onDone])

  return (
    <Html position={[x, LIFT, z]} center calculatePosition={place} zIndexRange={[9, 0]} pointerEvents="none">
      <div ref={setEl} style={wrap} aria-hidden="true">
        <div style={word}>{TACTIC_LABEL[event.tactic.kind]}</div>
        <div style={rule} />
      </div>
    </Html>
  )
}
