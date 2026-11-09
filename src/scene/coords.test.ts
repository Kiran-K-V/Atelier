import { describe, expect, it } from 'vitest'
import { ALL_SQUARES, cameraAzimuth, isLightSquare, positionToSquare, squareToPosition } from './coords'

describe('coords', () => {
  it('has 64 unique squares', () => {
    expect(new Set(ALL_SQUARES).size).toBe(64)
  })

  it('round-trips every square through its center and near its edges', () => {
    for (const sq of ALL_SQUARES) {
      const [x, , z] = squareToPosition(sq)
      expect(positionToSquare(x, z)).toBe(sq)
      expect(positionToSquare(x + 0.49, z - 0.49)).toBe(sq)
      expect(positionToSquare(x - 0.49, z + 0.49)).toBe(sq)
    }
  })

  it('puts a1 at the lower-left of the white player (camera at +z)', () => {
    expect(squareToPosition('a1')).toEqual([-3.5, 0, 3.5])
    expect(squareToPosition('h8')).toEqual([3.5, 0, -3.5])
    expect(squareToPosition('e2', 0.6)[1]).toBe(0.6)
  })

  it('returns null off the board', () => {
    expect(positionToSquare(4.01, 0)).toBeNull()
    expect(positionToSquare(0, -4.01)).toBeNull()
    expect(positionToSquare(-4.2, 3)).toBeNull()
  })

  it('colors a1 dark and h1 light', () => {
    expect(isLightSquare('a1')).toBe(false)
    expect(isLightSquare('h1')).toBe(true)
  })

  it('faces the camera toward the oriented player', () => {
    // Camera direction from target: (sin az, cos az) in XZ. White sits at +z, black at -z.
    expect(Math.cos(cameraAzimuth('w'))).toBeCloseTo(1)
    expect(Math.cos(cameraAzimuth('b'))).toBeCloseTo(-1)
    const [, , zWhiteHome] = squareToPosition('e1')
    const [, , zBlackHome] = squareToPosition('e8')
    expect(Math.sign(zWhiteHome)).toBe(Math.sign(Math.cos(cameraAzimuth('w'))))
    expect(Math.sign(zBlackHome)).toBe(Math.sign(Math.cos(cameraAzimuth('b'))))
  })
})
