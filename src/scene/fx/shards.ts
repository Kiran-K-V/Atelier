export interface ShardLaunch {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly vx: number
  readonly vy: number
  readonly vz: number
  /** Half-height of the chip, so it rests on the board instead of in it. */
  readonly rest: number
}

export interface ShardState {
  x: number
  y: number
  z: number
  /** Seconds of full-speed spin so far: spin slows after the bounce and stops at rest. */
  spin: number
}

export const SHARD_GRAVITY = 9
const BOUNCE = 0.35
const FRICTION = 0.45

/** Ballistic flight, one damped bounce on the board (y = 0), then rest. Writes into `out`. */
export function shardAt(s: ShardLaunch, t: number, out: ShardState): ShardState {
  const g = SHARD_GRAVITY
  const t1 = (s.vy + Math.sqrt(s.vy * s.vy + 2 * g * Math.max(0, s.y - s.rest))) / g
  if (t <= t1) {
    out.x = s.x + s.vx * t
    out.y = s.y + s.vy * t - 0.5 * g * t * t
    out.z = s.z + s.vz * t
    out.spin = t
    return out
  }
  const vy1 = -(s.vy - g * t1) * BOUNCE
  const t2 = (2 * vy1) / g
  const tb = Math.min(t - t1, t2)
  out.x = s.x + s.vx * (t1 + FRICTION * tb)
  out.y = s.rest + vy1 * tb - 0.5 * g * tb * tb
  out.z = s.z + s.vz * (t1 + FRICTION * tb)
  out.spin = t1 + 0.4 * tb
  return out
}
