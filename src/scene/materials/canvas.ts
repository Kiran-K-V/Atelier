import * as THREE from 'three'

/** Shared helpers for the procedural canvas textures (marble, snow, ice). */

export function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

export function fbm(x: number, y: number, octaves: number): number {
  let sum = 0
  let amp = 0.5
  let f = 1
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * f, y * f)
    f *= 2.03
    amp *= 0.5
  }
  return sum
}

export interface Cell {
  readonly f1: number
  readonly f2: number
  /** Random id of the nearest cell. */
  readonly id: number
  /** Offset from the sample to the nearest cell point. */
  readonly dx: number
  readonly dy: number
}

/**
 * Cellular noise: distances to the nearest (f1) and second nearest (f2) jittered cell point.
 * `f2 - f1` is near 0 on cell borders, which is where cracks and grain seams go.
 */
export function cellular(x: number, y: number, seed: number): Cell {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  let f1 = 9
  let f2 = 9
  let id = 0
  let ndx = 0
  let ndy = 0
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = xi + i
      const cy = yi + j
      const h = hash(cx + seed, cy - seed)
      const dx = cx + hash(cx * 7 + seed, cy * 3) - x
      const dy = cy + hash(cx * 5, cy * 11 + seed) - y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < f1) {
        f2 = f1
        f1 = d
        id = h
        ndx = dx
        ndy = dy
      } else if (d < f2) f2 = d
    }
  }
  return { f1, f2, id, dx: ndx, dy: ndy }
}

/** sRGB bytes; canvas pixels are sRGB, so no linear conversion here. */
export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const mix = (a: number, b: number, t: number) => a + (b - a) * t

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

export interface Paint {
  readonly c: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  readonly img: ImageData
}

export function paint(size: number): Paint {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  return { c, ctx, img: ctx.createImageData(size, size) }
}

export function texture(canvas: HTMLCanvasElement, color: boolean): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = 8
  return t
}
