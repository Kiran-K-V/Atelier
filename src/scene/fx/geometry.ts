import * as THREE from 'three'
import { mulberry32 } from '../materials/marble'

let plane: THREE.PlaneGeometry | null = null

/** Unit plane lying flat on the board (normal +y). Shared. */
export function flatPlane(): THREE.PlaneGeometry {
  if (!plane) {
    plane = new THREE.PlaneGeometry(1, 1)
    plane.rotateX(-Math.PI / 2)
  }
  return plane
}

let shell: THREE.CylinderGeometry | null = null

/** Open unit cylinder standing on y = 0 with local y in 0..1. Shared. */
export function shellGeometry(): THREE.CylinderGeometry {
  if (!shell) {
    shell = new THREE.CylinderGeometry(1, 1, 1, 48, 12, true)
    shell.translate(0, 0.5, 0)
  }
  return shell
}

let shard: THREE.BufferGeometry | null = null

/** Irregular chip: a tetrahedron with jittered corners, flat-shaded. Shared. */
export function shardGeometry(): THREE.BufferGeometry {
  if (!shard) {
    const rand = mulberry32(41)
    const g = new THREE.TetrahedronGeometry(1, 0)
    const pos = g.getAttribute('position')
    const corners = new Map<string, [number, number, number]>()
    for (let i = 0; i < pos.count; i++) {
      const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`
      let s = corners.get(key)
      if (!s) {
        s = [0.6 + rand() * 0.8, 0.5 + rand() * 0.9, 0.6 + rand() * 0.8]
        corners.set(key, s)
      }
      pos.setXYZ(i, pos.getX(i) * s[0], pos.getY(i) * s[1], pos.getZ(i) * s[2])
    }
    g.computeVertexNormals()
    shard = g
  }
  return shard
}

const center = new THREE.Vector3()
const side = new THREE.Vector3()

/**
 * Ribbon of `segments` quads. `sample(u, center, side)` writes the centerline point and the
 * half-width vector at u in [0, 1]. uv.x runs along the ribbon, uv.y is -1..1 across it.
 */
export function stripGeometry(segments: number, sample: (u: number, center: THREE.Vector3, side: THREE.Vector3) => void): THREE.BufferGeometry {
  const n = segments + 1
  const pos = new Float32Array(n * 6)
  const uv = new Float32Array(n * 4)
  const index: number[] = []
  for (let i = 0; i < n; i++) {
    const u = i / segments
    sample(u, center, side)
    pos.set([center.x - side.x, center.y - side.y, center.z - side.z, center.x + side.x, center.y + side.y, center.z + side.z], i * 6)
    uv.set([u, -1, u, 1], i * 4)
    if (i < segments) {
      const a = i * 2
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(index)
  return g
}

export interface ParticleSeed {
  readonly origin: THREE.Vector3
  readonly velocity: THREE.Vector3
  /** delay, life, size, seed */
  readonly meta: THREE.Vector4
}

const seed: ParticleSeed = { origin: new THREE.Vector3(), velocity: new THREE.Vector3(), meta: new THREE.Vector4() }

/** Point cloud for the analytic particle shader; `init` fills each particle's start state. */
export function particleGeometry(count: number, init: (i: number, p: ParticleSeed) => void): THREE.BufferGeometry {
  const pos = new Float32Array(count * 3)
  const vel = new Float32Array(count * 3)
  const meta = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    seed.origin.set(0, 0, 0)
    seed.velocity.set(0, 0, 0)
    seed.meta.set(0, 1, 0.05, Math.random())
    init(i, seed)
    seed.origin.toArray(pos, i * 3)
    seed.velocity.toArray(vel, i * 3)
    seed.meta.toArray(meta, i * 4)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3))
  g.setAttribute('aMeta', new THREE.BufferAttribute(meta, 4))
  return g
}

/** Linear HDR color: the hex tone scaled by `k`; above 1 it crosses the bloom threshold. */
export function hdr(hex: string, k: number): THREE.Color {
  return new THREE.Color(hex).multiplyScalar(k)
}
