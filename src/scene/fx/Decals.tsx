import { useRef } from 'react'
import type * as THREE from 'three'
import { scene } from '../../design/tokens'
import { squareToPosition } from '../coords'
import { flatPlane, hdr, particleGeometry, shellGeometry } from './geometry'
import { clamp01, easeFn, useLife, useOwned, type FxProps } from './life'
import { particleMaterial, ringMaterial, shellMaterial } from './shaders'

const enter = easeFn('enter')
const standard = easeFn('standard')

const DUST = '#cbbfac'

const GLOW_PEAK = 0.12
const GLOW_LIFE = 0.45

/** Rises to 1 at GLOW_PEAK, then eases out to 0 by GLOW_LIFE. No edge, no expansion. */
function glowEnvelope(t: number): number {
  if (t < GLOW_PEAK) return t / GLOW_PEAK
  const k = clamp01((t - GLOW_PEAK) / (GLOW_LIFE - GLOW_PEAK))
  return 1 - standard(k)
}

/** The square itself catches the light: a soft fill with no outline, brief and low. */
function SquareGlow({ square, startedAt, strength, color, onDone }: { square: Parameters<typeof squareToPosition>[0]; startedAt: number; strength: number; color: string; onDone?: () => void }) {
  const [x, , z] = squareToPosition(square)
  const glow = useOwned(() => {
    const m = ringMaterial({ additive: true })
    m.uniforms.uColor.value.copy(hdr(color, 0.9))
    m.uniforms.uFill.value = 1
    m.uniforms.uHalf.value = 1
    m.uniforms.uRadius.value = 0.5
    m.uniforms.uWidth.value = 0.4
    return m
  })
  useLife(startedAt, GLOW_LIFE, onDone ?? (() => undefined), (t) => {
    glow.uniforms.uOpacity.value = strength * glowEnvelope(t)
  })
  return <mesh geometry={flatPlane()} material={glow} position={[x, 0.013, z]} scale={1.25} renderOrder={3} />
}

/** Landing: a low ring of warm dust puffs that rolls outward from the base and settles. */
export function DustRing({ event, startedAt, density, onDone }: FxProps<'dustRing'>) {
  const [x, , z] = squareToPosition(event.square)
  const count = Math.round(10 * density)
  const points = useOwned(() =>
    particleGeometry(count, (i, p) => {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.3
      const r = 0.2 + Math.random() * 0.06
      const speed = 0.45 + Math.random() * 0.35
      p.origin.set(Math.cos(a) * r, 0.02 + Math.random() * 0.04, Math.sin(a) * r)
      p.velocity.set(Math.cos(a) * speed, 0.1 + Math.random() * 0.18, Math.sin(a) * speed)
      p.meta.set(Math.random() * 0.05, 0.45 + Math.random() * 0.2, 0.07 + Math.random() * 0.05, Math.random())
    }),
  )
  const puff = useOwned(() => {
    const m = particleMaterial(false)
    m.uniforms.uColor.value.set(DUST)
    m.uniforms.uOpacity.value = 0.55
    m.uniforms.uDrag.value = 5
    m.uniforms.uGravity.value = -0.5
    m.uniforms.uGrow.value = 1.6
    m.uniforms.uSoft.value = 1.8
    return m
  })
  useLife(startedAt, 0.7, onDone, (t) => {
    puff.uniforms.uTime.value = t
  })
  return (
    <>
      <SquareGlow square={event.square} startedAt={startedAt} strength={0.22} color="#f1e6d0" />
      <group position={[x, 0, z]}>
        <points geometry={points} material={puff} frustumCulled={false} />
      </group>
    </>
  )
}

/** Knight landing: the square catches the light; the board's own wave carries the impact outward. */
export function RippleRing({ event, startedAt, onDone }: FxProps<'ripple'>) {
  return <SquareGlow square={event.square} startedAt={startedAt} strength={0.28 * event.strength} color="#f1e6d0" onDone={onDone} />
}

/** King: a faint shell of light around the piece and a soft glow on its square. */
export function Aura({ event, startedAt, onDone }: FxProps<'aura'>) {
  const [x, , z] = squareToPosition(event.square)
  const shellMesh = useRef<THREE.Mesh>(null)
  const shell = useOwned(() => {
    const m = shellMaterial()
    m.uniforms.uColor.value.copy(hdr(scene.legal, 1.5))
    m.uniforms.uTopColor.value.copy(hdr(scene.brass, 0.6))
    return m
  })
  useLife(startedAt, 0.9, onDone, (t) => {
    const k = t / 0.9
    shell.uniforms.uOpacity.value = 0.45 * Math.sin(Math.PI * Math.pow(k, 0.6))
    shell.uniforms.uTime.value = t
    const r = 0.4 + 0.12 * standard(k)
    shellMesh.current?.scale.set(r, 1.3, r)
  })
  return (
    <>
      <SquareGlow square={event.square} startedAt={startedAt} strength={0.2} color={scene.brass} />
      <group position={[x, 0, z]}>
        <mesh ref={shellMesh} geometry={shellGeometry()} material={shell} scale={[0.4, 1.3, 0.4]} renderOrder={4} />
      </group>
    </>
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
