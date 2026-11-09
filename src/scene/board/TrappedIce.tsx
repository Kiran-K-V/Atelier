import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { ALL_SQUARES, isLightSquare, squareToPosition } from '../coords'
import { TRAY_DEPTH } from '../materials'
import { mulberry32 } from '../materials/marble'

const PER_SQUARE = 3
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
    for (let i = 0; i < PER_SQUARE; i++) {
      // Flat, splintered flakes: one long axis, one thin axis.
      const size = 0.03 + rand() * 0.05
      const scale = new THREE.Vector3(size * (1.2 + rand()), size * (0.18 + rand() * 0.25), size * (0.6 + rand() * 0.6))
      const pos = new THREE.Vector3(x + (rand() * 2 - 1) * SPREAD, BOTTOM + rand() * (TOP - BOTTOM), z + (rand() * 2 - 1) * SPREAD)
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
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), [])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#eaf3fb',
        roughness: 0.55,
        flatShading: true,
        emissive: new THREE.Color('#2a4a6a'),
        emissiveIntensity: 0.35,
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
