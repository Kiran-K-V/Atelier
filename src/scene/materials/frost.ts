import type * as THREE from 'three'
import { fbm, hash, paint, texture } from './canvas'

const SIZE = 512

export interface FrostTextures {
  /** Near-white grayscale; multiplies the material colour by a few percent. */
  readonly color: THREE.CanvasTexture
  /** Green channel drives roughness: soft patches of slightly smoother frost. */
  readonly roughness: THREE.CanvasTexture
}

/** Frosted ice: fine, low-contrast mottling. No glitter, no grain you can count. */
function generate(): FrostTextures {
  const C = paint(SIZE)
  const R = paint(SIZE)
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const x = (px / SIZE) * 6
      const y = (py / SIZE) * 6
      const soft = fbm(x * 1.2 + 4.1, y * 1.2 - 2.7, 4)
      const fine = fbm(x * 9, y * 9, 2)
      const speck = hash(px, py)
      const i = (py * SIZE + px) * 4
      const v = 255 * (0.94 + 0.04 * soft + 0.015 * fine + 0.01 * speck)
      C.img.data[i] = C.img.data[i + 1] = C.img.data[i + 2] = Math.min(255, v)
      C.img.data[i + 3] = 255
      const r = 255 * (0.5 + 0.18 * soft + 0.08 * fine)
      R.img.data[i] = R.img.data[i + 1] = R.img.data[i + 2] = r
      R.img.data[i + 3] = 255
    }
  }
  C.ctx.putImageData(C.img, 0, 0)
  R.ctx.putImageData(R.img, 0, 0)
  return { color: texture(C.c, true), roughness: texture(R.c, false) }
}

let cached: FrostTextures | null = null

export function frostTextures(): FrostTextures {
  cached ??= generate()
  return cached
}
