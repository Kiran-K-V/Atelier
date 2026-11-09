import * as THREE from 'three'
import { scene } from '../../design/tokens'

const SIZE = 1024

/** Deterministic PRNG so the board looks the same on every load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function valueNoise(x: number, y: number): number {
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

function fbm(x: number, y: number, octaves: number): number {
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

/** sRGB bytes; canvas pixels are sRGB, so no linear conversion here. */
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t

export interface MarbleTextures {
  readonly light: THREE.CanvasTexture
  readonly dark: THREE.CanvasTexture
  /** Green channel drives roughness: veins are slightly less polished. */
  readonly roughness: THREE.CanvasTexture
}

function texture(canvas: HTMLCanvasElement, color: boolean): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = 8
  return t
}

/**
 * One noise field, three images: ivory marble with grey veins, basalt with pale veins,
 * and a shared roughness map. Generated once; squares sample random windows of it.
 */
function generate(): MarbleTextures {
  const make = () => {
    const c = document.createElement('canvas')
    c.width = c.height = SIZE
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('2D canvas unavailable')
    return { c, ctx, img: ctx.createImageData(SIZE, SIZE) }
  }
  const L = make()
  const D = make()
  const R = make()
  const lightBase = rgb(scene.squareLight)
  const lightVein = rgb('#9c907e')
  const lightGold = rgb('#c4a878')
  const darkBase = rgb(scene.squareDark)
  const darkVein = rgb('#8d8174')
  const darkHair = rgb('#b9ab95')

  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const x = (px / SIZE) * 6
      const y = (py / SIZE) * 6
      const warp = fbm(x * 0.6 + 11.3, y * 0.6 - 4.1, 4)
      const cloud = fbm(x * 1.4, y * 1.4, 4)
      const turb = fbm(x + warp * 2.2, y - warp * 1.7, 5)
      const s1 = Math.sin((x * 0.9 + y * 0.45) * 2.2 + turb * 7.5)
      const s2 = Math.sin((x * 0.3 - y * 1.1) * 4.3 + turb * 11 + 1.7)
      const vein = Math.pow(1 - Math.abs(s1), 9)
      const hair = Math.pow(1 - Math.abs(s2), 28)
      const i = (py * SIZE + px) * 4

      const shadeL = 0.955 + 0.07 * cloud
      const tv = Math.min(1, vein * 0.55 + hair * 0.35)
      const tg = hair * 0.25 * cloud
      for (let k = 0; k < 3; k++) {
        L.img.data[i + k] = mix(mix(lightBase[k] * shadeL, lightVein[k], tv), lightGold[k], tg)
      }
      L.img.data[i + 3] = 255

      const shadeD = 0.82 + 0.3 * cloud
      const td = Math.min(1, vein * 0.4 + hair * 0.15)
      for (let k = 0; k < 3; k++) {
        D.img.data[i + k] = mix(mix(darkBase[k] * shadeD, darkVein[k], td), darkHair[k], hair * 0.35)
      }
      D.img.data[i + 3] = 255

      const rough = 255 * (0.1 + 0.22 * Math.min(1, vein + hair) + 0.05 * cloud)
      R.img.data[i] = R.img.data[i + 1] = R.img.data[i + 2] = rough
      R.img.data[i + 3] = 255
    }
  }
  for (const m of [L, D, R]) m.ctx.putImageData(m.img, 0, 0)
  return { light: texture(L.c, true), dark: texture(D.c, true), roughness: texture(R.c, false) }
}

let cached: MarbleTextures | null = null

export function marbleTextures(): MarbleTextures {
  cached ??= generate()
  return cached
}
