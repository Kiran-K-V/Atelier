import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { gsap } from '../../motion/ease'
import type { EaseToken } from '../../design/tokens'
import type { FxEvent } from '../choreo/types'

export interface FxProps<T extends FxEvent['type']> {
  readonly event: Extract<FxEvent, { type: T }>
  /** Clock time (s) when the event arrived. */
  readonly startedAt: number
  /** Particle count multiplier for the quality tier (1 or 0.5). */
  readonly density: number
  /** Set by FxLayer when a persistent effect should fade out. */
  readonly ending: boolean
  readonly onDone: () => void
}

/** Token ease as a plain function of progress, for frame-driven effects. */
export function easeFn(token: EaseToken): (t: number) => number {
  return gsap.parseEase(token)
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/**
 * Drives an effect from the render clock: `update(t)` gets seconds since start every frame;
 * `onDone` fires once when `t` passes `duration`.
 */
export function useLife(startedAt: number, duration: number, onDone: () => void, update: (t: number) => void): void {
  const done = useRef(false)
  useFrame(({ clock }) => {
    if (done.current) return
    const t = Math.max(0, clock.elapsedTime - startedAt)
    update(Math.min(t, duration))
    if (t >= duration) {
      done.current = true
      onDone()
    }
  })
}

/** Creates a GPU resource once for the component's life and disposes it on unmount. */
export function useOwned<T extends { dispose: () => void }>(make: () => T): T {
  const [value] = useState(make)
  useEffect(() => () => value.dispose(), [value])
  return value
}
