import type * as THREE from 'three'
import { gDur, gEase, gsap } from '../../motion/ease'
import type { PieceSymbol } from '../../rules/types'
import type { Vec3 } from '../coords'

export interface MoveTweenContext {
  /** The piece's root group; tweens move it from wherever it is now (board or mid-drag). */
  readonly object: THREE.Object3D
  readonly to: Vec3
  readonly reducedMotion: boolean
}

export type MoveTween = (ctx: MoveTweenContext) => gsap.core.Timeline

/** Phase 1 signature shared by every piece: lift, glide, settle. */
const liftGlideSettle: MoveTween = ({ object, to, reducedMotion }) => {
  const p = object.position
  const tl = gsap.timeline()
  tl.to(object.rotation, { x: 0, z: 0, duration: gDur('fast'), ease: gEase('standard') }, 0)
  if (reducedMotion) return tl.set(p, { x: to[0], y: to[1], z: to[2] }, 0)

  const d = gDur('slow')
  const distance = Math.hypot(to[0] - p.x, to[2] - p.z)
  const peak = Math.max(p.y, Math.min(0.32, 0.14 + 0.03 * distance))
  tl.to(p, { y: peak, duration: d * 0.3, ease: gEase('enter') }, 0)
  tl.to(p, { x: to[0], z: to[2], duration: d * 0.8, ease: gEase('standard') }, d * 0.08)
  tl.to(p, { y: to[1], duration: d * 0.35, ease: gEase('soft') }, d * 0.65)
  return tl
}

/** Per-piece move signatures. Later phases replace entries; callers only use playMoveTween. */
export const moveTweens: Record<PieceSymbol, MoveTween> = {
  p: liftGlideSettle,
  n: liftGlideSettle,
  b: liftGlideSettle,
  r: liftGlideSettle,
  q: liftGlideSettle,
  k: liftGlideSettle,
}

export function playMoveTween(type: PieceSymbol, ctx: MoveTweenContext): gsap.core.Timeline {
  gsap.killTweensOf([ctx.object.position, ctx.object.rotation])
  return moveTweens[type](ctx)
}

export interface CaptureTweenContext {
  readonly object: THREE.Object3D
  /** Per-ghost material clones, faded to zero. */
  readonly materials: readonly THREE.Material[]
  readonly reducedMotion: boolean
}

/** Captured pieces sink into the board and fade as the capturer lands. */
export function playCaptureTween({ object, materials, reducedMotion }: CaptureTweenContext): gsap.core.Timeline {
  const tl = gsap.timeline()
  if (reducedMotion) return tl.to(materials, { opacity: 0, duration: gDur('fast'), ease: gEase('standard') })
  const start = gDur('slow') * 0.5
  tl.to(object.position, { y: -0.22, duration: gDur('base'), ease: gEase('exit') }, start)
  tl.to(materials, { opacity: 0, duration: gDur('base'), ease: gEase('exit') }, start)
  return tl
}

export interface SnapBackContext {
  readonly object: THREE.Object3D
  readonly shake: THREE.Object3D
  readonly to: Vec3
  readonly withShake: boolean
  readonly reducedMotion: boolean
}

/** Rejected drop: return home with a soft overshoot, then a small "no" shake. */
export function playSnapBack({ object, shake, to, withShake, reducedMotion }: SnapBackContext): gsap.core.Timeline {
  gsap.killTweensOf([object.position, object.rotation, shake.position])
  const tl = gsap.timeline()
  if (reducedMotion) {
    shake.position.x = 0
    return tl.set(object.position, { x: to[0], y: to[1], z: to[2] }).set(object.rotation, { x: 0, z: 0 })
  }
  tl.to(object.position, { x: to[0], y: to[1], z: to[2], duration: gDur('base'), ease: gEase('overshoot') }, 0)
  tl.to(object.rotation, { x: 0, z: 0, duration: gDur('base'), ease: gEase('standard') }, 0)
  if (withShake) tl.add(shakeTimeline(shake), gDur('base') * 0.7)
  return tl
}

export function shakeTimeline(shake: THREE.Object3D): gsap.core.Timeline {
  const tl = gsap.timeline()
  const step = gDur('instant') * 0.6
  for (const x of [0.04, -0.032, 0.02, -0.01, 0]) tl.to(shake.position, { x, duration: step, ease: gEase('soft') })
  return tl
}
