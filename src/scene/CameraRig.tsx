import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { gDur, gEase, gsap } from '../motion/ease'
import type { Square } from '../rules/types'
import { useGame } from '../store/game'
import { useSettings } from '../store/settings'
import { cameraBus } from './choreo/bus'
import { cameraAzimuth, squareToPosition } from './coords'
import { shakeAngles, type ShakeAngles } from './fx/shake'

export const CAMERA_FOV = 35
const POLAR = (40 * Math.PI) / 180 // 50 degrees above the board
const TARGET = new THREE.Vector3(0, 0.15, 0)

const FOCUS_DISTANCE = 5.5
const FOCUS_POLAR = ((90 - 22) * Math.PI) / 180
/** How far the focus framing swings off the player's axis, toward the king's side of the board. */
const FOCUS_SWING = 0.42

/** Distance that keeps the framed board (about 10 units wide) inside the view, tighter on wide screens. */
export function fitDistance(aspect: number, fovDeg: number): number {
  const halfV = Math.tan(((fovDeg / 2) * Math.PI) / 180)
  const halfH = halfV * aspect
  // The near edge sits ~3.3 units closer than the target at this elevation, so it is the one that must fit.
  return Math.max(14.5, 5.1 / halfH + 3.3)
}

const offset = new THREE.Vector3()
const spherical = new THREE.Spherical()

function place(camera: THREE.Camera, target: THREE.Vector3, theta: number, polar: number, radius: number) {
  camera.position.copy(target).add(offset.setFromSphericalCoords(radius, polar, theta))
  camera.lookAt(target)
}

function sphericalOf(camera: THREE.Camera, target: THREE.Vector3): THREE.Spherical {
  return spherical.setFromVector3(offset.copy(camera.position).sub(target))
}

interface Framing {
  readonly target: THREE.Vector3
  readonly theta: number
  readonly phi: number
  readonly radius: number
}

/** Low, close, slightly side-on view of a square, swung so the rest of the board fills the background. */
function focusFraming(square: Square): Framing {
  const [x, , z] = squareToPosition(square)
  const base = cameraAzimuth(useGame.getState().orientation)
  const side = (x >= 0 ? 1 : -1) * (Math.cos(base) >= 0 ? 1 : -1)
  return { target: new THREE.Vector3(x, 0.35, z), theta: base + side * FOCUS_SWING, phi: FOCUS_POLAR, radius: FOCUS_DISTANCE }
}

type Mode = 'orbit' | 'focus'

export function CameraRig() {
  const orientation = useGame((s) => s.orientation)
  const reduced = useSettings((s) => s.reducedMotion)
  const camera = useThree((s) => s.camera)
  const clock = useThree((s) => s.clock)
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const controls = useRef<OrbitControlsImpl>(null)
  const placed = useRef(false)
  const mode = useRef<Mode>('orbit')
  const dolly = useRef<gsap.core.Tween | null>(null)
  const shake = useRef({ start: 0, duration: 0, intensity: 0 })
  const angles = useRef<ShakeAngles>({ yaw: 0, pitch: 0, roll: 0 })
  const distance = fitDistance(aspect, CAMERA_FOV)
  const distanceRef = useRef(distance)
  distanceRef.current = distance

  useLayoutEffect(() => {
    const c = controls.current
    if (!c || !placed.current || mode.current !== 'orbit') return
    const current = sphericalOf(camera, c.target)
    place(camera, c.target, current.theta, current.phi, distance)
    c.update()
  }, [distance, camera])

  useLayoutEffect(() => {
    const c = controls.current
    if (!c || mode.current !== 'orbit') return
    const goal = cameraAzimuth(orientation)
    if (!placed.current || reduced) {
      const phi = placed.current ? sphericalOf(camera, c.target).phi : POLAR
      placed.current = true
      place(camera, c.target, goal, phi, distance)
      c.update()
      return
    }
    const start = sphericalOf(camera, c.target).theta
    const turn = Math.atan2(Math.sin(goal - start), Math.cos(goal - start))
    const proxy = { theta: start }
    const tween = gsap.to(proxy, {
      theta: start + turn,
      duration: gDur('cinematic'),
      ease: gEase('soft'),
      onUpdate: () => {
        const now = sphericalOf(camera, c.target)
        place(camera, c.target, proxy.theta, now.phi, now.radius)
        c.update()
      },
    })
    return () => {
      tween.kill()
    }
    // Distance changes are handled above; only orientation (and motion preference) re-aims the camera.
  }, [orientation, reduced, camera])

  useEffect(() => {
    const fromTarget = new THREE.Vector3()

    /** Arc the camera around a moving target from where it is now to `goal`. */
    const moveTo = (goal: Framing, duration: number, onComplete?: () => void) => {
      const c = controls.current
      if (!c) return
      dolly.current?.kill()
      fromTarget.copy(c.target)
      const from = { ...sphericalOf(camera, c.target) }
      const turn = Math.atan2(Math.sin(goal.theta - from.theta), Math.cos(goal.theta - from.theta))
      const apply = (k: number) => {
        c.target.lerpVectors(fromTarget, goal.target, k)
        place(camera, c.target, from.theta + turn * k, THREE.MathUtils.lerp(from.phi, goal.phi, k), THREE.MathUtils.lerp(from.radius, goal.radius, k))
      }
      if (useSettings.getState().reducedMotion || duration <= 0) {
        apply(1)
        onComplete?.()
        return
      }
      const p = { k: 0 }
      dolly.current = gsap.to(p, { k: 1, duration, ease: gEase('soft'), onUpdate: () => apply(p.k), onComplete })
    }

    const release = (duration: number) => {
      const c = controls.current
      if (!c || mode.current === 'orbit') return
      const goal: Framing = { target: TARGET, theta: cameraAzimuth(useGame.getState().orientation), phi: POLAR, radius: distanceRef.current }
      moveTo(goal, duration, () => {
        mode.current = 'orbit'
        c.enabled = true
        c.update()
      })
    }

    const offCamera = cameraBus.on((action) => {
      const c = controls.current
      if (!c) return
      switch (action.type) {
        case 'shake': {
          if (useSettings.getState().reducedMotion) return
          const s = shake.current
          const t = clock.elapsedTime - s.start
          const remaining = t < s.duration ? s.intensity * (1 - t / s.duration) : 0
          if (action.intensity >= remaining) shake.current = { start: clock.elapsedTime, duration: action.duration, intensity: action.intensity }
          return
        }
        case 'focus':
          mode.current = 'focus'
          c.enabled = false
          moveTo(focusFraming(action.square), action.duration)
          return
        case 'release':
          release(action.duration)
          return
      }
    })

    // A new game or an undo leaves the mated position: return to the player's view.
    const offGame = useGame.subscribe((s, prev) => {
      if (s.history.length < prev.history.length) release(gDur('cinematic'))
    })

    return () => {
      offCamera()
      offGame()
      dolly.current?.kill()
    }
  }, [camera, clock])

  // Runs after OrbitControls (priority -1). Orientation is rebuilt from position and target each
  // frame, so the shake never accumulates and never moves the camera's position.
  useFrame(() => {
    const s = shake.current
    const c = controls.current
    if (s.intensity === 0 || !c) return
    const t = clock.elapsedTime - s.start
    camera.lookAt(c.target)
    if (t >= s.duration) {
      s.intensity = 0
      return
    }
    const a = shakeAngles(t, s.duration, s.intensity, angles.current)
    camera.rotateY(a.yaw)
    camera.rotateX(a.pitch)
    camera.rotateZ(a.roll)
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={TARGET}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      rotateSpeed={0.55}
      zoomSpeed={0.6}
      minPolarAngle={0.18}
      maxPolarAngle={1.18}
      minDistance={distance * 0.72}
      maxDistance={distance * 1.3}
    />
  )
}
