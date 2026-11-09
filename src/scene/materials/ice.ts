import * as THREE from 'three'
import { cellular, clamp01, fbm, hash, mix, paint, rgb, smoothstep, texture } from './canvas'

const SIZE = 1024
const DEEP_SIZE = 512

export interface IceTextures {
  readonly color: THREE.CanvasTexture
  /** Grayscale height: fracture lines and facet seams are grooves that catch the light. */
  readonly bump: THREE.CanvasTexture
  /** Green channel drives roughness: polished resin, cracks a little duller. */
  readonly roughness: THREE.CanvasTexture
  /**
   * Fractures deeper inside the resin, sampled in world space with a view parallax (see depth.ts).
   * R: a mid layer of soft crack lines. G: a deep, wide, blurred layer.
   */
  readonly deep: THREE.CanvasTexture
}

/**
 * Sapphire resin with frozen crystal fractures: big warped shards, finer secondary cracks,
 * streaks radiating from each shard's impact point, and flat facets that each catch the light
 * a little differently. Shard cores are near-black navy and brighten toward the crack faces.
 */
function generate(): IceTextures {
  const C = paint(SIZE)
  const B = paint(SIZE)
  const R = paint(SIZE)
  const core = rgb('#030d24')
  const mid = rgb('#0c2a63')
  const bright = rgb('#2a63b8')
  const crack = rgb('#8fbaf2')

  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const x = (px / SIZE) * 6
      const y = (py / SIZE) * 6
      const warp = fbm(x * 0.7 - 2.3, y * 0.7 + 5.9, 3)
      const cloud = fbm(x * 1.3 + 8.1, y * 1.3, 4)
      const big = cellular(x * 1.5 + warp * 0.9, y * 1.5 - warp * 0.7, 3)
      const small = cellular(x * 4.2 + warp * 1.4, y * 4.2 + warp, 9)
      const e1 = big.f2 - big.f1
      const e2 = small.f2 - small.f1
      // Break the cell borders up so they read as fractures, not a tiled pattern.
      const breakup = smoothstep(0.38, 0.62, fbm(x * 2.2 + 4.4, y * 2.2 - 1.3, 3))
      const line1 = (1 - smoothstep(0.002, 0.014, e1)) * (0.25 + 0.75 * breakup)
      const line2 = (1 - smoothstep(0.002, 0.01, e2)) * 0.3 * (1 - breakup * 0.7)
      // Fracture streaks radiating from each big shard's point, clear of the point itself.
      const ang = Math.atan2(big.dy, big.dx)
      const s = Math.abs(Math.sin(ang * 9 + big.id * 40 + fbm(x * 3, y * 3, 2) * 2.5))
      const streak = Math.pow(1 - s, 48) * smoothstep(0.03, 0.2, big.f1) * 0.45
      const hair = hash(px, py) > 0.9985 ? 0.35 : 0
      const lines = clamp01(line1 + line2 + streak + hair)
      // Crystal facets: each small cell is a flat plane lit a little differently.
      const facet = (small.id - 0.5) * 0.7
      const i = (py * SIZE + px) * 4

      // Near-black cores, rising through navy to sapphire at the crack faces.
      const interior = smoothstep(0, 0.4, e1)
      const glowEdge = 1 - smoothstep(0, 0.05, e1)
      const depth = clamp01(interior * 0.55 + (1 - cloud) * 0.55 - glowEdge * 0.3 - facet * 0.35 + 0.1)
      for (let k = 0; k < 3; k++) {
        const body = depth > 0.5 ? mix(mid[k], core[k], (depth - 0.5) * 2) : mix(bright[k], mid[k], depth * 2)
        C.img.data[i + k] = mix(body, crack[k], lines * 0.45)
      }
      C.img.data[i + 3] = 255

      const height = 0.7 - lines * 0.6 + facet * 0.3 * (1 - glowEdge)
      B.img.data[i] = B.img.data[i + 1] = B.img.data[i + 2] = 255 * clamp01(height)
      B.img.data[i + 3] = 255

      const rough = 255 * (0.04 + 0.2 * lines)
      R.img.data[i] = R.img.data[i + 1] = R.img.data[i + 2] = rough
      R.img.data[i + 3] = 255
    }
  }
  for (const m of [C, B, R]) m.ctx.putImageData(m.img, 0, 0)
  return { color: texture(C.c, true), bump: texture(B.c, false), roughness: texture(R.c, false), deep: generateDeep() }
}

/** Cellular border distance (f2 - f1) on a torus of n x n cells, so the image tiles. */
function tiledEdge(x: number, y: number, n: number, seed: number): number {
  const gx = x * n
  const gy = y * n
  const xi = Math.floor(gx)
  const yi = Math.floor(gy)
  let f1 = 9
  let f2 = 9
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = (((xi + i) % n) + n) % n
      const cy = (((yi + j) % n) + n) % n
      const dx = xi + i + hash(cx * 7 + seed, cy * 3) - gx
      const dy = yi + j + hash(cx * 5, cy * 11 + seed) - gy
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) f2 = d
    }
  }
  return f2 - f1
}

function generateDeep(): THREE.CanvasTexture {
  const D = paint(DEEP_SIZE)
  for (let py = 0; py < DEEP_SIZE; py++) {
    for (let px = 0; px < DEEP_SIZE; px++) {
      const x = px / DEEP_SIZE
      const y = py / DEEP_SIZE
      const i = (py * DEEP_SIZE + px) * 4
      D.img.data[i] = 255 * (1 - smoothstep(0, 0.05, tiledEdge(x, y, 5, 21)))
      D.img.data[i + 1] = 255 * (1 - smoothstep(0, 0.16, tiledEdge(x, y, 3, 57)))
      D.img.data[i + 2] = 0
      D.img.data[i + 3] = 255
    }
  }
  D.ctx.putImageData(D.img, 0, 0)
  const t = texture(D.c, false)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

let cached: IceTextures | null = null

export function iceTextures(): IceTextures {
  cached ??= generate()
  return cached
}
