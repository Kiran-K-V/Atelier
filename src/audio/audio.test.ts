import { describe, expect, it } from 'vitest'
import type { Square } from '../rules/types'
import { panForSquare, playSound } from './index'

describe('panForSquare', () => {
  it('pans the a-file left and the h-file right, symmetrically', () => {
    expect(panForSquare('a1')).toBeCloseTo(-0.6)
    expect(panForSquare('h8')).toBeCloseTo(0.6)
    expect(panForSquare('a4')).toBeCloseTo(-panForSquare('h4'))
  })

  it('keeps the middle files near the center', () => {
    expect(Math.abs(panForSquare('d4'))).toBeLessThan(0.1)
    expect(Math.abs(panForSquare('e4'))).toBeLessThan(0.1)
  })

  it('moves steadily right with the file and ignores the rank', () => {
    const pans = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((f) => panForSquare(`${f}1` as Square))
    expect(pans).toEqual([...pans].sort((x, y) => x - y))
    expect(panForSquare('c2')).toBe(panForSquare('c7'))
  })

  it('never leaves the stereo field', () => {
    expect(panForSquare('z1' as Square)).toBe(1)
    expect(panForSquare('!1' as Square)).toBe(-1)
  })
})

describe('playSound without a browser', () => {
  it('is a safe no-op for every call shape', () => {
    expect(typeof window).toBe('undefined')
    expect(() => playSound('pawnStep')).not.toThrow()
    expect(() => playSound('mate', 'e1')).not.toThrow()
  })
})
