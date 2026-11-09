import type * as THREE from 'three'
import { gDur, gEase, gsap } from '../../motion/ease'
import type { Vec3 } from '../coords'

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
