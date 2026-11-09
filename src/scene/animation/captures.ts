import * as THREE from 'three'
import { gEase, gsap } from '../../motion/ease'
import type { CaptureStyle } from '../choreo/types'
import type { GhostHandle } from '../choreo/registry'
import { BASE_RADIUS, PIECE_HEIGHT } from '../pieces/profiles'
import { installBurn } from './burn'
import { leanEuler } from './path'
import { tipPose } from './pivot'

export interface CaptureContext {
  readonly ghost: GhostHandle
  /** Unit XZ direction of the attack. */
  readonly direction: readonly [number, number]
  /** Registers teardown for objects the capture adds, so a reset can remove them mid-flight. */
  readonly track: (cleanup: () => void) => void
}

type Capture = (ctx: CaptureContext) => gsap.core.Timeline

const fadeOut = (tl: gsap.core.Timeline, g: GhostHandle, at: number, duration: number) =>
  tl.to(g.materials, { opacity: 0, duration, ease: gEase('exit') }, at)

const fade: Capture = ({ ghost }) => fadeOut(gsap.timeline(), ghost, 0, 0.16)

const shatter: Capture = ({ ghost }) => gsap.timeline().set(ghost.group, { visible: false }, 0).set({}, {}, 0.05)

/** Centre-to-centre distance at which two piece footprints (about 0.3 radius each) stop overlapping. */
const KNOCK = 0.62

const topple: Capture = ({ ghost, direction: [dx, dz] }) => {
  const base = ghost.group.position.clone()
  const rest = base.clone()
  const pose = { a: 0, y: 0, d: 0 }
  const r = BASE_RADIUS[ghost.type]
  const apply = () => {
    rest.set(base.x + dx * pose.d, base.y + pose.y, base.z + dz * pose.d)
    tipPose(ghost.group, rest, dx, dz, r, pose.a)
  }
  const tl = gsap.timeline()
  // Struck first, then it falls: the knock clears the attacker's footprint before the body tips over it.
  tl.to(pose, { d: KNOCK, duration: 0.18, ease: 'power3.out', onUpdate: apply }, 0)
  tl.to(pose, { a: 1.38, duration: 0.34, ease: 'power2.in', onUpdate: apply }, 0.04)
  tl.to(pose, { a: 1.2, duration: 0.09, ease: 'power1.out', onUpdate: apply })
  tl.to(pose, { a: 1.38, duration: 0.11, ease: 'power1.in', onUpdate: apply })
  tl.to(pose, { y: -0.35, duration: 0.34, ease: 'power2.in', onUpdate: apply }, 0.58)
  return fadeOut(tl, ghost, 0.62, 0.3)
}

const shove: Capture = ({ ghost, direction: [dx, dz] }) => {
  const base = ghost.group.position.clone()
  const rest = base.clone()
  const pose = { d: 0, a: 0 }
  const r = BASE_RADIUS[ghost.type]
  const apply = () => {
    rest.set(base.x + dx * pose.d, base.y, base.z + dz * pose.d)
    tipPose(ghost.group, rest, dx, dz, r, pose.a)
  }
  const tl = gsap.timeline()
  tl.to(pose, { d: 0.9, duration: 0.5, ease: 'power3.out', onUpdate: apply }, 0)
  tl.to(pose, { a: 1.35, duration: 0.3, ease: 'power2.in', onUpdate: apply }, 0.32)
  return fadeOut(tl, ghost, 0.55, 0.32)
}

const slice: Capture = ({ ghost, direction: [dx, dz], track }) => {
  const { group, mesh } = ghost
  const tilt = (30 * Math.PI) / 180
  const n = new THREE.Vector3(-dz * Math.cos(tilt), Math.sin(tilt), dx * Math.cos(tilt)).normalize()
  const center = group.position.clone().add(new THREE.Vector3(0, PIECE_HEIGHT[ghost.type] * 0.5, 0))
  const planeA = new THREE.Plane().setFromNormalAndCoplanarPoint(n, center)
  const planeB = planeA.clone().negate()
  const cA = planeA.constant
  const cB = planeB.constant
  const matsA = ghost.materials
  const matsB = matsA.map((m) => m.clone())
  const all = [...matsA, ...matsB]

  const half = (mats: THREE.Material[]) => {
    const g = new THREE.Group()
    const m = mesh.clone()
    m.material = mats
    g.add(m)
    g.visible = false
    group.add(g)
    return g
  }
  const a = half([...matsA])
  const b = half(matsB)
  // The attacker now stands on this square, so both halves must leave its footprint:
  // the upper half rides the blade down the cut, the lower half is knocked off the other side.
  const down = new THREE.Vector3(0, -1, 0).addScaledVector(n, Math.sin(tilt)).normalize()
  const slideA = new THREE.Vector3(dx, 0, dz).multiplyScalar(0.45).addScaledVector(down, 0.14)
  const slideB = new THREE.Vector3(dz, 0, -dx).multiplyScalar(0.38)
  const pose = { s: 0, drop: 0, sink: 0 }
  const apply = () => {
    a.position.set(slideA.x * pose.s, slideA.y * pose.s - pose.drop, slideA.z * pose.s)
    b.position.set(slideB.x * pose.s, -pose.sink, slideB.z * pose.s)
    planeA.constant = cA - n.dot(a.position)
    planeB.constant = cB + n.dot(b.position)
  }
  const cleanup = () => {
    group.remove(a, b)
    matsB.forEach((m) => m.dispose())
  }
  track(cleanup)
  const tl = gsap.timeline()
  tl.call(() => {
    matsA.forEach((m) => (m.clippingPlanes = [planeA]))
    matsB.forEach((m) => (m.clippingPlanes = [planeB]))
    all.forEach((m) => (m.clipShadows = true))
    a.visible = true
    b.visible = true
    mesh.visible = false
  }, undefined, 0)
  tl.to(pose, { s: 1, duration: 0.42, ease: 'power2.out', onUpdate: apply }, 0.04)
  tl.to(pose, { drop: 0.3, duration: 0.36, ease: 'power2.in', onUpdate: apply }, 0.42)
  tl.to(pose, { sink: 0.12, duration: 0.5, ease: 'power1.in', onUpdate: apply }, 0.32)
  tl.to(all, { opacity: 0, duration: 0.38, ease: gEase('exit') }, 0.46)
  tl.call(cleanup, undefined, 0.86)
  return tl
}

const dissolve: Capture = ({ ghost, direction: [dx, dz] }) => {
  const uniforms = { uBurn: { value: 0 }, uBurnColor: { value: new THREE.Color('#ff8a3d') } }
  const tl = gsap.timeline()
  tl.call(() => ghost.materials.forEach((m) => installBurn(m, uniforms)), undefined, 0)
  tl.to(uniforms.uBurn, { value: 1.02, duration: 0.85, ease: 'power1.in' }, 0)
  // Knocked back off the square so the burn is not hidden inside the queen.
  const p = ghost.group.position
  tl.to(p, { x: p.x + dx * 0.5, z: p.z + dz * 0.5, duration: 0.4, ease: 'power3.out' }, 0)
  tl.to(p, { y: p.y + 0.06, duration: 0.85, ease: 'sine.out' }, 0)
  return tl
}

const dismiss: Capture = ({ ghost, direction: [dx, dz] }) => {
  // Bows toward the attacker.
  const bow = leanEuler(-dx, -dz, 0.2)
  const p = ghost.group.position
  const tl = gsap.timeline()
  tl.to(p, { x: p.x + dx * 0.5, z: p.z + dz * 0.5, duration: 0.3, ease: 'power2.out' }, 0)
  tl.to(ghost.group.rotation, { x: bow.x, z: bow.z, duration: 0.24, ease: gEase('soft') }, 0.06)
  tl.to(ghost.group.position, { y: '-=0.6', duration: 0.6, ease: 'power2.in' }, 0.26)
  return fadeOut(tl, ghost, 0.36, 0.5)
}

const styles: Record<CaptureStyle, Capture> = { topple, shatter, slice, shove, dissolve, dismiss, fade }

/** The captured piece's exit; the ghost unmounts when it ends. */
export function captureTimeline(style: CaptureStyle, ctx: CaptureContext): gsap.core.Timeline {
  ctx.ghost.claimed = true
  const tl = styles[style](ctx)
  return tl.call(() => ctx.ghost.remove())
}

/** Every object a capture tweens directly, for killing tweens on reset. */
export function ghostTargets(g: GhostHandle): object[] {
  return [g.group, g.group.position, g.group.rotation, ...g.materials]
}
