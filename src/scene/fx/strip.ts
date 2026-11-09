import type * as THREE from 'three'
import type { Square } from '../../rules/types'
import { squareToPosition } from '../coords'
import { stripGeometry } from './geometry'
import { pathPoint, type Point2 } from './path'

/** Board-plane centre of a square. */
export function point2(square: Square): Point2 {
  const [x, , z] = squareToPosition(square)
  return { x, z }
}

/** Flat ribbon on the board from `a` to `b`, `half` wide each side, with an optional S-sway. */
export function boardStrip(a: Point2, b: Point2, y: number, half: number, sway: number): { geometry: THREE.BufferGeometry; length: number } {
  const length = Math.hypot(b.x - a.x, b.z - a.z)
  const nx = -(b.z - a.z) / (length || 1)
  const nz = (b.x - a.x) / (length || 1)
  const p = { x: 0, z: 0 }
  const geometry = stripGeometry(Math.max(8, Math.ceil(length * 18)), (u, center, side) => {
    pathPoint(a, b, u, sway, p)
    center.set(p.x, y, p.z)
    side.set(nx * half, 0, nz * half)
  })
  return { geometry, length }
}
