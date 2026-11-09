import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useSyncExternalStore } from 'react'
import * as THREE from 'three'
import type { BoardSet } from '../design/tokens'
import { useSettings } from '../store/settings'
import { Board } from './board/Board'
import { Highlights } from './board/Highlights'
import { CAMERA_FOV, CameraRig } from './CameraRig'
import { Director } from './choreo/Director'
import { Effects } from './Effects'
import { FxLayer } from './fx/FxLayer'
import { useLook } from './look'
import { MoodRig } from './fx/MoodRig'
import { Pieces } from './pieces/Pieces'
import { stepTier, TIERS } from './quality'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribeDark(cb: () => void): () => void {
  const mq = window.matchMedia(DARK_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

function useIsDark(): boolean {
  const theme = useSettings((s) => s.theme)
  const systemDark = useSyncExternalStore(subscribeDark, () => window.matchMedia(DARK_QUERY).matches)
  return theme === 'system' ? systemDark : theme === 'dark'
}

interface Card {
  readonly form: 'rect' | 'ring'
  readonly intensity: number
  readonly color: string
  readonly position: [number, number, number]
  readonly rotation: [number, number, number]
  readonly scale: number | [number, number, number]
}

/** Key overhead, side fill, cool rim, front ring. Glacier runs cool with a strong key, cyan rims and little fill, so glass and resin shade deeply. */
const CARDS: Record<BoardSet, readonly Card[]> = {
  atelier: [
    { form: 'rect', intensity: 2.4, color: '#fff4e2', position: [0, 6, 0], rotation: [Math.PI / 2, 0, 0], scale: [10, 6, 1] },
    { form: 'rect', intensity: 1.2, color: '#ffe6c4', position: [-6, 3, 2], rotation: [0, Math.PI / 2, 0], scale: [8, 3, 1] },
    { form: 'rect', intensity: 0.8, color: '#cfd8ff', position: [6, 2, -3], rotation: [0, -Math.PI / 2, 0], scale: [8, 2, 1] },
    { form: 'ring', intensity: 1.5, color: '#ffffff', position: [0, 4, 8], rotation: [0, 0, 0], scale: 3 },
  ],
  glacier: [
    { form: 'rect', intensity: 3.2, color: '#f2f8ff', position: [0, 6, 0], rotation: [Math.PI / 2, 0, 0], scale: [10, 6, 1] },
    { form: 'rect', intensity: 0.45, color: '#cfe4ff', position: [-6, 3, 2], rotation: [0, Math.PI / 2, 0], scale: [8, 3, 1] },
    { form: 'rect', intensity: 2.6, color: '#6fe2ff', position: [6, 2, -3], rotation: [0, -Math.PI / 2, 0], scale: [8, 2, 1] },
    { form: 'rect', intensity: 1.6, color: '#bfe8ff', position: [-4, 1.5, -6], rotation: [0, Math.PI / 4, 0], scale: [6, 1, 1] },
    { form: 'ring', intensity: 1.8, color: '#ffffff', position: [0, 4, 8], rotation: [0, 0, 0], scale: 3 },
  ],
}

/** Studio lighting built from local light cards: no HDR download. Remounts per set (frames=1 renders once). */
function Studio({ resolution, set }: { resolution: number; set: BoardSet }) {
  return (
    <Environment key={set} resolution={resolution} frames={1}>
      {CARDS[set].map((c, i) => (
        <Lightformer key={i} form={c.form} intensity={c.intensity} color={c.color} position={c.position} rotation={c.rotation} scale={c.scale} />
      ))}
    </Environment>
  )
}

export default function Scene() {
  const quality = useSettings((s) => s.quality)
  const setDetectedQuality = useSettings((s) => s.setDetectedQuality)
  const set = useSettings((s) => s.boardSet)
  const look = useLook()
  const dark = useIsDark()
  const tier = TIERS[quality]
  const room = dark ? look.roomDark : look.roomLight
  const shadows = tier.shadowMapSize > 0

  return (
    <Canvas
      shadows={shadows}
      dpr={[tier.dpr[0], tier.dpr[1]]}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 100, position: [0, 10, 10] }}
      gl={{ antialias: !tier.post, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        // The slice capture cuts pieces with clipping planes.
        gl.localClippingEnabled = true
        // Glass refraction samples a blurred copy of the scene; half resolution is indistinguishable and halves its cost.
        gl.transmissionResolutionScale = 0.5
      }}
    >
      <color attach="background" args={[room]} />
      <fog attach="fog" args={[room, 22, 48]} />
      <PerformanceMonitor
        onIncline={() => setDetectedQuality(stepTier(useSettings.getState().quality, 1))}
        onDecline={() => setDetectedQuality(stepTier(useSettings.getState().quality, -1))}
      />

      <Studio resolution={tier.envResolution} set={set} />
      <MoodRig room={room} shadowMapSize={tier.shadowMapSize} />

      <Board room={room} dark={dark} />
      <Highlights />
      <Pieces blobShadows />
      <Director />
      <FxLayer />

      <CameraRig />

      {tier.post && <Effects smaa={tier.smaa} dof={tier.dof} vignette={dark ? 0.55 : 0.3} />}
    </Canvas>
  )
}
