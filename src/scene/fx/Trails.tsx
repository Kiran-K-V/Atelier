import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { scene } from '../../design/tokens'
import type { Square } from '../../rules/types'
import { useSettings } from '../../store/settings'
import { squareToPosition } from '../coords'
import { flatPlane, hdr, particleGeometry, stripGeometry } from './geometry'
import { clamp01, easeFn, useLife, useOwned, type FxProps } from './life'
import { pathPoint, type Point2 } from './path'
import { particleMaterial, ringMaterial, stripMaterial } from './shaders'

const soft = easeFn('soft')
const enter = easeFn('enter')
const standard = easeFn('standard')

function point2(square: Square): Point2 {
  const [x, , z] = squareToPosition(square)
  return { x, z }
}

/** Flat ribbon on the board from `a` to `b`, `half` wide each side, with an optional S-sway. */
function boardStrip(a: Point2, b: Point2, y: number, half: number, sway: number): { geometry: THREE.BufferGeometry; length: number } {
  const length = Math.hypot(b.x - a.x, b.z - a.z)
  const nx = -(b.z - a.z) / (length || 1)
  const nz = (b.x - a.x) / (length || 1)
  const p = { x: 0, z: 0 }
  const geometry = stripGeometry(Math.max(8, Math.ceil(length * 18)), (u, center, side) => {
    pathPoint(a, b, u, sway, p)
    center.set(p.x, y, p.z)
    side.set(nx * half, 0, nz * half)
  })
  return { geometry, length }
}

const TRAIL_FADE = 0.5
const TRAIL_Y = 0.014

interface TrailLook {
  readonly half: number
  readonly sway: number
  readonly core: number
  readonly halo: number
  readonly wave: number
  readonly color: THREE.Color
  readonly head: THREE.Color
  readonly flow: number
}

const LOOK: Record<'bishop' | 'queen', TrailLook> = {
  // A thin, sharp streak of light.
  bishop: { half: 0.07, sway: 0, core: 0.16, halo: 0.2, wave: 0, color: hdr(scene.brass, 1.9), head: hdr('#fff4e0', 3), flow: 0 },
  // A wider, flowing ribbon with a solid core.
  queen: { half: 0.22, sway: 0.05, core: 0.5, halo: 0.6, wave: 0.1, color: hdr(scene.brass, 1.7), head: hdr('#fff6ea', 2.6), flow: 1.4 },
}

/** Bishop and queen: light drawn on the board along the move, a glow riding the head, then a fade. */
export function Trail({ event, startedAt, density, onDone }: FxProps<'trail'>) {
  const look = LOOK[event.style]
  const a = point2(event.from)
  const b = point2(event.to)
  const duration = Math.max(0.15, event.duration)
  const headMesh = useRef<THREE.Mesh>(null)
  const headPoint = useRef<Point2>({ x: 0, z: 0 }).current
  const strip = useOwned(() => boardStrip(a, b, TRAIL_Y, look.half, look.sway).geometry)
  const length = Math.hypot(b.x - a.x, b.z - a.z)
  const line = useOwned(() => {
    const m = stripMaterial()
    const u = m.uniforms
    u.uColor.value.copy(look.color)
    u.uHeadColor.value.copy(look.head)
    u.uLength.value = length
    u.uCore.value = look.core
    u.uHalo.value = look.halo
    u.uWave.value = look.wave
    u.uFlow.value = look.flow
    u.uDash.value = 1.5
    return m
  })
  const glow = useOwned(() => {
    const m = ringMaterial({ additive: true })
    m.uniforms.uColor.value.copy(look.head).multiplyScalar(0.6)
    m.uniforms.uFill.value = 1
    m.uniforms.uRadius.value = 0.06
    m.uniforms.uWidth.value = 0.08
    m.uniforms.uHalf.value = 0.5
    return m
  })
  const sparkleCount = event.style === 'queen' && density >= 1 ? 18 : 0
  const sparkles = useOwned(() =>
    particleGeometry(sparkleCount, (_, p) => {
      const u = Math.random()
      const q = pathPoint(a, b, u, look.sway, { x: 0, z: 0 })
      const spread = (Math.random() - 0.5) * look.half * 2
      p.origin.set(q.x + spread * 0.5, 0.03, q.z + spread * 0.5)
      p.velocity.set((Math.random() - 0.5) * 0.3, 0.3 + Math.random() * 0.35, (Math.random() - 0.5) * 0.3)
      p.meta.set(soft(u) * duration * 0.95, 0.45 + Math.random() * 0.35, 0.035 + Math.random() * 0.025, Math.random())
    }),
  )
  const sparkle = useOwned(() => {
    const m = particleMaterial(true)
    m.uniforms.uColor.value.copy(hdr('#ffe7b8', 3))
    m.uniforms.uDrag.value = 1.5
    m.uniforms.uGravity.value = -0.2
    m.uniforms.uFlicker.value = 1
    m.uniforms.uSoft.value = 2.2
    return m
  })

  useLife(startedAt, duration + TRAIL_FADE, onDone, (t) => {
    const k = clamp01(t / duration)
    const head = soft(k)
    const fade = 1 - clamp01((t - duration) / TRAIL_FADE)
    line.uniforms.uHead.value = head
    line.uniforms.uTime.value = t
    line.uniforms.uOpacity.value = fade
    sparkle.uniforms.uTime.value = t
    glow.uniforms.uOpacity.value = 0.7 * (1 - clamp01((t - duration * 0.9) / 0.25)) * clamp01(t / 0.05)
    pathPoint(a, b, head, look.sway, headPoint)
    headMesh.current?.position.set(headPoint.x, TRAIL_Y + 0.002, headPoint.z)
  })

  return (
    <group>
      <mesh geometry={strip} material={line} renderOrder={3} />
      <mesh ref={headMesh} geometry={flatPlane()} material={glow} position={[a.x, TRAIL_Y + 0.002, a.z]} renderOrder={3} />
      {sparkleCount > 0 && <points geometry={sparkles} material={sparkle} frustumCulled={false} />}
    </group>
  )
}

const THREAT_DRAW = 0.3
const THREAT_FADE = 0.25

/** Check: a red beam from the attacker to the king that holds, with a slow flow toward the king, until the check ends. */
export function ThreatLine({ event, startedAt, ending, onDone }: FxProps<'threatLine'>) {
  const reduced = useSettings((s) => s.reducedMotion)
  const a = point2(event.from)
  const b = point2(event.to)
  const { geometry, length } = useOwned(() => {
    const s = boardStrip(a, b, 0.06, 0.09, 0)
    return { ...s, dispose: () => s.geometry.dispose() }
  })
  const line = useOwned(() => {
    const m = stripMaterial()
    const u = m.uniforms
    u.uColor.value.copy(hdr(scene.check, 2.4))
    u.uHeadColor.value.copy(hdr('#ff9c84', 2.8))
    u.uLength.value = length
    u.uCore.value = 0.26
    u.uHalo.value = 0.35
    u.uDash.value = 2.2
    return m
  })
  const endAt = useRef<number | null>(null)
  const done = useRef(false)

  useFrame(({ clock }) => {
    if (done.current) return
    const now = clock.elapsedTime
    const u = line.uniforms
    u.uHead.value = reduced ? 1.02 : 1.02 * enter(clamp01((now - startedAt) / THREAT_DRAW))
    u.uFlow.value = reduced ? 0 : 0.8
    u.uTime.value = now - startedAt
    if (ending && endAt.current === null) endAt.current = now
    const fade = endAt.current === null ? 1 : 1 - clamp01((now - endAt.current) / (reduced ? 0.01 : THREAT_FADE))
    u.uOpacity.value = fade
    if (fade <= 0) {
      done.current = true
      onDone()
    }
  })

  return <mesh geometry={geometry} material={line} renderOrder={5} />
}

const SLASH_SWEEP = 0.18
const SLASH_FADE = 0.26
const SLASH_RADIUS = 0.55
const SLASH_TILT = 0.6

/** Bishop capture: a thin, white-hot arc cut across the piece, perpendicular to the attack. */
export function Slash({ event, startedAt, onDone }: FxProps<'slash'>) {
  const camera = useThree((s) => s.camera)
  const [x, , z] = squareToPosition(event.square)
  const geometry = useOwned(() => {
    const [dx, dz] = event.direction
    const along = new THREE.Vector3(dx, 0, dz)
    const perp = new THREE.Vector3(-dz, 0, dx)
    const up = new THREE.Vector3(0, 1, 0)
    // Tilt the cut plane so it reads as a diagonal stroke rather than a level one.
    const a1 = perp.clone().multiplyScalar(Math.cos(SLASH_TILT)).addScaledVector(up, Math.sin(SLASH_TILT))
    const a2 = new THREE.Vector3().crossVectors(along, a1).normalize()
    if (a2.y < 0) a2.negate()
    const pivot = new THREE.Vector3(x, 0.42, z).addScaledVector(a2, -SLASH_RADIUS * 0.8)
    const tangent = new THREE.Vector3()
    const toCamera = new THREE.Vector3()
    return stripGeometry(48, (u, center, side) => {
      const theta = (Math.PI / 6) * (1 + 4 * u)
      center.copy(pivot).addScaledVector(a1, Math.cos(theta) * SLASH_RADIUS).addScaledVector(a2, Math.sin(theta) * SLASH_RADIUS)
      tangent.copy(a1).multiplyScalar(-Math.sin(theta)).addScaledVector(a2, Math.cos(theta))
      toCamera.copy(camera.position).sub(center)
      side.crossVectors(tangent, toCamera).normalize().multiplyScalar(0.05)
    })
  })
  const line = useOwned(() => {
    const m = stripMaterial()
    const u = m.uniforms
    u.uColor.value.copy(hdr('#ffe2a8', 3.5))
    u.uHeadColor.value.copy(hdr('#fff8ee', 5))
    u.uLength.value = SLASH_RADIUS * 2
    u.uCore.value = 0.3
    u.uHalo.value = 0.3
    u.uTail.value = 1.2
    m.depthTest = false
    return m
  })
  useLife(startedAt, SLASH_SWEEP + SLASH_FADE, onDone, (t) => {
    line.uniforms.uHead.value = 1.05 * standard(clamp01(t / SLASH_SWEEP))
    line.uniforms.uOpacity.value = 1 - clamp01((t - SLASH_SWEEP) / SLASH_FADE)
  })
  return <mesh geometry={geometry} material={line} renderOrder={6} />
}
