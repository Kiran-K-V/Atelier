import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { gDur, gEase, gsap } from '../../motion/ease'
import type { Square } from '../../rules/types'
import { useGame } from '../../store/game'
import { useSettings } from '../../store/settings'
import { squareToPosition } from '../coords'
import { useLook } from '../look'
import { glowTexture, type GlowShape } from '../materials/glow'

/** Soft dark underlay per set, so marks read on pale squares too. Cyan on snow needs a firmer one. */
const HALO = { atelier: '#1a1208', glacier: '#010a1a' } as const
const HALO_GAIN = { atelier: 1, glacier: 1.6 } as const

export const noRaycast = () => undefined

interface MarkProps {
  readonly square: Square
  readonly shape: GlowShape | 'fill'
  readonly color: string
  readonly size: number
  /** Stacking height; all marks stay below the contact-shadow plane. */
  readonly y: number
  readonly opacity: number
  /** Above 1 pushes the mark past the bloom threshold. */
  readonly intensity?: number
  readonly pulse?: boolean
  readonly popIn?: boolean
  /** Soft dark underlay so the mark reads on pale marble too. */
  readonly halo?: number
  readonly haloColor?: string
}

function Mark({ square, shape, color, size, y, opacity, intensity = 1, pulse = false, popIn = true, halo = 0, haloColor = HALO.atelier }: MarkProps) {
  const mesh = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const reduced = useSettings((s) => s.reducedMotion)
  const tint = useMemo(() => new THREE.Color(color).multiplyScalar(intensity), [color, intensity])
  const position = squareToPosition(square, y)

  useLayoutEffect(() => {
    if (!popIn || reduced || !mesh.current || !mat.current) return
    const tl = gsap.timeline()
    tl.fromTo(mesh.current.scale, { x: 0.55, y: 0.55 }, { x: 1, y: 1, duration: gDur('fast'), ease: gEase('enter') }, 0)
    tl.fromTo(mat.current, { opacity: 0 }, { opacity, duration: gDur('fast'), ease: gEase('enter') }, 0)
    return () => {
      tl.kill()
    }
  }, [popIn, reduced, opacity])

  useFrame(({ clock }) => {
    if (!pulse || !mat.current) return
    mat.current.opacity = reduced ? opacity : opacity * (0.6 + 0.4 * Math.sin(clock.elapsedTime * 4.2))
  })

  return (
    <group ref={mesh} position={position as [number, number, number]} rotation-x={-Math.PI / 2} renderOrder={2}>
      {halo > 0 && shape !== 'fill' && (
        <mesh position-z={-0.0004} scale={1.18} renderOrder={2} raycast={noRaycast}>
          <planeGeometry args={[size, size]} />
          <meshBasicMaterial map={glowTexture(shape)} color={haloColor} transparent opacity={halo} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <mesh renderOrder={2} raycast={noRaycast}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          ref={mat}
          map={shape === 'fill' ? null : glowTexture(shape)}
          color={tint}
          transparent
          opacity={opacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

export function Highlights() {
  const legalTargets = useGame((s) => s.legalTargets)
  const pieces = useGame((s) => s.pieces)
  const selected = useGame((s) => s.selected)
  const last = useGame((s) => s.history.at(-1))
  const checkSquare = useGame((s) => s.checkSquare)
  const cursor = useGame((s) => s.cursor)
  const occupied = useMemo(() => new Set(pieces.map((p) => p.square)), [pieces])
  const scene = useLook()
  const set = useSettings((s) => s.boardSet)
  const haloColor = HALO[set]
  const gain = HALO_GAIN[set]

  return (
    <group>
      {last &&
        [last.from, last.to].map((sq) => (
          <Mark key={`last-${sq}`} square={sq} shape="fill" color={scene.lastMove} size={0.994} y={0.003} opacity={0.26} popIn={false} />
        ))}
      {checkSquare && (
        <Mark key={`check-${checkSquare}`} square={checkSquare} shape="blob" color={scene.check} size={1.5} y={0.004} opacity={0.85} intensity={2.2} pulse />
      )}
      {selected && <Mark key={`sel-${selected}`} square={selected} shape="frame" color={scene.marker} size={1} y={0.005} opacity={1} intensity={1.15} halo={0.5 * gain} haloColor={haloColor} />}
      {legalTargets.map((sq) =>
        occupied.has(sq) ? (
          <Mark key={`cap-${sq}`} square={sq} shape="ring" color={scene.marker} size={1} y={0.007} opacity={1} intensity={1.15} halo={0.5 * gain} haloColor={haloColor} />
        ) : (
          <Mark key={`mv-${sq}`} square={sq} shape="disc" color={scene.marker} size={0.34} y={0.007} opacity={1} intensity={1.15} halo={Math.min(1, 0.55 * gain)} haloColor={haloColor} />
        ),
      )}
      {cursor && <Mark key={`cur-${cursor}`} square={cursor} shape="frame" color={scene.cursor} size={0.96} y={0.009} opacity={0.95} intensity={1.6} />}
    </group>
  )
}
