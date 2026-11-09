import { describe, expect, it } from 'vitest'
import { noise1, shakeAmount, shakeAngles } from './shake'

describe('camera shake', () => {
  it('uses zero-mean noise', () => {
    let sum = 0
    const n = 20000
    for (let i = 0; i < n; i++) sum += noise1(i * 0.137)
    expect(Math.abs(sum / n)).toBeLessThan(0.02)
  })

  it('is bounded and continuous', () => {
    for (let x = 0; x < 50; x += 0.01) {
      expect(Math.abs(noise1(x))).toBeLessThanOrEqual(1)
      expect(Math.abs(noise1(x + 0.001) - noise1(x))).toBeLessThan(0.02)
    }
  })

  it('decays to zero over the duration', () => {
    expect(shakeAmount(0, 0.3, 0.2)).toBeCloseTo(0.04)
    expect(shakeAmount(0.15, 0.3, 0.2)).toBeLessThan(shakeAmount(0.05, 0.3, 0.2))
    expect(shakeAmount(0.3, 0.3, 0.2)).toBe(0)
    const out = shakeAngles(0.3, 0.3, 0.2, { yaw: 1, pitch: 1, roll: 1 })
    expect(Math.abs(out.yaw) + Math.abs(out.pitch) + Math.abs(out.roll)).toBe(0)
  })
})
