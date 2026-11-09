import { describe, expect, it } from 'vitest'
import { stepSpring, type SpringState } from './spring'

function run(dt: number, total: number): SpringState {
  const s: SpringState = { x: 0, v: 0 }
  for (let t = 0; t < total - 1e-9; t += dt) stepSpring(s, 1, 18, dt)
  return s
}

describe('stepSpring', () => {
  it('gives the same result at 30, 60 and 144 fps', () => {
    const a = run(1 / 30, 0.2)
    const b = run(1 / 60, 0.2)
    const c = run(1 / 144, 0.2 + 1e-12)
    expect(b.x).toBeCloseTo(a.x, 6)
    expect(c.x).toBeCloseTo(a.x, 2)
  })

  it('settles on the target without overshoot', () => {
    const s: SpringState = { x: 0, v: 0 }
    let max = 0
    for (let i = 0; i < 120; i++) {
      stepSpring(s, 1, 18, 1 / 60)
      max = Math.max(max, s.x)
    }
    expect(max).toBeLessThanOrEqual(1 + 1e-9)
    expect(s.x).toBeCloseTo(1, 4)
  })
})
