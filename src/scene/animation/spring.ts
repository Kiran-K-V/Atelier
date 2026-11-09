/**
 * One axis of a critically damped spring, advanced with the exact closed-form solution,
 * so the result does not depend on frame rate.
 */
export interface SpringState {
  x: number
  v: number
}

export function stepSpring(s: SpringState, target: number, omega: number, dt: number): void {
  const y = s.x - target
  const k = s.v + omega * y
  const e = Math.exp(-omega * dt)
  s.x = target + (y + k * dt) * e
  s.v = (s.v - omega * k * dt) * e
}
