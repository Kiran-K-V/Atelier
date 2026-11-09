import { describe, expect, it } from 'vitest'
import { RIPPLE, rippleHeight } from './ripple'

describe('rippleHeight', () => {
  it('is still before the impact and after the wave ends', () => {
    expect(rippleHeight(0, 0, 1)).toBe(0)
    expect(rippleHeight(0, -0.1, 1)).toBe(0)
    expect(rippleHeight(0.5, RIPPLE.duration, 1)).toBe(0)
  })

  it('does not move tiles the wave front has not reached', () => {
    expect(rippleHeight(3, 0.2, 1)).toBe(0)
  })

  it('stays within the amplitude and scales with strength', () => {
    let max = 0
    for (let t = 0.01; t < RIPPLE.duration; t += 0.01) {
      for (let d = 0; d < 6; d += 0.25) max = Math.max(max, Math.abs(rippleHeight(d, t, 1)))
    }
    expect(max).toBeGreaterThan(RIPPLE.amplitude * 0.2)
    expect(max).toBeLessThanOrEqual(RIPPLE.amplitude)
    expect(rippleHeight(0.5, 0.3, 0.5)).toBeCloseTo(rippleHeight(0.5, 0.3, 1) / 2, 10)
  })

  it('has mostly settled by the last third', () => {
    for (let d = 0; d < 4; d += 0.5) expect(Math.abs(rippleHeight(d, RIPPLE.duration * 0.75, 1))).toBeLessThan(RIPPLE.amplitude * 0.05)
  })
})
