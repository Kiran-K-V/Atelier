import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { scene } from '../design/tokens'
import { useSettings } from '../store/settings'
import { Board } from './board/Board'
import { Highlights } from './board/Highlights'
import { CAMERA_FOV, CameraRig } from './CameraRig'
import { Director } from './choreo/Director'
import { Effects } from './Effects'
import { FxLayer } from './fx/FxLayer'
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

/** Studio lighting built from local light cards: no HDR download. */
function Studio({ resolution }: { resolution: number }) {
  return (
    <Environment resolution={resolution} frames={1}>
      <Lightformer form="rect" intensity={2.4} color="#fff4e2" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 6, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#ffe6c4" position={[-6, 3, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#cfd8ff" position={[6, 2, -3]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
      <Lightformer form="ring" intensity={1.5} color="#ffffff" position={[0, 4, 8]} scale={3} />
    </Environment>
  )
}

export default function Scene() {
  const quality = useSettings((s) => s.quality)
  const setDetectedQuality = useSettings((s) => s.setDetectedQuality)
  const dark = useIsDark()
  const tier = TIERS[quality]
  const room = dark ? scene.roomDark : scene.roomLight
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
      }}
    >
      <color attach="background" args={[room]} />
      <fog attach="fog" args={[room, 22, 48]} />
      <PerformanceMonitor
        onIncline={() => setDetectedQuality(stepTier(useSettings.getState().quality, 1))}
        onDecline={() => setDetectedQuality(stepTier(useSettings.getState().quality, -1))}
      />

      <Studio resolution={tier.envResolution} />
      <MoodRig room={room} shadowMapSize={tier.shadowMapSize} />

      <Board room={room} />
      <Highlights />
      <Pieces blobShadows />
      <Director />
      <FxLayer />

      <CameraRig />

      {tier.post && <Effects smaa={tier.smaa} dof={tier.dof} vignette={dark ? 0.55 : 0.3} />}
    </Canvas>
  )
}
