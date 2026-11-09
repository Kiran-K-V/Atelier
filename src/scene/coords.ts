import type { Color, Square } from '../rules/types'

const FILES = 'abcdefgh'

export type Vec3 = readonly [x: number, y: number, z: number]

export const ALL_SQUARES: readonly Square[] = Array.from(FILES).flatMap((f) =>
  [1, 2, 3, 4, 5, 6, 7, 8].map((r) => `${f}${r}` as Square),
)

/** 0-based file and rank indices. */
export function squareIndex(square: Square): { file: number; rank: number } {
  return { file: FILES.indexOf(square[0]), rank: Number(square[1]) - 1 }
}

export function isLightSquare(square: Square): boolean {
  const { file, rank } = squareIndex(square)
  return (file + rank) % 2 === 1
}

/** Board lies in XZ, y up, one unit per square; rank 1 is at +z (white's side). */
export function squareToPosition(square: Square, y = 0): Vec3 {
  const { file, rank } = squareIndex(square)
  return [file - 3.5, y, 3.5 - rank]
}

export function positionToSquare(x: number, z: number): Square | null {
  const file = Math.floor(x + 4)
  const rank = Math.floor(4 - z)
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null
  return `${FILES[file]}${rank + 1}` as Square
}

/** Camera azimuth around +y, measured from +z: the player's side of the board faces the camera. */
export function cameraAzimuth(orientation: Color): number {
  return orientation === 'w' ? 0 : Math.PI
}
