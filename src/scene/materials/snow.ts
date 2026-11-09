import type * as THREE from 'three'
import { sceneSets } from '../../design/tokens'
import { cellular, clamp01, fbm, hash, mix, paint, rgb, smoothstep, texture } from './canvas'

const SIZE = 1024

export interface SnowTextures {
  readonly color: THREE.CanvasTexture
  /** Grayscale height: packed granules at two scales over soft drifts. */
  readonly bump: THREE.CanvasTexture
  /** Green channel drives roughness; sparse glassy specks make the glints. */
  readonly roughness: THREE.CanvasTexture
}

/**
 * Packed snow: soft drifts, rounded granules at two scales, cool blue in the hollows and sparse
 * ice crystals that are near mirror smooth, so the studio lights glint off them.
 * Same 6-unit domain as the marble, so squares sample comparable windows.
 */
function generate(): SnowTextures {
  const C = paint(SIZE)
  const B = paint(SIZE)
  const R = paint(SIZE)
  const base = rgb(sceneSets.glacier.squareLight)
  const hollow = rgb('#a9bccb')
  const crystal = rgb('#ffffff')

  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const x = (px / SIZE) * 6
      const y = (py / SIZE) * 6
      const drift = fbm(x * 0.8 + 3.1, y * 0.8 - 7.7, 4)
      const a = cellular(x * 15, y * 15, 17)
      const b = cellular(x * 38 + 0.5, y * 38, 41)
      const fine = hash(px, py)
      const grainA = 1 - smoothstep(0, 0.75, a.f1)
      const grainB = 1 - smoothstep(0, 0.7, b.f1)
      const h = clamp01(0.3 * drift + 0.36 * grainA + 0.24 * grainB + 0.1 * fine)
      // Glitter: sparse crystals on big granules plus a fine mica dust on the small ones.
      const sparkle = Math.max(
        a.id > 0.955 && a.f1 < 0.2 ? 1 - smoothstep(0.08, 0.2, a.f1) : 0,
        b.id > 0.93 && b.f1 < 0.25 ? 1 - smoothstep(0.1, 0.25, b.f1) : 0,
      )
      const i = (py * SIZE + px) * 4

      // Hollows (between granules and in drift troughs) go a faint cool blue.
      const tint = clamp01((0.6 - h) * 1.6) * 0.6 + clamp01(0.55 - drift) * 0.35
      const shade = 0.9 + 0.08 * grainA + 0.02 * fine
      for (let k = 0; k < 3; k++) {
        C.img.data[i + k] = mix(mix(base[k] * shade, hollow[k], tint), crystal[k], sparkle)
      }
      C.img.data[i + 3] = 255

      B.img.data[i] = B.img.data[i + 1] = B.img.data[i + 2] = 255 * h
      B.img.data[i + 3] = 255

      const rough = 255 * mix(0.62 + 0.25 * (1 - grainB) + 0.08 * fine, 0.04, sparkle)
      R.img.data[i] = R.img.data[i + 1] = R.img.data[i + 2] = rough
      R.img.data[i + 3] = 255
    }
  }
  for (const m of [C, B, R]) m.ctx.putImageData(m.img, 0, 0)
  return { color: texture(C.c, true), bump: texture(B.c, false), roughness: texture(R.c, false) }
}

let cached: SnowTextures | null = null

export function snowTextures(): SnowTextures {
  cached ??= generate()
  return cached
}
