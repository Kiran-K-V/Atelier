import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { gDur, gEase, gsap } from '../../motion/ease'
import { useGame } from '../../store/game'
import { useSettings } from '../../store/settings'
import { fxBus } from '../choreo/bus'
import type { Mood } from '../choreo/types'
import { squareToPosition } from '../coords'
import { useLook } from '../look'
import { moodWeights, useMood } from './mood'

/** Key and ambient per set: glacier wants harder contrast so its glass and resin read as volume. */
const LIGHT = { wood: { key: 1.8, ambient: 0.12 }, atelier: { key: 1.6, ambient: 0.15 }, glacier: { key: 2.1, ambient: 0.06 } } as const
const PULSE = 1.1

interface MoodRigProps {
  readonly room: string
  readonly shadowMapSize: number
}

const king = new THREE.Vector3()
const away = new THREE.Vector3()

/**
 * Studio key and fill plus two mood lights that are always mounted (intensity 0 when idle), so
 * changing mood never changes the light count and never recompiles materials.
 * check: a red rim from behind the king, a pulse then a faint hold. mate: the room dims and a
 * cool, narrow spot falls on the king.
 */
export function MoodRig({ room, shadowMapSize }: MoodRigProps) {
  const key = useRef<THREE.DirectionalLight>(null)
  const ambient = useRef<THREE.AmbientLight>(null)
  const rim = useRef<THREE.PointLight>(null)
  const spot = useRef<THREE.SpotLight>(null)
  const spotTarget = useMemo(() => new THREE.Object3D(), [])
  const roomColor = useMemo(() => new THREE.Color(room), [room])
  const clock = useThree((s) => s.clock)
  const checkAt = useRef(-10)
  const checkColor = useLook().check
  const light = LIGHT[useSettings((s) => s.boardSet)]

  useEffect(() => {
    const apply = (requested: Mood) => {
      const square = useGame.getState().checkSquare
      // A mood from a move the store has already moved past (no check now) falls back to normal.
      const mood: Mood = square ? requested : 'normal'
      const prev = useMood.getState()
      if (mood === 'check' && (prev.mood !== 'check' || prev.square !== square)) checkAt.current = clock.elapsedTime
      useMood.setState({ mood, square: mood === 'normal' ? prev.square : square })
      const reduced = useSettings.getState().reducedMotion
      gsap.to(moodWeights, {
        check: mood === 'check' ? 1 : 0,
        mate: mood === 'mate' ? 1 : 0,
        duration: reduced ? gDur('fast') : gDur('cinematic'),
        ease: gEase('soft'),
        overwrite: true,
      })
    }
    const offBus = fxBus.on((e) => {
      if (e.type === 'mood') apply(e.mood)
    })
    const offGame = useGame.subscribe((s) => {
      if (s.checkSquare === null && useMood.getState().mood !== 'normal') apply('normal')
    })
    return () => {
      offBus()
      offGame()
    }
  }, [clock])

  useEffect(() => {
    if (spot.current) spot.current.target = spotTarget
  }, [spotTarget])

  useFrame((state) => {
    const { check, mate } = moodWeights
    if (key.current) key.current.intensity = light.key * (1 - 0.65 * mate)
    if (ambient.current) ambient.current.intensity = light.ambient * (1 - 0.6 * mate)
    state.scene.environmentIntensity = 1 - 0.55 * mate
    const bg = state.scene.background
    if (bg instanceof THREE.Color) bg.copy(roomColor).multiplyScalar(1 - 0.35 * mate)
    if (state.scene.fog) state.scene.fog.color.copy(roomColor).multiplyScalar(1 - 0.35 * mate)

    const square = useMood.getState().square
    if (!square || !rim.current || !spot.current) return
    const [x, , z] = squareToPosition(square)
    king.set(x, 0.5, z)
    // Behind the king as seen from the camera, so the light catches its silhouette edge.
    away.set(x - state.camera.position.x, 0, z - state.camera.position.z).normalize()
    rim.current.position.set(x + away.x * 0.85, 1.05, z + away.z * 0.85)
    const t = state.clock.elapsedTime - checkAt.current
    const pulse = useSettings.getState().reducedMotion || t > PULSE ? 0 : Math.pow(Math.sin((Math.PI * t) / PULSE), 2)
    rim.current.intensity = check * (2.2 + 9 * pulse)
    spot.current.position.set(x, 4.6, z + 0.25)
    spotTarget.position.copy(king)
    spot.current.intensity = mate * 70
  })

  return (
    <>
      <ambientLight ref={ambient} intensity={light.ambient} />
      <directionalLight
        ref={key}
        position={[4, 9, 5]}
        intensity={light.key}
        castShadow={shadowMapSize > 0}
        shadow-mapSize={[shadowMapSize || 512, shadowMapSize || 512]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={25}
      />
      <pointLight ref={rim} color={checkColor} intensity={0} distance={3.2} decay={2} />
      <spotLight ref={spot} color="#d6e2ff" intensity={0} angle={0.2} penumbra={0.75} distance={9} decay={2} />
      <primitive object={spotTarget} />
    </>
  )
}
