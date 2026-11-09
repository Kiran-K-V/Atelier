import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { gDur, gEase, gsap } from '../motion/ease'
import { useGame } from '../store/game'
import { useSettings } from '../store/settings'
import { cameraAzimuth } from './coords'

export const CAMERA_FOV = 35
const POLAR = (40 * Math.PI) / 180 // 50 degrees above the board
const TARGET = new THREE.Vector3(0, 0.15, 0)

/** Distance that keeps the framed board (about 10 units wide) inside the view, tighter on wide screens. */
export function fitDistance(aspect: number, fovDeg: number): number {
  const halfV = Math.tan(((fovDeg / 2) * Math.PI) / 180)
  const halfH = halfV * aspect
  // The near edge sits ~3.3 units closer than the target at this elevation, so it is the one that must fit.
  return Math.max(14.5, 5.1 / halfH + 3.3)
}

function place(camera: THREE.Camera, target: THREE.Vector3, theta: number, polar: number, radius: number) {
  camera.position.copy(target).add(new THREE.Vector3().setFromSphericalCoords(radius, polar, theta))
  camera.lookAt(target)
}

export function CameraRig() {
  const orientation = useGame((s) => s.orientation)
  const reduced = useSettings((s) => s.reducedMotion)
  const camera = useThree((s) => s.camera)
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const controls = useRef<OrbitControlsImpl>(null)
  const placed = useRef(false)
  const distance = fitDistance(aspect, CAMERA_FOV)

  useLayoutEffect(() => {
    const c = controls.current
    if (!c || !placed.current) return
    const current = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target))
    place(camera, c.target, current.theta, current.phi, distance)
    c.update()
  }, [distance, camera])

  useLayoutEffect(() => {
    const c = controls.current
    if (!c) return
    const goal = cameraAzimuth(orientation)
    if (!placed.current || reduced) {
      const phi = placed.current ? new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target)).phi : POLAR
      placed.current = true
      place(camera, c.target, goal, phi, distance)
      c.update()
      return
    }
    const start = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target))
    const turn = Math.atan2(Math.sin(goal - start.theta), Math.cos(goal - start.theta))
    const proxy = { theta: start.theta }
    const tween = gsap.to(proxy, {
      theta: start.theta + turn,
      duration: gDur('cinematic'),
      ease: gEase('soft'),
      onUpdate: () => {
        const now = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target))
        place(camera, c.target, proxy.theta, now.phi, now.radius)
        c.update()
      },
    })
    return () => {
      tween.kill()
    }
    // Distance changes are handled above; only orientation (and motion preference) re-aims the camera.
  }, [orientation, reduced, camera])

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
