import { describe, expect, it } from 'vitest'
import { shardAt, type ShardState } from './shards'

const launch = { x: 0, y: 0.4, z: 0, vx: 1.5, vy: 2, vz: -0.5, rest: 0.02 }
const out = (): ShardState => ({ x: 0, y: 0, z: 0, spin: 0 })

describe('shardAt', () => {
  it('starts at the launch point', () => {
    expect(shardAt(launch, 0, out())).toEqual({ x: 0, y: 0.4, z: 0, spin: 0 })
  })

  it('never sinks into the board and comes to rest on it', () => {
    for (let t = 0; t < 3; t += 0.005) expect(shardAt(launch, t, out()).y).toBeGreaterThanOrEqual(launch.rest - 1e-9)
    const a = shardAt(launch, 2, out())
    const b = shardAt(launch, 3, out())
    expect(a).toEqual(b)
    expect(a.y).toBeCloseTo(launch.rest, 6)
  })

  it('moves along its launch direction', () => {
    const p = shardAt(launch, 2, out())
    expect(p.x).toBeGreaterThan(0)
    expect(p.z).toBeLessThan(0)
  })
})
