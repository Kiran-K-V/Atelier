import { ContactShadows, Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, SMAA, Vignette } from '@react-three/postprocessing'
import { useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { scene } from '../design/tokens'
import { useSettings } from '../store/settings'
import { Board } from './board/Board'
import { Highlights } from './board/Highlights'
import { CAMERA_FOV, CameraRig } from './CameraRig'
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
      }}
    >
      <color attach="background" args={[room]} />
      <fog attach="fog" args={[room, 22, 48]} />
      <PerformanceMonitor
        onIncline={() => setDetectedQuality(stepTier(useSettings.getState().quality, 1))}
        onDecline={() => setDetectedQuality(stepTier(useSettings.getState().quality, -1))}
      />

      <Studio resolution={tier.envResolution} />
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[4, 9, 5]}
        intensity={1.6}
        castShadow={shadows}
        shadow-mapSize={[tier.shadowMapSize || 512, tier.shadowMapSize || 512]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={25}
      />

      <Board room={room} />
      <Highlights />
      <Pieces blobShadows={!tier.contactShadows} />
      {tier.contactShadows && (
        <ContactShadows position={[0, 0.011, 0]} scale={9} blur={2.2} opacity={0.55} far={1.2} resolution={512} frames={Infinity} />
      )}

      <CameraRig />

      {tier.post && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.6} />
          <Vignette offset={0.3} darkness={dark ? 0.55 : 0.3} />
          {tier.smaa ? <SMAA /> : <></>}
        </EffectComposer>
      )}
    </Canvas>
  )
}
