export interface Point2 {
  x: number
  z: number
}

/**
 * Point at `u` in [0, 1] along a straight path with an optional S-shaped sway
 * (perpendicular offset, zero at both ends). Writes into `out`.
 */
export function pathPoint(from: Point2, to: Point2, u: number, sway: number, out: Point2): Point2 {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const len = Math.hypot(dx, dz) || 1
  const side = sway * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * u)
  out.x = from.x + dx * u - (dz / len) * side
  out.z = from.z + dz * u + (dx / len) * side
  return out
}
