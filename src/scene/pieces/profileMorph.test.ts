import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { matchedProfiles, resampleByArcLength } from './profileMorph'
import { PROFILES, type LatheType } from './profiles'

const v = (x: number, y: number) => new THREE.Vector2(x, y)

describe('resampleByArcLength', () => {
  it('keeps endpoints and spaces points evenly', () => {
    const out = resampleByArcLength([v(0, 0), v(1, 0), v(1, 1)], 5)
    expect(out).toHaveLength(5)
    expect(out[0].toArray()).toEqual([0, 0])
    expect(out[4].toArray()).toEqual([1, 1])
    expect(out[2].x).toBeCloseTo(1)
    expect(out[2].y).toBeCloseTo(0)
    expect(out[1].x).toBeCloseTo(0.5)
  })

  it('survives repeated points', () => {
    const out = resampleByArcLength([v(0, 0), v(0, 0), v(0, 2)], 3)
    expect(out.map((p) => p.y)).toEqual([0, 1, 2])
  })
})

describe('matchedProfiles', () => {
  const types: LatheType[] = ['p', 'r', 'b', 'q', 'k']

  it('returns equal counts for every lathe type and keeps the axis endpoints', () => {
    for (const to of types) {
      const [a, b] = matchedProfiles(PROFILES.p, PROFILES[to], 64)
      expect(a).toHaveLength(64)
      expect(b).toHaveLength(64)
      expect(a[0].toArray()).toEqual([0, 0])
      expect(b[0].toArray()).toEqual([0, 0])
      expect(a[63].x).toBeCloseTo(0)
      expect(b[63].x).toBeCloseTo(0)
      expect(b[63].y).toBeGreaterThan(0.5)
    }
  })

  it('maps the end of the foot onto the end of the foot', () => {
    const [a, b] = matchedProfiles(PROFILES.p, PROFILES.q, 64)
    const footEnd = Math.round(64 * 0.3) - 1
    expect(a[footEnd].y).toBeCloseTo(0.118, 3)
    expect(b[footEnd].y).toBeCloseTo(0.118, 3)
  })

  it('builds lathes with identical vertex counts', () => {
    const [a, b] = matchedProfiles(PROFILES.p, PROFILES.r, 64)
    const ga = new THREE.LatheGeometry(a, 24)
    const gb = new THREE.LatheGeometry(b, 24)
    expect(ga.getAttribute('position').count).toBe(gb.getAttribute('position').count)
  })
})
