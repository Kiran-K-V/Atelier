import * as THREE from 'three'
import { sceneSets } from '../../design/tokens'
import { fbm, hash, mix, paint, rgb, texture } from './canvas'

const SIZE = 1024

export interface WoodTextures {
  readonly light: THREE.CanvasTexture
  readonly dark: THREE.CanvasTexture
  /** Green channel drives roughness: the soft early-growth bands are a little rougher than the dense lines. */
  readonly roughness: THREE.CanvasTexture
}

interface Species {
  readonly base: [number, number, number]
  readonly line: [number, number, number]
  /** Growth rings per texture width. */
  readonly rings: number
  /** How strongly the ring lines darken the base. */
  readonly contrast: number
  /** Open-pore speckle, 0 for tight-grained maple. */
  readonly pores: number
}

const MAPLE: Species = { base: rgb(sceneSets.wood.squareLight), line: rgb('#a8793f'), rings: 30, contrast: 0.3, pores: 0.03 }
const WALNUT: Species = { base: rgb(sceneSets.wood.squareDark), line: rgb('#2a1409'), rings: 38, contrast: 0.42, pores: 0.1 }

/** Plank grain: warped growth rings seen along the board, long fibres, and pores. Squares sample random windows of it. */
function plank(species: Species, data: Uint8ClampedArray, rough: Uint8ClampedArray, seed: number): void {
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const x = (px / SIZE) * 4
      const y = (py / SIZE) * 4
      const warp = fbm(x * 0.35 + seed, y * 0.5 - seed, 4)
      const ring = y * species.rings * 0.25 + warp * 1.5 + fbm(x * 0.4, y * 2.2 + seed, 3) * 0.7
      const band = 0.5 + 0.5 * Math.sin(ring * Math.PI * 2)
      const late = Math.pow(band, 1.8)
      // Fibres run along x: low frequency across the board, very high down the grain.
      const fibre = fbm(x * 1.3 + seed, y * 46, 3)
      const pore = hash(px * 3 + seed, py) > 1 - species.pores * (0.4 + fbm(x * 3, y * 9, 2)) ? 0.45 : 1
      const shade = (0.93 + 0.14 * fibre) * pore
      const t = Math.min(1, late * species.contrast + (1 - fibre) * 0.12)
      const i = (py * SIZE + px) * 4
      for (let k = 0; k < 3; k++) data[i + k] = mix(species.base[k], species.line[k], t) * shade
      data[i + 3] = 255
      rough[i] = rough[i + 1] = rough[i + 2] = 255 * (0.34 + 0.2 * late + 0.06 * fibre)
      rough[i + 3] = 255
    }
  }
}

function generate(): WoodTextures {
  const L = paint(SIZE)
  const D = paint(SIZE)
  const R = paint(SIZE)
  const unused = new Uint8ClampedArray(SIZE * SIZE * 4)
  plank(MAPLE, L.img.data, R.img.data, 5.3)
  plank(WALNUT, D.img.data, unused, 17.9)
  for (const m of [L, D, R]) m.ctx.putImageData(m.img, 0, 0)
  return { light: texture(L.c, true), dark: texture(D.c, true), roughness: texture(R.c, false) }
}

let cached: WoodTextures | null = null

export function woodTextures(): WoodTextures {
  cached ??= generate()
  return cached
}
