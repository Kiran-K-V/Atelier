import { describe, expect, it } from 'vitest'
import { pathPoint } from './path'

describe('pathPoint', () => {
  const from = { x: -2.5, z: 3.5 }
  const to = { x: 1.5, z: -0.5 }

  it('starts and ends on the squares, with or without sway', () => {
    for (const sway of [0, 0.2]) {
      expect(pathPoint(from, to, 0, sway, { x: 0, z: 0 })).toEqual(from)
      const end = pathPoint(from, to, 1, sway, { x: 0, z: 0 })
      expect(end.x).toBeCloseTo(to.x, 10)
      expect(end.z).toBeCloseTo(to.z, 10)
    }
  })

  it('sways perpendicular to the path', () => {
    const straight = pathPoint(from, to, 0.25, 0, { x: 0, z: 0 })
    const swayed = pathPoint(from, to, 0.25, 0.2, { x: 0, z: 0 })
    const along = (swayed.x - straight.x) * (to.x - from.x) + (swayed.z - straight.z) * (to.z - from.z)
    expect(Math.abs(along)).toBeLessThan(1e-9)
    expect(Math.hypot(swayed.x - straight.x, swayed.z - straight.z)).toBeGreaterThan(0.1)
  })
})
