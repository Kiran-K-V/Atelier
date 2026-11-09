import * as THREE from 'three'
import { gsap } from '../../motion/ease'
import { BASE_RADIUS } from '../pieces/profiles'
import type { PieceHandle } from '../choreo/registry'

const axis = new THREE.Vector3()
const along = new THREE.Vector3()
const edge = new THREE.Vector3()
const turned = new THREE.Vector3()
const roll = new THREE.Quaternion()

/**
 * Poses `obj` as if tipped by `angle` about the base edge `radius` away along the XZ
 * direction (dx, dz), so its top falls toward that direction. `rest` is its untipped position;
 * `rollAngle` adds a twist about the fall direction.
 */
export function tipPose(
  obj: THREE.Object3D,
  rest: THREE.Vector3,
  dx: number,
  dz: number,
  radius: number,
  angle: number,
  rollAngle = 0,
): void {
  obj.quaternion.setFromAxisAngle(axis.set(dz, 0, -dx), angle)
  if (rollAngle) obj.quaternion.multiply(roll.setFromAxisAngle(along.set(dx, 0, dz), rollAngle))
  edge.set(dx * radius, 0, dz * radius)
  turned.copy(edge).applyQuaternion(obj.quaternion)
  obj.position.copy(rest).add(edge).sub(turned)
}

/** Checkmate: the king falls about its base edge with a heavy ease, bounces once and stays down. */
export function kingTopple(king: PieceHandle, dx: number, dz: number): gsap.core.Timeline {
  const rest = new THREE.Vector3()
  const pose = { a: 0, r: 0 }
  const r = BASE_RADIUS.k
  const apply = () => tipPose(king.shake, rest, dx, dz, r, pose.a, pose.r)
  const down = (82 * Math.PI) / 180
  return gsap
    .timeline()
    .to(pose, { a: 0.06, duration: 0.18, ease: 'sine.inOut', onUpdate: apply })
    .to(pose, { a: down, r: 0.07, duration: 0.5, ease: 'power3.in', onUpdate: apply })
    .to(pose, { a: down - 0.11, duration: 0.1, ease: 'power2.out', onUpdate: apply })
    .to(pose, { a: down, duration: 0.13, ease: 'power2.in', onUpdate: apply })
}
