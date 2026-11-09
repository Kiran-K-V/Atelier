import { gEase, gsap } from '../../motion/ease'
import type { Square } from '../../rules/types'
import type { MotionSignature } from '../choreo/types'
import type { PieceHandle } from '../choreo/registry'
import { signatureTiming, squareDistance } from '../choreo/plan'
import { squareToPosition, type Vec3 } from '../coords'
import { knightCorner, leanEuler, lerp, quad, quadControlForPeak } from './path'

export interface SignatureContext {
  readonly handle: PieceHandle
  /** Where the piece is now: on its square, or mid-air after a drag. */
  readonly from: Vec3
  readonly to: Vec3
  readonly fromSquare: Square
  readonly toSquare: Square
  readonly duration: number
  readonly capturing: boolean
}

/** Everything a travel phase needs: unit XZ direction, world distance, duration and impact time. */
interface Travel extends SignatureContext {
  readonly tl: gsap.core.Timeline
  readonly dx: number
  readonly dz: number
  readonly dist: number
  readonly impact: number
}

interface Character {
  readonly travel: (t: Travel) => void
  /** Lift-group scale y at touchdown; 1 for none. */
  readonly squash: number
}

/** Below this XZ gap the piece was dropped onto its square and only descends. */
const DROP_RADIUS = 0.6
const DEG = Math.PI / 180

function setPosition(t: Travel, x: number, y: number, z: number): void {
  t.handle.outer.position.set(x, y, z)
}

/** A straight XZ run with a sine arc of height `peak`, driven by an eased 0..1 progress. */
function arcRun(t: Travel, peak: number, start: number, duration: number, ease: string, extra?: (u: number) => void): void {
  const [sx, sy, sz] = t.from
  const [ex, ey, ez] = t.to
  const p = { u: 0 }
  t.tl.to(
    p,
    {
      u: 1,
      duration,
      ease,
      onUpdate: () => {
        const u = p.u
        setPosition(t, lerp(sx, ex, u), lerp(sy, ey, u) + peak * Math.sin(Math.PI * u), lerp(sz, ez, u))
        extra?.(u)
      },
    },
    start,
  )
}

function lean(t: Travel, angle: number, at: number, duration: number, ease: string): void {
  const e = leanEuler(t.dx, t.dz, angle)
  t.tl.to(t.handle.lift.rotation, { x: e.x, z: e.z, duration, ease }, at)
}

const pawnStep: Character = {
  squash: 0.94,
  travel: (t) => {
    arcRun(t, 0.07, 0, t.impact, gEase('soft'))
    lean(t, 0.07, 0, t.impact * 0.35, gEase('soft'))
    lean(t, 0, t.impact * 0.6, t.impact * 0.4, gEase('soft'))
  },
}

const knightLeap: Character = {
  squash: 0.86,
  travel: (t) => {
    const { tl, handle, impact, capturing } = t
    const crouch = 0.09
    const [sx, sy, sz] = t.from
    const [ex, ey, ez] = t.to
    const corner = knightCorner(t.fromSquare, t.toSquare)
    const [cx, , cz] = corner ? squareToPosition(corner) : [(sx + ex) / 2, 0, (sz + ez) / 2]
    const scale = handle.lift.scale
    tl.to(scale, { x: 1.03, y: 0.92, z: 1.03, duration: crouch, ease: 'power2.out' }, 0)
    tl.to(scale, { x: 0.98, y: 1.05, z: 0.98, duration: 0.08, ease: 'power2.out' }, crouch)
    tl.to(scale, { x: 1, y: 1, z: 1, duration: 0.14, ease: gEase('soft') }, crouch + 0.08)

    if (!capturing) {
      const flight = impact - crouch
      const cy = quadControlForPeak(sy, ey, 0.85)
      const p = { u: 0 }
      tl.to(
        p,
        {
          u: 1,
          duration: flight,
          ease: 'sine.inOut',
          onUpdate: () => setPosition(t, quad(sx, cx, ex, p.u), quad(sy, cy, ey, p.u), quad(sz, cz, ez, p.u)),
        },
        crouch,
      )
      tl.to(handle.lift.rotation, { y: 0.5, duration: flight / 2, ease: 'sine.inOut' }, crouch)
      tl.to(handle.lift.rotation, { y: 0, duration: flight / 2, ease: 'sine.inOut' }, crouch + flight / 2)
      lean(t, -0.1, crouch, flight * 0.3, 'sine.out')
      lean(t, 0.2, crouch + flight * 0.3, flight * 0.55, 'sine.inOut')
      lean(t, 0, impact - flight * 0.15, flight * 0.15, 'power2.in')
    } else {
      // Rise to hang above the victim, then strike straight down.
      const peak = 1.15
      const reach = impact * 0.6
      const hang = impact * 0.82
      const p = { u: 0 }
      tl.to(
        p,
        {
          u: 1,
          duration: reach - crouch,
          ease: 'power2.out',
          onUpdate: () => setPosition(t, quad(sx, cx, ex, p.u), quad(sy, peak * 1.12, peak, p.u), quad(sz, cz, ez, p.u)),
        },
        crouch,
      )
      tl.to(handle.outer.position, { y: peak + 0.04, duration: hang - reach, ease: 'sine.inOut' }, reach)
      tl.to(handle.outer.position, { y: ey, duration: impact - hang, ease: 'power3.in' }, hang)
      tl.to(handle.lift.rotation, { y: 0.5, duration: reach - crouch, ease: 'sine.inOut' }, crouch)
      tl.to(handle.lift.rotation, { y: 0, duration: hang - reach, ease: 'sine.inOut' }, reach)
      lean(t, 0.15, crouch, reach - crouch, 'sine.inOut')
      lean(t, -0.15, reach, hang - reach, 'sine.inOut')
      lean(t, 0, hang, impact - hang, 'power3.in')
    }
    // Recoil: the weight rocks back off the landing, then settles.
    const after = t.duration - impact
    if (after > 0.04) {
      lean(t, -0.06, impact, after * 0.4, 'power2.out')
      lean(t, 0, impact + after * 0.4, after * 0.6, gEase('soft'))
    }
  },
}

const bishopGlide: Character = {
  squash: 1,
  travel: (t) => {
    arcRun(t, 0.03, 0, t.impact, 'power3.inOut')
    lean(t, 10 * DEG, 0, t.impact * 0.3, 'power2.out')
    lean(t, 0, t.impact * 0.62, t.duration - t.impact * 0.62, 'back.out(2.2)')
  },
}

const rookSlide: Character = {
  squash: 1,
  travel: (t) => {
    const { tl, handle, impact, dx, dz } = t
    const [sx, , sz] = t.from
    const [ex, ey, ez] = t.to
    const back = 0.05
    const over = 0.03
    const prep = impact * 0.12
    const settle = Math.min(0.09, impact * 0.15)
    const stop = impact - settle
    const bx = sx - dx * back
    const bz = sz - dz * back
    tl.to(handle.outer.position, { x: bx, y: ey, z: bz, duration: prep, ease: 'sine.inOut' }, 0)
    const p = { u: 0 }
    tl.to(
      p,
      {
        u: 1,
        duration: stop - prep,
        ease: 'sine.in',
        onUpdate: () => setPosition(t, lerp(bx, ex + dx * over, p.u), ey, lerp(bz, ez + dz * over, p.u)),
      },
      prep,
    )
    tl.to(handle.outer.position, { x: ex, z: ez, duration: settle, ease: 'power2.inOut' }, stop)
    // Momentum rocks the body forward at the hard stop.
    lean(t, 0.04, stop, settle * 0.4, 'power2.out')
    lean(t, 0, stop + settle * 0.4, settle * 0.6, gEase('soft'))

    const shake = handle.shake.position
    const span = stop - prep
    const j = { v: 0 }
    tl.to(
      j,
      {
        v: 1,
        duration: span,
        ease: 'none',
        onUpdate: () => {
          const a = j.v * span * 95
          const amp = 0.004 * Math.sin(Math.PI * j.v)
          shake.x = amp * Math.sin(a)
          shake.z = amp * Math.sin(a * 1.37 + 1)
        },
      },
      prep,
    )
    tl.set(shake, { x: 0, z: 0 }, stop)
  },
}

const queenFlow: Character = {
  squash: 0.97,
  travel: (t) => {
    const { handle, dx, dz, dist } = t
    const nx = -dz
    const nz = dx
    const sway = Math.min(0.16, 0.05 + 0.025 * dist)
    const [sx, sy, sz] = t.from
    const [ex, ey, ez] = t.to
    const rot = handle.lift.rotation
    const p = { u: 0 }
    t.tl.to(
      p,
      {
        u: 1,
        duration: t.impact,
        ease: 'sine.inOut',
        onUpdate: () => {
          const u = p.u
          const s = sway * Math.sin(2 * Math.PI * u) * Math.sin(Math.PI * u)
          setPosition(t, lerp(sx, ex, u) + nx * s, lerp(sy, ey, u) + 0.14 * Math.sin(Math.PI * u), lerp(sz, ez, u) + nz * s)
          // Lean forward, and into each bend of the S.
          const fwd = 0.07 * Math.sin(Math.PI * u)
          const lat = -0.09 * Math.sin(2 * Math.PI * u)
          rot.x = fwd * dz + lat * nz
          rot.z = -(fwd * dx + lat * nx)
          rot.y = 0.18 * Math.sin(2 * Math.PI * u)
        },
      },
      0,
    )
  },
}

const kingProcession: Character = {
  squash: 0.97,
  travel: (t) => {
    const { tl, impact } = t
    const bow = 0.26
    lean(t, 6 * DEG, 0, bow / 2, gEase('soft'))
    lean(t, 0, bow / 2, bow / 2, gEase('soft'))
    const [sx, sy, sz] = t.from
    const [ex, ey, ez] = t.to
    const mx = (sx + ex) / 2
    const my = (sy + ey) / 2
    const mz = (sz + ez) / 2
    const pace = (impact - bow) / 2
    const step = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, at: number) => {
      const p = { u: 0 }
      tl.to(
        p,
        {
          u: 1,
          duration: pace,
          ease: gEase('soft'),
          onUpdate: () => setPosition(t, lerp(ax, bx, p.u), lerp(ay, by, p.u) + 0.045 * Math.sin(Math.PI * p.u), lerp(az, bz, p.u)),
        },
        at,
      )
    }
    step(sx, sy, sz, mx, my, mz, bow)
    step(mx, my, mz, ex, ey, ez, bow + pace)
  },
}

const rookHop: Character = {
  squash: 0.92,
  travel: (t) => {
    const { tl, handle, impact } = t
    const crouch = 0.06
    tl.to(handle.lift.scale, { y: 0.95, duration: crouch, ease: 'power2.out' }, 0)
    tl.to(handle.lift.scale, { y: 1, duration: 0.1, ease: gEase('soft') }, crouch)
    const [sx, sy, sz] = t.from
    const [ex, ey, ez] = t.to
    const cy = quadControlForPeak(sy, ey, 0.4)
    const p = { u: 0 }
    tl.to(
      p,
      {
        u: 1,
        duration: impact - crouch,
        ease: 'sine.inOut',
        onUpdate: () => setPosition(t, lerp(sx, ex, p.u), quad(sy, cy, ey, p.u), lerp(sz, ez, p.u)),
      },
      crouch,
    )
  },
}

/** Dropped onto its square: drift onto the centre, breathe, and land on the beat. */
function dropLand(t: Travel, strike: boolean): void {
  const { tl, handle, impact } = t
  const [, sy] = t.from
  const [ex, ey, ez] = t.to
  const descent = Math.min(impact, strike ? 0.16 : 0.22)
  const wait = impact - descent
  tl.to(handle.outer.position, { x: ex, z: ez, duration: impact, ease: gEase('soft') }, 0)
  if (wait > 0.05) tl.to(handle.outer.position, { y: sy + 0.05, duration: wait, ease: 'sine.inOut' }, 0)
  tl.to(handle.outer.position, { y: ey, duration: descent, ease: strike ? 'power3.in' : 'power2.in' }, wait)
}

function landing(t: Travel, squash: number): void {
  const after = t.duration - t.impact
  if (squash >= 1 || after < 0.03) return
  const hit = Math.min(0.04, after / 3)
  const spread = 1 + (1 - squash) * 0.5
  t.tl.to(t.handle.lift.scale, { x: spread, y: squash, z: spread, duration: hit, ease: 'power2.out' }, t.impact)
  t.tl.to(t.handle.lift.scale, { x: 1, y: 1, z: 1, duration: after - hit, ease: gEase(squash < 0.9 ? 'overshoot' : 'soft') }, t.impact + hit)
}

function build(sig: Exclude<MotionSignature, 'instant'>, character: Character) {
  return (ctx: SignatureContext): gsap.core.Timeline => {
    const { handle, from, to, duration } = ctx
    const tl = gsap.timeline()
    const timing = signatureTiming(sig, squareDistance(ctx.fromSquare, ctx.toSquare), ctx.capturing)
    const impact = timing.duration > 0 ? (timing.impact * duration) / timing.duration : duration
    const gx = to[0] - from[0]
    const gz = to[2] - from[2]
    const dist = Math.hypot(gx, gz)
    const sq = squareToPosition(ctx.toSquare)
    const fs = squareToPosition(ctx.fromSquare)
    // Direction comes from the squares so a drop near the target still leans the right way.
    const len = Math.hypot(sq[0] - fs[0], sq[2] - fs[2]) || 1
    const t: Travel = { ...ctx, tl, dx: (sq[0] - fs[0]) / len, dz: (sq[2] - fs[2]) / len, dist, impact }

    tl.to(handle.outer.rotation, { x: 0, z: 0, duration: Math.min(0.15, duration), ease: gEase('standard') }, 0)
    if (dist < DROP_RADIUS) dropLand(t, sig === 'knightLeap' && ctx.capturing)
    else character.travel(t)
    landing(t, character.squash)
    tl.set(handle.lift.rotation, { x: 0, y: 0, z: 0 }, duration)
    tl.set(handle.lift.scale, { x: 1, y: 1, z: 1 }, duration)
    tl.set(handle.outer.position, { x: to[0], y: to[1], z: to[2] }, duration)
    return tl
  }
}

function instant({ handle, to }: SignatureContext): gsap.core.Timeline {
  return gsap
    .timeline()
    .set(handle.outer.position, { x: to[0], y: to[1], z: to[2] }, 0)
    .set(handle.outer.rotation, { x: 0, z: 0 }, 0)
    .set(handle.lift.rotation, { x: 0, y: 0, z: 0 }, 0)
    .set(handle.lift.scale, { x: 1, y: 1, z: 1 }, 0)
}

/** Each piece's way of moving. Every timeline lasts exactly `duration` and lands on the plan's impact time. */
export const signatures: Record<MotionSignature, (ctx: SignatureContext) => gsap.core.Timeline> = {
  pawnStep: build('pawnStep', pawnStep),
  knightLeap: build('knightLeap', knightLeap),
  bishopGlide: build('bishopGlide', bishopGlide),
  rookSlide: build('rookSlide', rookSlide),
  queenFlow: build('queenFlow', queenFlow),
  kingProcession: build('kingProcession', kingProcession),
  rookHop: build('rookHop', rookHop),
  instant,
}

/** The objects a signature animates, for killing tweens before a new one starts. */
export function motionTargets(h: PieceHandle): object[] {
  return [h.outer.position, h.outer.rotation, h.lift.rotation, h.lift.scale, h.shake.position, h.shake.quaternion]
}
