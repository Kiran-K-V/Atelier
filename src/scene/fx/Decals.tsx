import { useRef } from 'react'
import type * as THREE from 'three'
import { scene } from '../../design/tokens'
import { RIPPLE } from '../board/ripple'
import { squareToPosition } from '../coords'
import { flatPlane, hdr, particleGeometry, shellGeometry } from './geometry'
import { clamp01, easeFn, useLife, useOwned, type FxProps } from './life'
import { particleMaterial, ringMaterial, shellMaterial } from './shaders'

const enter = easeFn('enter')
const standard = easeFn('standard')

const DUST = '#cbbfac'

/** Landing: a low ring of warm dust puffs that rolls outward from the base and settles. */
export function DustRing({ event, startedAt, density, onDone }: FxProps<'dustRing'>) {
  const [x, , z] = squareToPosition(event.square)
  const count = Math.round(30 * density)
  const points = useOwned(() =>
    particleGeometry(count, (i, p) => {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.3
      const r = 0.2 + Math.random() * 0.06
      const speed = 0.7 + Math.random() * 0.6
      p.origin.set(Math.cos(a) * r, 0.02 + Math.random() * 0.04, Math.sin(a) * r)
      p.velocity.set(Math.cos(a) * speed, 0.1 + Math.random() * 0.18, Math.sin(a) * speed)
      p.meta.set(Math.random() * 0.05, 0.5 + Math.random() * 0.2, 0.16 + Math.random() * 0.12, Math.random())
    }),
  )
  const puff = useOwned(() => {
    const m = particleMaterial(false)
    m.uniforms.uColor.value.set(DUST)
    m.uniforms.uOpacity.value = 0.5
    m.uniforms.uDrag.value = 5
    m.uniforms.uGravity.value = -0.5
    m.uniforms.uGrow.value = 1.6
    m.uniforms.uSoft.value = 1.8
    return m
  })
  const ring = useOwned(() => {
    const m = ringMaterial({ additive: false })
    m.uniforms.uColor.value.set(DUST)
    m.uniforms.uWidth.value = 0.12
    return m
  })
  useLife(startedAt, 0.7, onDone, (t) => {
    const k = t / 0.7
    puff.uniforms.uTime.value = t
    ring.uniforms.uRadius.value = 0.25 + 0.5 * enter(k)
    ring.uniforms.uOpacity.value = 0.3 * (1 - k)
  })
  return (
    <group position={[x, 0, z]}>
      <points geometry={points} material={puff} frustumCulled={false} />
      <mesh geometry={flatPlane()} material={ring} scale={2} position-y={0.013} renderOrder={3} />
    </group>
  )
}

const WAVE_SPEED = RIPPLE.omega / RIPPLE.k

/** Knight landing: a thin brass ring riding the board wave's front. */
export function RippleRing({ event, startedAt, onDone }: FxProps<'ripple'>) {
  const [x, , z] = squareToPosition(event.square)
  const ring = useOwned(() => {
    const m = ringMaterial({ additive: true })
    m.uniforms.uColor.value.copy(hdr(scene.brass, 2.4))
    m.uniforms.uHalf.value = 2
    return m
  })
  useLife(startedAt, 0.7, onDone, (t) => {
    const k = t / 0.7
    ring.uniforms.uRadius.value = 0.15 + WAVE_SPEED * t * 0.85
    ring.uniforms.uWidth.value = 0.04 + 0.06 * k
    ring.uniforms.uOpacity.value = event.strength * Math.pow(1 - k, 1.5) * clamp01(t / 0.05)
  })
  return <mesh geometry={flatPlane()} material={ring} position={[x, 0.02, z]} scale={4} renderOrder={3} />
}

/** King: a regal pulse, a soft brass ring on the board and a faint shell of light around the piece. */
export function Aura({ event, startedAt, onDone }: FxProps<'aura'>) {
  const [x, , z] = squareToPosition(event.square)
  const shellMesh = useRef<THREE.Mesh>(null)
  const ring = useOwned(() => {
    const m = ringMaterial({ additive: true })
    m.uniforms.uColor.value.copy(hdr(scene.brass, 2))
    m.uniforms.uHalf.value = 1.4
    return m
  })
  const shell = useOwned(() => {
    const m = shellMaterial()
    m.uniforms.uColor.value.copy(hdr(scene.legal, 1.5))
    m.uniforms.uTopColor.value.copy(hdr(scene.brass, 0.6))
    return m
  })
  useLife(startedAt, 0.9, onDone, (t) => {
    const k = t / 0.9
    ring.uniforms.uRadius.value = 0.35 + 0.8 * enter(k)
    ring.uniforms.uWidth.value = 0.06 + 0.08 * k
    ring.uniforms.uOpacity.value = 0.9 * Math.pow(1 - k, 1.3) * clamp01(t / 0.06)
    shell.uniforms.uOpacity.value = 0.45 * Math.sin(Math.PI * Math.pow(k, 0.6))
    shell.uniforms.uTime.value = t
    const r = 0.4 + 0.12 * standard(k)
    shellMesh.current?.scale.set(r, 1.3, r)
  })
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={flatPlane()} material={ring} position-y={0.014} scale={2.8} renderOrder={3} />
      <mesh ref={shellMesh} geometry={shellGeometry()} material={shell} scale={[0.4, 1.3, 0.4]} renderOrder={4} />
    </group>
  )
}

/** A strike: a hot disc that blooms and is gone in a fifth of a second. */
export function ImpactFlash({ event, startedAt, onDone }: FxProps<'impactFlash'>) {
  const [x, , z] = squareToPosition(event.square)
  const disc = useOwned(() => {
    const m = ringMaterial({ additive: true })
    m.uniforms.uColor.value.copy(hdr('#fff1d6', 3.2))
    m.uniforms.uFill.value = 1
    m.uniforms.uHalf.value = 0.8
    return m
  })
  useLife(startedAt, 0.22, onDone, (t) => {
    const k = t / 0.22
    disc.uniforms.uRadius.value = 0.1 + 0.32 * enter(k)
    disc.uniforms.uWidth.value = 0.08 + 0.1 * k
    disc.uniforms.uOpacity.value = Math.pow(1 - k, 2)
  })
  return <mesh geometry={flatPlane()} material={disc} position={[x, 0.016, z]} scale={1.6} renderOrder={3} />
}
