import type { PieceSymbol } from '../../rules/types'

/**
 * Staunton silhouettes as 2D paths in the (radius, height) half-plane, in board units
 * (one square = 1). Each path starts on the axis at y = 0 and ends on the axis at the top,
 * so a lathe closes it. Kept as plain data so a later phase can resample two profiles
 * (THREE.Path.getSpacedPoints) and tween one into the other for promotion.
 */
export type ProfileCommand =
  | readonly ['M', r: number, y: number]
  | readonly ['L', r: number, y: number]
  | readonly ['Q', cr: number, cy: number, r: number, y: number]
  /** Arc around (cr, cy), counter-clockwise, angles in degrees (0 = +r, 90 = +y). */
  | readonly ['A', cr: number, cy: number, radius: number, fromDeg: number, toDeg: number]

export type Profile = readonly ProfileCommand[]

export type LatheType = Exclude<PieceSymbol, 'n'>

/** Weighted foot shared by every piece: fillet, band, bevel, bead, cove. Ends at (R - 0.085, 0.118). */
function foot(R: number): ProfileCommand[] {
  return [
    ['M', 0, 0],
    ['L', R - 0.012, 0],
    ['Q', R, 0, R, 0.012],
    ['L', R, 0.04],
    ['Q', R, 0.055, R - 0.015, 0.058],
    ['L', R - 0.03, 0.06],
    ['L', R - 0.04, 0.06],
    ['A', R - 0.05, 0.08, 0.022, -65, 100],
    ['Q', R - 0.08, 0.104, R - 0.085, 0.118],
  ]
}

export const BASE_RADIUS: Record<PieceSymbol, number> = {
  p: 0.25,
  r: 0.29,
  n: 0.29,
  b: 0.29,
  q: 0.32,
  k: 0.33,
}

/** Overall heights, used for hit volumes and lift math. */
export const PIECE_HEIGHT: Record<PieceSymbol, number> = {
  p: 0.55,
  r: 0.65,
  n: 0.75,
  b: 0.8,
  q: 0.96,
  k: 1.05,
}

export const PROFILES: Record<LatheType, Profile> = {
  p: [
    ...foot(BASE_RADIUS.p),
    ['Q', 0.1, 0.15, 0.085, 0.3],
    ['Q', 0.145, 0.3, 0.145, 0.317],
    ['Q', 0.145, 0.334, 0.09, 0.338],
    ['L', 0.065, 0.345],
    ['A', 0, 0.44, 0.105, -51.8, 90],
  ],
  r: [
    ...foot(BASE_RADIUS.r),
    ['Q', 0.17, 0.14, 0.175, 0.2],
    ['L', 0.155, 0.44],
    ['Q', 0.2, 0.44, 0.2, 0.46],
    ['L', 0.2, 0.47],
    ['Q', 0.2, 0.485, 0.18, 0.488],
    ['Q', 0.205, 0.5, 0.205, 0.52],
    ['L', 0.205, 0.58],
    ['L', 0.14, 0.58],
    ['L', 0.14, 0.55],
    ['L', 0, 0.55],
  ],
  b: [
    ...foot(BASE_RADIUS.b),
    ['Q', 0.13, 0.15, 0.11, 0.3],
    ['L', 0.088, 0.44],
    ['Q', 0.16, 0.44, 0.16, 0.455],
    ['Q', 0.16, 0.47, 0.11, 0.473],
    ['Q', 0.135, 0.476, 0.135, 0.486],
    ['Q', 0.135, 0.496, 0.085, 0.5],
    ['Q', 0.165, 0.53, 0.16, 0.6],
    ['Q', 0.155, 0.68, 0.035, 0.735],
    ['L', 0.025, 0.7455],
    ['A', 0, 0.77, 0.035, -44.4, 90],
  ],
  q: [
    ...foot(BASE_RADIUS.q),
    ['Q', 0.15, 0.15, 0.13, 0.3],
    ['Q', 0.105, 0.48, 0.098, 0.6],
    ['Q', 0.1, 0.74, 0.175, 0.8],
    ['Q', 0.19, 0.805, 0.185, 0.82],
    ['L', 0.17, 0.83],
    ['L', 0.13, 0.835],
    ['Q', 0.1, 0.84, 0.09, 0.87],
    ['Q', 0.075, 0.9, 0.022, 0.9076],
    ['A', 0, 0.928, 0.03, -42.8, 90],
  ],
  k: [
    ...foot(BASE_RADIUS.k),
    ['Q', 0.16, 0.15, 0.14, 0.31],
    ['Q', 0.115, 0.5, 0.108, 0.64],
    ['Q', 0.11, 0.78, 0.17, 0.83],
    ['Q', 0.185, 0.835, 0.18, 0.85],
    ['L', 0.165, 0.86],
    ['Q', 0.12, 0.865, 0.11, 0.89],
    ['Q', 0.1, 0.92, 0.05, 0.925],
    ['L', 0.045, 0.935],
    ['L', 0, 0.935],
  ],
}

/** The knight's lathe part: the shared foot plus a low plinth the carved head stands on. */
export const KNIGHT_PLINTH: Profile = [
  ...foot(BASE_RADIUS.n),
  ['Q', 0.19, 0.125, 0.19, 0.14],
  ['Q', 0.19, 0.155, 0.17, 0.155],
  ['L', 0, 0.155],
]
