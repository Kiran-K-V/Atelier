import * as THREE from 'three'
import { hash, paint, smoothstep, texture } from './canvas'

const DEEP_SIZE = 512

export interface IceTextures {
  /**
   * Faint interior of the glass tiles, sampled in world space with a view parallax (see depth.ts).
   * Tileable. R: a deep cloudy veil. G: tiny bubbles. B: a faint frost veil.
   */
  readonly deep: THREE.CanvasTexture
}

function generate(): IceTextures {
  return { deep: generateDeep() }
}

/** Value noise whose lattice wraps every `period` cells, so the image tiles. */
function tiledNoise(x: number, y: number, period: number, seed: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const u = x - xi
  const v = y - yi
  const su = u * u * (3 - 2 * u)
  const sv = v * v * (3 - 2 * v)
  const w = (n: number) => ((n % period) + period) % period
  const h = (a: number, b: number) => hash(w(a) + seed, w(b) - seed)
  const a = h(xi, yi)
  const b = h(xi + 1, yi)
  const c = h(xi, yi + 1)
  const d = h(xi + 1, yi + 1)
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv
}

function tiledFbm(x: number, y: number, period: number, octaves: number, seed: number): number {
  let sum = 0
  let amp = 0.5
  let f = 1
  for (let i = 0; i < octaves; i++) {
    sum += amp * tiledNoise(x * f, y * f, period * f, seed + i * 17)
    f *= 2
    amp *= 0.5
  }
  return sum
}

/** Nearest jittered point on a wrapping grid of n cells: distance and cell id. */
function tiledCell(x: number, y: number, n: number, seed: number): { f1: number; id: number } {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  let f1 = 9
  let id = 0
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = (((xi + i) % n) + n) % n
      const cy = (((yi + j) % n) + n) % n
      const dx = xi + i + 0.2 + 0.6 * hash(cx * 7 + seed, cy * 3) - x
      const dy = yi + j + 0.2 + 0.6 * hash(cx * 5, cy * 11 + seed) - y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < f1) {
        f1 = d
        id = hash(cx + seed, cy - seed)
      }
    }
  }
  return { f1, id }
}

function generateDeep(): THREE.CanvasTexture {
  const D = paint(DEEP_SIZE)
  const BUBBLES = 36
  for (let py = 0; py < DEEP_SIZE; py++) {
    for (let px = 0; px < DEEP_SIZE; px++) {
      const x = px / DEEP_SIZE
      const y = py / DEEP_SIZE
      const veil = smoothstep(0.45, 0.8, tiledFbm(x * 4, y * 4, 4, 4, 5))
      const b = tiledCell(x * BUBBLES, y * BUBBLES, BUBBLES, 71)
      const radius = 0.05 + 0.08 * ((b.id * 7.31) % 1)
      // Sharp-edged bubbles with a bright rim, like air caught in clear ice.
      const bubble = b.id > 0.93 ? Math.max(1 - smoothstep(radius * 0.8, radius, b.f1), 0) * (0.45 + 0.55 * smoothstep(radius * 0.4, radius * 0.85, b.f1)) : 0
      // Frost: thin wispy sheets (the band where a finer noise crosses its midpoint).
      const frost = 1 - smoothstep(0, 0.06, Math.abs(tiledFbm(x * 6, y * 6, 6, 4, 29) - 0.5))
      const i = (py * DEEP_SIZE + px) * 4
      D.img.data[i] = 255 * veil
      D.img.data[i + 1] = 255 * bubble
      D.img.data[i + 2] = 255 * frost
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
