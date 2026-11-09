/** 1D gradient noise: zero at integers, smooth, roughly in [-1, 1], zero mean. */
export function noise1(x: number): number {
  const i = Math.floor(x)
  const f = x - i
  const g0 = gradient(i)
  const g1 = gradient(i + 1)
  const u = f * f * f * (f * (f * 6 - 15) + 10)
  return 2 * (g0 * f + (g1 * (f - 1) - g0 * f) * u)
}

function gradient(i: number): number {
  let h = Math.imul(i, 0x27d4eb2d) ^ 0x165667b1
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h ^= h >>> 13
  return ((h >>> 0) / 4294967296) * 2 - 1
}

/** Trauma model: amplitude is the square of the remaining trauma, so small knocks stay subtle. */
export function shakeAmount(t: number, duration: number, intensity: number): number {
  if (t < 0 || t >= duration || duration <= 0) return 0
  const trauma = intensity * (1 - t / duration)
  return trauma * trauma
}

export interface ShakeAngles {
  yaw: number
  pitch: number
  roll: number
}

const MAX_ANGLE = 0.35
const FREQUENCY = 16

/** Writes the camera rotation offset (radians) at time `t` into `out`. */
export function shakeAngles(t: number, duration: number, intensity: number, out: ShakeAngles): ShakeAngles {
  const a = shakeAmount(t, duration, intensity) * MAX_ANGLE
  const x = t * FREQUENCY
  out.yaw = a * noise1(x + 11.3)
  out.pitch = a * noise1(x + 57.9)
  out.roll = 0.5 * a * noise1(x + 103.1)
  return out
}
