import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { scene } from '../../design/tokens'
import { squareToPosition } from '../coords'
import { pieceMaterial } from '../materials'
import { pieceGeometry } from '../pieces/geometry'
import { flatPlane, hdr, particleGeometry, shardGeometry, shellGeometry } from './geometry'
import { clamp01, easeFn, useLife, useOwned, type FxProps } from './life'
import { ghostMaterial, particleMaterial, ringMaterial, shellMaterial } from './shaders'
import { shardAt, type ShardLaunch, type ShardState } from './shards'

const enter = easeFn('enter')

/** Promotion: a tall column of light rises from the square, holds, and fades, with motes drifting up it. */
export function LightColumn({ event, startedAt, density, onDone }: FxProps<'lightColumn'>) {
  const [x, , z] = squareToPosition(event.square)
  const duration = Math.max(0.8, event.duration)
  const outer = useOwned(() => {
    const m = shellMaterial()
    m.uniforms.uColor.value.copy(hdr('#fff3dc', 1.4))
    m.uniforms.uTopColor.value.copy(hdr(scene.brass, 1.1))
    m.uniforms.uRim.value = 1
    return m
  })
  const core = useOwned(() => {
    const m = shellMaterial()
    m.uniforms.uColor.value.copy(hdr('#fffaf0', 1.6))
    m.uniforms.uTopColor.value.copy(hdr(scene.legal, 1.4))
    m.uniforms.uRim.value = 0.3
    return m
  })
  const base = useOwned(() => {
    const m = ringMaterial({ additive: true })
    m.uniforms.uColor.value.copy(hdr(scene.legal, 2.2))
    m.uniforms.uFill.value = 0.25
    m.uniforms.uRadius.value = 0.42
    m.uniforms.uWidth.value = 0.08
    m.uniforms.uHalf.value = 0.7
    return m
  })
  const count = Math.round(22 * density)
  const motes = useOwned(() =>
    particleGeometry(count, (_, p) => {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * 0.34
      p.origin.set(Math.cos(a) * r, 0.03, Math.sin(a) * r)
      p.velocity.set(Math.cos(a) * 0.1, 0.8 + Math.random() * 0.9, Math.sin(a) * 0.1)
      p.meta.set(Math.random() * duration * 0.5, 0.7 + Math.random() * 0.45, 0.04 + Math.random() * 0.025, Math.random())
    }),
  )
  const mote = useOwned(() => {
    const m = particleMaterial(true)
    m.uniforms.uColor.value.copy(hdr('#ffd99a', 3))
    m.uniforms.uDrag.value = 0.6
    m.uniforms.uGravity.value = 0.2
    m.uniforms.uSwirl.value = 2.5
    m.uniforms.uFlicker.value = 1
    m.uniforms.uSoft.value = 2.2
    return m
  })
  useLife(startedAt, duration, onDone, (t) => {
    const rise = enter(clamp01(t / 0.4))
    const fade = 1 - clamp01((t - (duration - 0.55)) / 0.55)
    for (const m of [outer, core]) {
      m.uniforms.uRise.value = rise
      m.uniforms.uTime.value = t
    }
    outer.uniforms.uOpacity.value = 0.55 * fade
    core.uniforms.uOpacity.value = 0.35 * fade
    base.uniforms.uOpacity.value = 0.45 * fade * clamp01(t / 0.1)
    mote.uniforms.uTime.value = t
  })
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={shellGeometry()} material={outer} scale={[0.42, 3.2, 0.42]} renderOrder={4} />
      <mesh geometry={shellGeometry()} material={core} scale={[0.2, 3.2, 0.2]} renderOrder={4} />
      <mesh geometry={flatPlane()} material={base} position-y={0.015} scale={1.4} renderOrder={3} />
      <points geometry={motes} material={mote} frustumCulled={false} />
    </group>
  )
}

const SHARD_LIFE = 1.25
const scratch = new THREE.Object3D()
const shardState: ShardState = { x: 0, y: 0, z: 0, spin: 0 }

interface ShardSpin {
  readonly axis: THREE.Vector3
  readonly rate: number
  readonly size: number
}

/** Knight capture: the piece bursts into chips of its own material that fly along the strike, bounce once and shrink away. */
export function Shards({ event, startedAt, density, onDone }: FxProps<'shards'>) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const [x, , z] = squareToPosition(event.square)
  const count = Math.round(32 * density)
  const shards = useMemo(() => {
    const [dx, dz] = event.direction
    const base = Math.atan2(dz, dx)
    return Array.from({ length: count }, (): { launch: ShardLaunch; spin: ShardSpin } => {
      const size = 0.035 + Math.random() * 0.045
      const a = base + (Math.random() - 0.5) * 2.4
      const speed = 0.7 + Math.random() * 1.6
      const r = Math.random() * 0.16
      const ra = Math.random() * Math.PI * 2
      return {
        launch: {
          x: x + Math.cos(ra) * r,
          y: 0.12 + Math.random() * 0.55,
          z: z + Math.sin(ra) * r,
          vx: Math.cos(a) * speed,
          vy: 1.1 + Math.random() * 2,
          vz: Math.sin(a) * speed,
          rest: size * 0.4,
        },
        spin: { axis: new THREE.Vector3().randomDirection(), rate: 6 + Math.random() * 14, size },
      }
    })
  }, [count, event.direction, x, z])

  const place = (t: number) => {
    const m = mesh.current
    if (!m) return
    const shrink = 1 - clamp01((t - 0.75) / (SHARD_LIFE - 0.75))
    for (let i = 0; i < shards.length; i++) {
      const { launch, spin } = shards[i]
      shardAt(launch, t, shardState)
      scratch.position.set(shardState.x, shardState.y, shardState.z)
      scratch.quaternion.setFromAxisAngle(spin.axis, spin.rate * shardState.spin)
      scratch.scale.setScalar(spin.size * shrink)
      scratch.updateMatrix()
      m.setMatrixAt(i, scratch.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }

  // Instances start as identity matrices; place them before the first frame draws them.
  useLayoutEffect(() => place(0), [])
  useLife(startedAt, SHARD_LIFE, onDone, place)

  return (
    <instancedMesh
      ref={mesh}
      args={[shardGeometry(), pieceMaterial(event.color), count]}
      frustumCulled={false}
      castShadow
      receiveShadow
     
    />
  )
}

const EMBER: Record<'w' | 'b', string> = { w: '#ffd9a0', b: '#ff8a3c' }

/** Queen capture: the piece burns away into embers that rise and swirl. */
export function Motes({ event, startedAt, density, onDone }: FxProps<'motes'>) {
  const [x, , z] = squareToPosition(event.square)
  const count = Math.round(40 * density)
  const points = useOwned(() =>
    particleGeometry(count, (_, p) => {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * 0.22
      p.origin.set(Math.cos(a) * r, 0.05 + Math.random() * 0.75, Math.sin(a) * r)
      p.velocity.set(Math.cos(a) * 0.15, 0.4 + Math.random() * 0.6, Math.sin(a) * 0.15)
      p.meta.set(Math.random() * 0.4, 0.7 + Math.random() * 0.5, 0.045 + Math.random() * 0.04, Math.random())
    }),
  )
  const mat = useOwned(() => {
    const m = particleMaterial(true)
    m.uniforms.uColor.value.copy(hdr(EMBER[event.color], 3.2))
    m.uniforms.uDrag.value = 0.8
    m.uniforms.uGravity.value = 0.35
    m.uniforms.uSwirl.value = 3
    m.uniforms.uFlicker.value = 1
    m.uniforms.uSoft.value = 2
    return m
  })
  useLife(startedAt, 1.7, onDone, (t) => {
    mat.uniforms.uTime.value = t
  })
  return <points geometry={points} material={mat} position={[x, 0, z]} frustumCulled={false} />
}

const GHOST_LIFE = 0.9
const GHOST_STAGGER = 0.1

/** En passant: afterimages of the pawn that passed through the square, shimmering out of existence. */
export function GhostTrail({ event, startedAt, onDone }: FxProps<'ghostTrail'>) {
  const [x, , z] = squareToPosition(event.square)
  const group = useRef<THREE.Group>(null)
  // The captured pawn walked toward its far side: black toward +z, white toward -z.
  const step = event.color === 'b' ? 0.36 : -0.36
  const mats = useOwned(() => {
    const list = [0, 1, 2].map(() => {
      const m = ghostMaterial()
      m.uniforms.uColor.value.copy(event.color === 'w' ? hdr(scene.pieceLight, 0.8) : hdr('#1c1714', 1))
      m.uniforms.uRimColor.value.copy(event.color === 'w' ? hdr('#fff4e2', 2) : hdr(scene.brass, 2))
      return m
    })
    return { list, dispose: () => list.forEach((m) => m.dispose()) }
  })
  useLife(startedAt, GHOST_LIFE + 2 * GHOST_STAGGER, onDone, (t) => {
    const children = group.current?.children
    mats.list.forEach((m, i) => {
      const k = clamp01((t - i * GHOST_STAGGER) / GHOST_LIFE)
      const shimmer = 0.75 + 0.25 * Math.sin(t * 34 + i * 2.1)
      m.uniforms.uOpacity.value = 0.9 * Math.sin(Math.PI * Math.pow(k, 0.7)) * shimmer * (1 - i * 0.18)
      children?.[i]?.scale.set(1, 1 + 0.03 * Math.sin(t * 21 + i), 1)
    })
  })
  const { geometry } = pieceGeometry('p')
  return (
    <group ref={group} position={[x, 0, z]}>
      {mats.list.map((m, i) => (
        <mesh key={i} geometry={geometry} material={m} position-z={(i - 1) * step} renderOrder={4} />
      ))}
    </group>
  )
}
