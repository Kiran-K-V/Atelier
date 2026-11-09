import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { ALL_SQUARES, isLightSquare, squareToPosition } from '../coords'
import { TRAY_DEPTH } from '../materials'
import { mulberry32 } from '../materials/marble'

/** Shards stay inside their tile, clear of the tile walls, the top face and the floor. */
const SPREAD = 0.34
const TOP = -0.06
const BOTTOM = -TRAY_DEPTH + 0.05

/** Deterministic shard layout: same ice on every load. */
function layout(): THREE.Matrix4[] {
  const rand = mulberry32(29)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const e = new THREE.Euler()
  const out: THREE.Matrix4[] = []
  for (const sq of ALL_SQUARES) {
    if (isLightSquare(sq)) continue
    const [x, , z] = squareToPosition(sq)
    // 0, 1 or 2 flakes per tile, so the ice looks found, not scattered.
    const count = Math.floor(rand() * 2.7)
    for (let i = 0; i < count; i++) {
      // Flat, splintered flakes of varied size: one long axis, one thin axis.
      const size = 0.018 + Math.pow(rand(), 2) * 0.06
      const scale = new THREE.Vector3(size * (1.2 + rand()), size * (0.18 + rand() * 0.25), size * (0.6 + rand() * 0.6))
      // Mostly in the lower half of the glass, where depth reads.
      const depth = Math.pow(rand(), 1.8)
      const pos = new THREE.Vector3(x + (rand() * 2 - 1) * SPREAD, BOTTOM + depth * (TOP - BOTTOM), z + (rand() * 2 - 1) * SPREAD)
      q.setFromEuler(e.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI))
      out.push(m.compose(pos, q, scale).clone())
    }
  }
  return out
}

/**
 * Frosted ice flakes frozen inside the glass tiles. Real geometry at different depths, so depth
 * reads through the glass from any angle. One instanced draw call, opaque, no extra pass.
 */
export function TrappedIce() {
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), [])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        // Soft and dim: frost seen through deep glass, not confetti.
        color: '#9fbccb',
        roughness: 0.8,
        emissive: new THREE.Color('#1c3a4a'),
        emissiveIntensity: 0.3,
      }),
    [],
  )
  const mesh = useMemo(() => {
    const matrices = layout()
    const im = new THREE.InstancedMesh(geometry, material, matrices.length)
    matrices.forEach((mat, i) => im.setMatrixAt(i, mat))
    im.instanceMatrix.needsUpdate = true
    im.raycast = () => undefined
    return im
  }, [geometry, material])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  return <primitive object={mesh} />
}
