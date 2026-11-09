import { describe, expect, it } from 'vitest'
import { knightCorner, leanEuler, quad, quadControlForPeak } from './path'

describe('knightCorner', () => {
  it('turns at the end of the long leg', () => {
    expect(knightCorner('g1', 'f3')).toBe('g3')
    expect(knightCorner('b1', 'd2')).toBe('d1')
    expect(knightCorner('e5', 'c4')).toBe('c5')
    expect(knightCorner('d4', 'e2')).toBe('d2')
  })

  it('returns null for moves that are not an L', () => {
    expect(knightCorner('a1', 'a3')).toBeNull()
    expect(knightCorner('a1', 'c3')).toBeNull()
  })
})

describe('quadratic arc', () => {
  it('peaks at the requested height between uneven endpoints', () => {
    const c = quadControlForPeak(0.6, 0, 0.85)
    expect(quad(0.6, c, 0, 0.5)).toBeCloseTo(0.85)
    expect(quad(0.6, c, 0, 0)).toBe(0.6)
    expect(quad(0.6, c, 0, 1)).toBe(0)
  })
})

describe('leanEuler', () => {
  it('tips the top toward the direction of travel', () => {
    expect(leanEuler(0, 1, 0.1)).toEqual({ x: 0.1, z: -0 })
    expect(leanEuler(1, 0, 0.1)).toEqual({ x: 0, z: -0.1 })
  })
})
