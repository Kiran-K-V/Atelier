import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { scene } from '../../design/tokens'
import type { Square, Tactic } from '../../rules/types'
import { useSettings } from '../../store/settings'
import { squareToPosition } from '../coords'
import { PIECE_HEIGHT } from '../pieces/profiles'
import { flatPlane, hdr, particleGeometry, shellGeometry, stripGeometry } from './geometry'
import { clamp01, easeFn, useOwned, type FxProps } from './life'
import type { Point2 } from './path'
import { chainMaterial, particleMaterial, shellMaterial, sigilMaterial, stripMaterial } from './shaders'
import { boardStrip, point2 } from './strip'

/*
 * Tactic lines (T8): each kind reveals bright with its own gesture, dims to a quiet steady state, and
 * holds until the next move. Brass is the mover's attack; red stays reserved for check.
 */

const soft = easeFn('soft')
const enter = easeFn('enter')
const standard = easeFn('standard')
const overshoot = easeFn('overshoot')

/** Bright reveal window (s); every kind finishes its gesture inside it. */
const REVEAL = 0.8
/** Time to settle from bright to steady after the reveal. */
const DIM = 0.7
/** Steady brightness relative to the reveal. */
const STEADY = 0.45
const END_FADE = 0.3
const END_FADE_REDUCED = 0.12
/** Non-primary tactics draw at this share of the primary's intensity (T4). */
const SECONDARY = 0.55

const LINE = hdr(scene.brass, 2.1)
const HEAD = hdr('#fff1d6', 3.2)
const HOT = hdr('#fff8ec', 4.5)
const SPARK = hdr('#ffe2a8', 3.4)
const GHOST = hdr('#e9dfcc', 1.3)
const EMBER = hdr('#a8763f', 1.1)

interface Frame {
  /** Seconds since the tactic arrived. */
  t: number
  /** Clock for travelling shimmer; frozen at 0 under reduced motion. */
  time: number
  reduced: boolean
  /** 0 during the reveal, easing to 1 at steady state. */
  settle: number
  /** Primary weight times the end fade. */
  gain: number
  /** Overall brightness: 1 in the reveal, STEADY when settled, times `gain`. */
  level: number
}

interface PartProps<K extends Tactic['kind']> {
  readonly t: Extract<Tactic, { kind: K }>
  readonly weight: number
  readonly startedAt: number
  readonly density: number
  readonly ending: boolean
  readonly onDone: () => void
}

/** Eased progress through [a, b] seconds of the reveal; complete at once under reduced motion. */
function span(f: Frame, a: number, b: number, ease: (x: number) => number = standard): number {
  return f.reduced ? 1 : ease(clamp01((f.t - a) / (b - a)))
}

/** One-shot flash envelope starting at `a`, `len` long; none under reduced motion. */
function flash(f: Frame, a: number, len: number): number {
  if (f.reduced || f.t < a) return 0
  return 1 - soft(clamp01((f.t - a) / len))
}

function useTacticLife(startedAt: number, ending: boolean, weight: number, onDone: () => void, update: (f: Frame) => void): void {
  const reduced = useSettings((s) => s.reducedMotion)
  const endAt = useRef<number | null>(null)
  const done = useRef(false)
  const frame = useRef<Frame>({ t: 0, time: 0, reduced, settle: 0, gain: 1, level: 1 }).current
  useFrame(({ clock }) => {
    if (done.current) return
    const now = clock.elapsedTime
    if (ending && endAt.current === null) endAt.current = now
    const fade = endAt.current === null ? 1 : 1 - clamp01((now - endAt.current) / (reduced ? END_FADE_REDUCED : END_FADE))
    frame.t = Math.max(0, now - startedAt)
    frame.reduced = reduced
    frame.time = reduced ? 0 : frame.t
    frame.settle = soft(clamp01((frame.t - REVEAL) / DIM))
    frame.gain = weight * fade
    frame.level = (1 - (1 - STEADY) * frame.settle) * frame.gain
    update(frame)
    if (fade <= 0) {
      done.current = true
      onDone()
    }
  })
}

interface SigilLook {
  readonly color: THREE.Color
  readonly radius?: number
  readonly width?: number
  readonly fill?: number
  readonly half?: number
  readonly segments?: number
  readonly gap?: number
  readonly spin?: number
  readonly square?: boolean
}

function sigil(look: SigilLook): THREE.ShaderMaterial {
  const m = sigilMaterial()
  const u = m.uniforms
  u.uColor.value.copy(look.color)
  u.uRadius.value = look.radius ?? 0.4
  u.uWidth.value = look.width ?? 0.03
  u.uFill.value = look.fill ?? 0
  u.uHalf.value = look.half ?? 0.6
  u.uSegments.value = look.segments ?? 0
  u.uGap.value = look.gap ?? 0
  u.uSpin.value = look.spin ?? 0
  u.uSquare.value = look.square ? 1 : 0
  return m
}

interface BeamLook {
  readonly color: THREE.Color
  readonly head: THREE.Color
  readonly core: number
  readonly halo: number
  readonly dash?: number
  readonly tail?: number
}

function beam(length: number, look: BeamLook): THREE.ShaderMaterial {
  const m = stripMaterial()
  const u = m.uniforms
  u.uColor.value.copy(look.color)
  u.uHeadColor.value.copy(look.head)
  u.uLength.value = length
  u.uCore.value = look.core
  u.uHalo.value = look.halo
  u.uDash.value = look.dash ?? 1.6
  u.uTail.value = look.tail ?? 0
  return m
}

const SHADE = new THREE.Color('#140d05')

/**
 * Dark, normally blended backing under a glowing line, sharing its geometry. Additive light alone
 * vanishes on the pale squares; the backing gives it an edge to read against.
 */
function shade(length: number, core: number): THREE.ShaderMaterial {
  const m = stripMaterial()
  m.blending = THREE.NormalBlending
  const u = m.uniforms
  u.uColor.value.copy(SHADE)
  u.uHeadColor.value.copy(SHADE)
  u.uLength.value = length
  u.uCore.value = core
  u.uHalo.value = 0
  return m
}

/** Keeps a backing in step with its line's reveal. */
function follow(backing: THREE.ShaderMaterial, line: THREE.ShaderMaterial, opacity: number): void {
  backing.uniforms.uHead.value = line.uniforms.uHead.value
  backing.uniforms.uBack.value = line.uniforms.uBack?.value ?? -1
  backing.uniforms.uOpacity.value = opacity
}

/** Several GPU resources owned as one, for useOwned. */
function bundle<T extends Record<string, { dispose: () => void } | readonly { dispose: () => void }[]>>(parts: T): T & { dispose: () => void } {
  return {
    ...parts,
    dispose: () => {
      for (const p of Object.values(parts)) for (const r of Array.isArray(p) ? p : [p]) r.dispose()
    },
  }
}

/** Point cloud thrown out from `origin` at `delay`, for sparks and flares. */
function burst(count: number, origin: THREE.Vector3Like, delay: number, speed: number, lift: number, aim?: readonly [number, number]) {
  return particleGeometry(count, (_, p) => {
    const a = aim ? Math.atan2(aim[1], aim[0]) + (Math.random() - 0.5) * 1.1 : Math.random() * Math.PI * 2
    const v = speed * (0.6 + Math.random() * 0.7)
    p.origin.set(origin.x, origin.y, origin.z)
    p.velocity.set(Math.cos(a) * v, lift * (0.4 + Math.random()), Math.sin(a) * v)
    p.meta.set(delay + Math.random() * 0.04, 0.32 + Math.random() * 0.25, 0.03 + Math.random() * 0.03, Math.random())
  })
}

function sparkMaterial(): THREE.ShaderMaterial {
  const m = particleMaterial(true)
  m.uniforms.uColor.value.copy(SPARK)
  m.uniforms.uDrag.value = 4
  m.uniforms.uGravity.value = -1.2
  m.uniforms.uFlicker.value = 1
  m.uniforms.uSoft.value = 2.2
  return m
}

const at = (p: Point2, y: number): [number, number, number] => [p.x, y, p.z]
const Y_LINE = 0.03
const Y_MARK = 0.018

/** Fork: light grows from the attacker, splits with a spark, and branches to every target, each marked by a pulsing reticle. */
function Fork({ t, weight, startedAt, density, ending, onDone }: PartProps<'fork'>) {
  const a = point2(t.attacker)
  const targets = t.targets.map(point2)
  const c = targets.reduce((s, p) => ({ x: s.x + p.x / targets.length, z: s.z + p.z / targets.length }), { x: 0, z: 0 })
  const dist = Math.hypot(c.x - a.x, c.z - a.z)
  const trunkLen = dist > 0.25 ? Math.min(0.45, dist * 0.45) : 0
  const split = trunkLen > 0 ? { x: a.x + ((c.x - a.x) / dist) * trunkLen, z: a.z + ((c.z - a.z) / dist) * trunkLen } : a
  const trunkTime = trunkLen > 0 ? 0.2 : 0
  const branchEnd = trunkTime + 0.38

  const r = useOwned(() => {
    const trunk = boardStrip(a, split, Y_LINE, 0.13, 0)
    const branches = targets.map((p) => boardStrip(split, p, Y_LINE + 0.001, 0.1, 0))
    return bundle({
      trunkGeo: trunk.geometry,
      trunkMat: beam(trunk.length, { color: LINE, head: HEAD, core: 0.32, halo: 0.32 }),
      branchGeo: branches.map((b) => b.geometry),
      branchMat: branches.map((b) => beam(b.length, { color: LINE, head: HEAD, core: 0.28, halo: 0.3 })),
      trunkShade: shade(trunk.length, 0.7),
      branchShade: branches.map((b) => shade(b.length, 0.7)),
      rings: targets.map(() => sigil({ color: hdr(scene.brass, 2.4), radius: 0.4, width: 0.03 })),
      reticles: targets.map(() => sigil({ color: HEAD, radius: 0.31, width: 0.016, segments: 4, gap: 0.55, spin: Math.PI / 4 })),
      splitMat: sigil({ color: HOT, radius: 0.05, width: 0.05, fill: 1 }),
      sparkGeo: burst(Math.round(18 * density), { x: split.x, y: 0.05, z: split.z }, trunkTime, 1.6, 0.6),
      sparkMat: sparkMaterial(),
    })
  })

  useTacticLife(startedAt, ending, weight, onDone, (f) => {
    const tu = r.trunkMat.uniforms
    tu.uHead.value = 1.02 * span(f, 0, Math.max(0.01, trunkTime), enter)
    tu.uOpacity.value = f.level
    follow(r.trunkShade, r.trunkMat, 0.3 * f.gain)
    const grow = span(f, trunkTime, branchEnd, soft)
    r.branchMat.forEach((m, i) => {
      m.uniforms.uHead.value = 1.02 * grow
      m.uniforms.uOpacity.value = f.level
      m.uniforms.uFlow.value = f.reduced ? 0 : 0.6
      m.uniforms.uTime.value = f.time
      follow(r.branchShade[i], m, 0.3 * f.gain)
    })
    const land = span(f, branchEnd - 0.06, branchEnd + 0.2, overshoot)
    r.rings.forEach((m, i) => {
      const pulse = f.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(f.t * 4.2 + i * 1.7)
      m.uniforms.uRadius.value = (0.3 + 0.1 * land) + 0.03 * pulse
      m.uniforms.uOpacity.value = f.level * clamp01(land) * (0.6 + 0.4 * pulse)
      m.uniforms.uFill.value = 0.25 * flash(f, branchEnd, 0.4)
    })
    r.reticles.forEach((m) => {
      m.uniforms.uSpin.value = Math.PI / 4 + f.time * 0.6
      m.uniforms.uOpacity.value = 0.8 * f.level * clamp01(land)
    })
    const pop = flash(f, trunkTime, 0.35)
    r.splitMat.uniforms.uRadius.value = 0.05 + 0.2 * (1 - pop)
    r.splitMat.uniforms.uOpacity.value = pop * f.gain
    r.sparkMat.uniforms.uTime.value = f.t
    r.sparkMat.uniforms.uOpacity.value = f.reduced ? 0 : f.gain
  })

  return (
    <group>
      {trunkLen > 0 && <mesh geometry={r.trunkGeo} material={r.trunkShade} renderOrder={2} />}
      {trunkLen > 0 && <mesh geometry={r.trunkGeo} material={r.trunkMat} renderOrder={4} />}
      {r.branchGeo.map((g, i) => (
        <group key={i}>
          <mesh geometry={g} material={r.branchShade[i]} renderOrder={2} />
          <mesh geometry={g} material={r.branchMat[i]} renderOrder={4} />
        </group>
      ))}
      {targets.map((p, i) => (
        <group key={i} position={at(p, Y_MARK)}>
          <mesh geometry={flatPlane()} material={r.rings[i]} scale={1.2} renderOrder={3} />
          <mesh geometry={flatPlane()} material={r.reticles[i]} scale={1.2} position-y={0.001} renderOrder={3} />
        </group>
      ))}
      <mesh geometry={flatPlane()} material={r.splitMat} position={at(split, Y_LINE + 0.004)} scale={1.2} renderOrder={5} />
      <points geometry={r.sparkGeo} material={r.sparkMat} frustumCulled={false} />
    </group>
  )
}

/** Pin: a taut chain of light links from attacker through the pinned piece to what it shields; a lock clamps shut on the pinned piece. */
function Pin({ t, weight, startedAt, ending, onDone }: PartProps<'pin'>) {
  const a = point2(t.attacker)
  const pinned = point2(t.pinned)
  const behind = point2(t.behind)
  const r = useOwned(() => {
    const chain = boardStrip(a, behind, Y_LINE, 0.1, 0)
    const m = chainMaterial()
    const u = m.uniforms
    u.uColor.value.copy(hdr(scene.brass, t.absolute ? 2.5 : 2.1))
    u.uHotColor.value.copy(HOT)
    u.uLength.value = chain.length
    u.uLinkLen.value = 0.2
    u.uHalfW.value = 0.1
    return bundle({
      chainGeo: chain.geometry,
      chainMat: m,
      chainShade: shade(chain.length, 0.8),
      lock: sigil({ color: hdr(scene.brass, 2.6), radius: 0.41, width: 0.034, segments: 4, gap: 0.7 }),
      inner: sigil({ color: HEAD, radius: 0.32, width: 0.016 }),
      shield: sigil({ color: hdr(scene.brass, 1.6), radius: 0.36, width: 0.02, segments: t.absolute ? 0 : 6, gap: 0.3 }),
    })
  })
  useTacticLife(startedAt, ending, weight, onDone, (f) => {
    const cu = r.chainMat.uniforms
    cu.uHead.value = 1.02 * span(f, 0, 0.5)
    cu.uOpacity.value = f.level
    cu.uTime.value = f.time
    cu.uShimmer.value = f.reduced ? 0 : 1
    follow(r.chainShade, r.chainMat, 0.35 * f.gain)
    const lock = span(f, 0.38, 0.7, overshoot)
    const lu = r.lock.uniforms
    lu.uGap.value = Math.max(0.06, 0.7 - 0.58 * lock)
    lu.uSpin.value = Math.PI / 4 + (1 - lock) * (Math.PI / 4)
    lu.uOpacity.value = f.level * clamp01(span(f, 0.3, 0.45))
    r.inner.uniforms.uOpacity.value = f.level * clamp01(lock) * 0.8
    r.inner.uniforms.uFill.value = 0.35 * flash(f, 0.66, 0.35)
    r.shield.uniforms.uOpacity.value = 0.6 * f.level * span(f, 0.42, 0.6)
  })
  return (
    <group>
      <mesh geometry={r.chainGeo} material={r.chainShade} renderOrder={2} />
      <mesh geometry={r.chainGeo} material={r.chainMat} renderOrder={4} />
      <group position={at(pinned, Y_MARK)}>
        <mesh geometry={flatPlane()} material={r.lock} scale={1.2} renderOrder={3} />
        <mesh geometry={flatPlane()} material={r.inner} scale={1.2} position-y={0.001} renderOrder={3} />
      </group>
      <mesh geometry={flatPlane()} material={r.shield} position={at(behind, Y_MARK)} scale={1.2} renderOrder={3} />
    </group>
  )
}

const BEAM_Y = 0.3

/** Progress k in [0, 1] at which `ease(k)` first reaches `value`. */
function timeToReach(ease: (x: number) => number, value: number): number {
  for (let k = 0; k <= 1; k += 0.01) if (ease(k) >= value) return k
  return 1
}

/** Skewer: a thin white-hot beam fired at piece height, through the front piece (flash) and on to the one behind. */
function Skewer({ t, weight, startedAt, density, ending, onDone }: PartProps<'skewer'>) {
  const a = point2(t.attacker)
  const front = point2(t.front)
  const behind = point2(t.behind)
  const total = Math.hypot(behind.x - a.x, behind.z - a.z) || 1
  const uFront = Math.hypot(front.x - a.x, front.z - a.z) / total
  const dir: readonly [number, number] = [(behind.x - a.x) / total, (behind.z - a.z) / total]
  const shoot = 0.26
  const hitAt = shoot * timeToReach(enter, uFront / 1.02)
  const r = useOwned(() => {
    const high = boardStrip(a, behind, BEAM_Y, 0.035, 0)
    const low = boardStrip(a, behind, 0.022, 0.07, 0)
    return bundle({
      highGeo: high.geometry,
      highMat: beam(high.length, { color: hdr('#ffd99a', 2.8), head: hdr('#fffaf0', 6), core: 0.3, halo: 0.22 }),
      lowGeo: low.geometry,
      lowMat: beam(low.length, { color: hdr(scene.brass, 1.5), head: HEAD, core: 0.25, halo: 0.25 }),
      lowShade: shade(low.length, 0.6),
      shell: (() => {
        const m = shellMaterial()
        m.uniforms.uColor.value.copy(HOT)
        m.uniforms.uTopColor.value.copy(hdr(scene.brass, 1.2))
        return m
      })(),
      pierce: sigil({ color: hdr(scene.brass, 2.4), radius: 0.4, width: 0.03, segments: 2, gap: 0.28, spin: Math.atan2(dir[1], dir[0]) }),
      sprayGeo: burst(Math.round(16 * density), { x: front.x, y: BEAM_Y, z: front.z }, hitAt, 2.2, 0.5, dir),
      sprayMat: sparkMaterial(),
    })
  })
  useTacticLife(startedAt, ending, weight, onDone, (f) => {
    const head = 1.02 * span(f, 0, shoot, enter)
    const hit = flash(f, hitAt, 0.4)
    const hu = r.highMat.uniforms
    hu.uHead.value = head
    hu.uOpacity.value = f.level * (1 + 0.5 * hit)
    const lu = r.lowMat.uniforms
    lu.uHead.value = head
    lu.uOpacity.value = 0.4 * f.level
    follow(r.lowShade, r.lowMat, 0.25 * f.gain)
    const su = r.shell.uniforms
    su.uOpacity.value = 0.7 * hit * f.gain
    su.uRise.value = 0.6 + 0.4 * (1 - hit)
    su.uTime.value = f.t
    r.pierce.uniforms.uOpacity.value = f.level * (f.reduced ? 1 : clamp01((f.t - hitAt) / 0.1))
    r.pierce.uniforms.uFill.value = 0.3 * hit
    r.sprayMat.uniforms.uTime.value = f.t
    r.sprayMat.uniforms.uOpacity.value = f.reduced ? 0 : f.gain
  })
  return (
    <group>
      <mesh geometry={r.highGeo} material={r.highMat} renderOrder={5} />
      <mesh geometry={r.lowGeo} material={r.lowShade} renderOrder={2} />
      <mesh geometry={r.lowGeo} material={r.lowMat} renderOrder={3} />
      <mesh geometry={shellGeometry()} material={r.shell} position={at(front, 0)} scale={[0.42, 0.8, 0.42]} renderOrder={4} />
      <mesh geometry={flatPlane()} material={r.pierce} position={at(front, Y_MARK)} scale={1.2} renderOrder={3} />
      <points geometry={r.sprayGeo} material={r.sprayMat} frustumCulled={false} />
    </group>
  )
}

const CURTAIN_H = 0.7

/** Vertical light sheet standing on the board along a→b; its glow peaks at the floor and fades upward. */
function curtainGeometry(a: Point2, b: Point2): THREE.BufferGeometry {
  const length = Math.hypot(b.x - a.x, b.z - a.z)
  return stripGeometry(Math.max(8, Math.ceil(length * 12)), (u, center, side) => {
    center.set(a.x + (b.x - a.x) * u, 0.005, a.z + (b.z - a.z) * u)
    // The lower half sits under the board and is hidden by depth, so the sheet rises from the line.
    side.set(0, CURTAIN_H, 0)
  })
}

/** Discovered attack: the line unveils outward from the square the moved piece left, a curtain of light lifting off it; a ghost ring marks the vacated square. */
function Discovered({ t, weight, startedAt, ending, onDone }: PartProps<'discovered'>) {
  const a = point2(t.attacker)
  const target = point2(t.target)
  const vac = point2(t.vacated)
  const len = Math.hypot(target.x - a.x, target.z - a.z) || 1
  const origin = clamp01(((vac.x - a.x) * (target.x - a.x) + (vac.z - a.z) * (target.z - a.z)) / (len * len))
  const r = useOwned(() => {
    const line = boardStrip(a, target, Y_LINE, 0.11, 0)
    return bundle({
      lineGeo: line.geometry,
      lineMat: beam(line.length, { color: LINE, head: HEAD, core: 0.3, halo: 0.32 }),
      lineShade: shade(line.length, 0.7),
      curtainGeo: curtainGeometry(a, target),
      curtainMat: (() => {
        const m = beam(len, { color: hdr(scene.brass, 1.4), head: HEAD, core: 0.05, halo: 0.75 })
        m.uniforms.uWave.value = 0.08
        return m
      })(),
      ghost: sigil({ color: GHOST, radius: 0.36, width: 0.022, segments: 10, gap: 0.45 }),
      echo: sigil({ color: GHOST, radius: 0.2, width: 0.05 }),
      mark: sigil({ color: hdr(scene.brass, 2.4), radius: 0.4, width: 0.03 }),
    })
  })
  useTacticLife(startedAt, ending, weight, onDone, (f) => {
    const p = span(f, 0, 0.6, soft)
    // A discovered check already has its red line on this path; the brass reveal then gives way to it.
    const hold = t.check ? f.level * (1 - f.settle) : f.level
    for (const m of [r.lineMat, r.curtainMat]) {
      m.uniforms.uHead.value = origin + (1.02 - origin) * p
      m.uniforms.uBack.value = origin - (origin + 0.02) * p
      m.uniforms.uTime.value = f.time
    }
    r.lineMat.uniforms.uOpacity.value = hold
    follow(r.lineShade, r.lineMat, 0.3 * (t.check ? hold : f.gain))
    r.curtainMat.uniforms.uOpacity.value = f.reduced ? 0 : 0.8 * f.gain * (1 - span(f, 0.45, 1.1, soft))
    r.ghost.uniforms.uSpin.value = f.time * 0.35
    r.ghost.uniforms.uOpacity.value = 0.85 * f.level
    const e = flash(f, 0, 0.55)
    r.echo.uniforms.uRadius.value = 0.2 + 0.35 * (1 - e)
    r.echo.uniforms.uOpacity.value = e * f.gain
    r.mark.uniforms.uOpacity.value = t.check ? 0 : f.level * span(f, 0.45, 0.65)
  })
  return (
    <group>
      <mesh geometry={r.lineGeo} material={r.lineShade} renderOrder={2} />
      <mesh geometry={r.lineGeo} material={r.lineMat} renderOrder={4} />
      <mesh geometry={r.curtainGeo} material={r.curtainMat} renderOrder={4} />
      <group position={at(vac, Y_MARK)}>
        <mesh geometry={flatPlane()} material={r.ghost} scale={1.2} renderOrder={3} />
        <mesh geometry={flatPlane()} material={r.echo} scale={1.2} position-y={0.001} renderOrder={3} />
      </group>
      <mesh geometry={flatPlane()} material={r.mark} position={at(target, Y_MARK)} scale={1.2} renderOrder={3} />
    </group>
  )
}

const COMET = 0.42

/** Double check: two brass comets ride the red check lines into the king and meet in a flare; a crown of light settles above it. */
function DoubleCheck({ t, weight, startedAt, density, ending, onDone }: PartProps<'doubleCheck'>) {
  const king = point2(t.king)
  const crownY = PIECE_HEIGHT.k + 0.1
  const r = useOwned(() => {
    const comets = t.checkers.map((c) => boardStrip(point2(c), king, 0.075, 0.07, 0))
    return bundle({
      cometGeo: comets.map((c) => c.geometry),
      cometMat: comets.map((c) => beam(c.length, { color: hdr('#ffdca0', 2.6), head: HOT, core: 0.3, halo: 0.25, tail: 0.35 })),
      flare: sigil({ color: HOT, radius: 0.1, width: 0.08, fill: 1, half: 1 }),
      flareGeo: burst(Math.round(26 * density), { x: king.x, y: 0.45, z: king.z }, COMET, 1.4, 2.2),
      flareMat: sparkMaterial(),
      crown: sigil({ color: hdr(scene.brass, 2.8), radius: 0.24, width: 0.03, segments: 5, gap: 0.32, half: 0.4 }),
      band: sigil({ color: HEAD, radius: 0.16, width: 0.014, half: 0.4 }),
      base: sigil({ color: hdr(scene.brass, 1.8), radius: 0.42, width: 0.025 }),
    })
  })
  useTacticLife(startedAt, ending, weight, onDone, (f) => {
    const run = span(f, 0, COMET)
    r.cometMat.forEach((m) => {
      m.uniforms.uHead.value = 1.02 * run
      m.uniforms.uOpacity.value = f.reduced ? 0 : f.gain * (1 - span(f, COMET, COMET + 0.3, soft))
    })
    const burstK = flash(f, COMET, 0.5)
    r.flare.uniforms.uRadius.value = 0.1 + 0.75 * (1 - burstK)
    r.flare.uniforms.uFill.value = 0.6 * burstK
    r.flare.uniforms.uOpacity.value = burstK * f.gain
    r.flareMat.uniforms.uTime.value = f.t
    r.flareMat.uniforms.uOpacity.value = f.reduced ? 0 : f.gain
    const crownIn = span(f, COMET - 0.02, COMET + 0.33, overshoot)
    r.crown.uniforms.uRadius.value = 0.24 * (0.55 + 0.45 * crownIn)
    r.crown.uniforms.uSpin.value = f.time * 0.5
    r.crown.uniforms.uOpacity.value = f.level * clamp01(crownIn)
    r.band.uniforms.uOpacity.value = 0.8 * f.level * clamp01(crownIn)
    r.base.uniforms.uOpacity.value = 0.6 * f.level * span(f, COMET, COMET + 0.2)
  })
  return (
    <group>
      {r.cometGeo.map((g, i) => (
        <mesh key={i} geometry={g} material={r.cometMat[i]} renderOrder={6} />
      ))}
      <mesh geometry={flatPlane()} material={r.flare} position={at(king, Y_MARK + 0.002)} scale={2} renderOrder={5} />
      <points geometry={r.flareGeo} material={r.flareMat} frustumCulled={false} />
      <group position={at(king, crownY)}>
        <mesh geometry={flatPlane()} material={r.crown} scale={0.8} renderOrder={6} />
        <mesh geometry={flatPlane()} material={r.band} scale={0.8} position-y={0.001} renderOrder={6} />
      </group>
      <mesh geometry={flatPlane()} material={r.base} position={at(king, Y_MARK)} scale={1.2} renderOrder={3} />
    </group>
  )
}

/** Squares in front of a back-rank king, toward the centre: the escape squares the trap denies. */
function escapeSquares(king: Square): Square[] {
  const file = king.charCodeAt(0)
  const rank = Number(king[1])
  const ahead = rank === 1 ? 2 : rank === 8 ? 7 : null
  if (ahead === null) return []
  const out: Square[] = []
  for (let f = file - 1; f <= file + 1; f++) if (f >= 97 && f <= 104) out.push(`${String.fromCharCode(f)}${ahead}` as Square)
  return out
}

/** Back rank: a band of light sweeps the king's home rank outward from the entry square; the sealed escape squares smoulder. */
function BackRank({ t, weight, startedAt, ending, onDone }: PartProps<'backRank'>) {
  const [, , z] = squareToPosition(t.king)
  const entry = point2(t.entry)
  const origin = clamp01((entry.x + 4) / 8)
  const escapes = escapeSquares(t.king).map(point2)
  const r = useOwned(() => {
    const band = boardStrip({ x: -4, z }, { x: 4, z }, 0.02, 0.48, 0)
    return bundle({
      bandGeo: band.geometry,
      bandMat: beam(band.length, { color: hdr(scene.brass, 1.3), head: hdr('#fff1d6', 2.4), core: 0.85, halo: 0.15, dash: 0.8 }),
      entryMat: sigil({ color: hdr(scene.brass, 2.4), radius: 0.43, width: 0.03, square: true }),
      escapes: escapes.map(() => sigil({ color: EMBER, radius: 0.4, width: 0.03, fill: 0.12, square: true })),
      soot: escapes.map(() => {
        const m = sigil({ color: new THREE.Color('#2a1608'), radius: 0.36, width: 0.08, fill: 0.5, square: true })
        m.blending = THREE.NormalBlending
        return m
      }),
    })
  })
  useTacticLife(startedAt, ending, weight, onDone, (f) => {
    const p = span(f, 0, 0.7, soft)
    const bu = r.bandMat.uniforms
    bu.uHead.value = origin + (1.02 - origin) * p
    bu.uBack.value = origin - (origin + 0.02) * p
    bu.uFlow.value = f.reduced ? 0 : 0.5
    bu.uTime.value = f.time
    bu.uOpacity.value = 0.55 * f.level
    r.entryMat.uniforms.uOpacity.value = f.level
    r.entryMat.uniforms.uFill.value = 0.3 * flash(f, 0, 0.5)
    const seal = span(f, 0.45, 0.8)
    r.escapes.forEach((m, i) => {
      const breath = f.reduced ? 1 : 0.75 + 0.25 * Math.sin(f.t * 2.4 + i)
      const k = seal * breath * f.gain * (0.6 + 0.4 * (1 - f.settle))
      m.uniforms.uOpacity.value = 0.8 * k
      r.soot[i].uniforms.uOpacity.value = 0.35 * k
    })
  })
  return (
    <group>
      <mesh geometry={r.bandGeo} material={r.bandMat} renderOrder={3} />
      <mesh geometry={flatPlane()} material={r.entryMat} position={at(entry, Y_MARK + 0.002)} scale={1.2} renderOrder={4} />
      {escapes.map((p, i) => (
        <group key={i} position={at(p, Y_MARK)}>
          <mesh geometry={flatPlane()} material={r.soot[i]} scale={1.2} renderOrder={2} />
          <mesh geometry={flatPlane()} material={r.escapes[i]} scale={1.2} position-y={0.001} renderOrder={3} />
        </group>
      ))}
    </group>
  )
}

/** Sacrifice: a brief column of light lifts off the offered piece and leaves a halo floating over it. */
function Sacrifice({ t, weight, startedAt, density, ending, onDone }: PartProps<'sacrifice'>) {
  const p = point2(t.square)
  const haloY = PIECE_HEIGHT[t.piece] + 0.1
  const r = useOwned(() => {
    const outer = shellMaterial()
    outer.uniforms.uColor.value.copy(hdr('#fff0d8', 1.5))
    outer.uniforms.uTopColor.value.copy(hdr(scene.brass, 1))
    const core = shellMaterial()
    core.uniforms.uColor.value.copy(hdr('#fffaf0', 1.7))
    core.uniforms.uTopColor.value.copy(hdr(scene.legal, 1.2))
    core.uniforms.uRim.value = 0.3
    const motes = particleGeometry(Math.round(16 * density), (_, s) => {
      const a = Math.random() * Math.PI * 2
      const rr = Math.sqrt(Math.random()) * 0.3
      s.origin.set(p.x + Math.cos(a) * rr, 0.05, p.z + Math.sin(a) * rr)
      s.velocity.set(0, 0.9 + Math.random() * 0.8, 0)
      s.meta.set(Math.random() * 0.5, 0.6 + Math.random() * 0.4, 0.035 + Math.random() * 0.02, Math.random())
    })
    const moteMat = particleMaterial(true)
    moteMat.uniforms.uColor.value.copy(SPARK)
    moteMat.uniforms.uSwirl.value = 2
    moteMat.uniforms.uFlicker.value = 1
    moteMat.uniforms.uSoft.value = 2.2
    return bundle({
      outer,
      core,
      motes,
      moteMat,
      halo: sigil({ color: hdr('#ffe4b0', 2.6), radius: 0.2, width: 0.022, fill: 0.08, half: 0.35 }),
      base: sigil({ color: hdr(scene.brass, 1.8), radius: 0.42, width: 0.025 }),
    })
  })
  const halo = useRef<THREE.Mesh>(null)
  useTacticLife(startedAt, ending, weight, onDone, (f) => {
    const rise = span(f, 0, 0.35, enter)
    const brief = 1 - soft(clamp01((f.t - 0.55) / 0.7))
    for (const m of [r.outer, r.core]) {
      m.uniforms.uRise.value = rise
      m.uniforms.uTime.value = f.time
    }
    r.outer.uniforms.uOpacity.value = 0.55 * brief * f.gain
    r.core.uniforms.uOpacity.value = 0.35 * brief * f.gain
    r.moteMat.uniforms.uTime.value = f.t
    r.moteMat.uniforms.uOpacity.value = f.reduced ? 0 : f.gain
    halo.current?.position.setY(haloY + 0.08 * span(f, 0, 0.6, soft))
    r.halo.uniforms.uOpacity.value = f.level * span(f, 0.15, 0.45)
    r.base.uniforms.uOpacity.value = 0.6 * f.level
  })
  return (
    <group>
      <group position={at(p, 0)}>
        <mesh geometry={shellGeometry()} material={r.outer} scale={[0.34, 1.9, 0.34]} renderOrder={4} />
        <mesh geometry={shellGeometry()} material={r.core} scale={[0.16, 1.9, 0.16]} renderOrder={4} />
        <mesh ref={halo} geometry={flatPlane()} material={r.halo} position-y={haloY} scale={0.7} renderOrder={6} />
        <mesh geometry={flatPlane()} material={r.base} position-y={Y_MARK} scale={1.2} renderOrder={3} />
      </group>
      <points geometry={r.motes} material={r.moteMat} frustumCulled={false} />
    </group>
  )
}

/** A tactic's lines on the board, by kind. Secondary tactics draw dimmer. */
export function TacticFx({ event, startedAt, density, ending, onDone }: FxProps<'tactic'>) {
  const p = { startedAt, density, ending, onDone, weight: event.primary ? 1 : SECONDARY }
  const t = event.tactic
  switch (t.kind) {
    case 'fork':
      return <Fork t={t} {...p} />
    case 'pin':
      return <Pin t={t} {...p} />
    case 'skewer':
      return <Skewer t={t} {...p} />
    case 'discovered':
      return <Discovered t={t} {...p} />
    case 'doubleCheck':
      return <DoubleCheck t={t} {...p} />
    case 'backRank':
      return <BackRank t={t} {...p} />
    case 'sacrifice':
      return <Sacrifice t={t} {...p} />
  }
}
