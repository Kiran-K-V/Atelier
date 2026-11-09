import { describe, expect, it } from 'vitest'
import { curriculum } from '../../academy/curriculum'
import { skillId } from '../../academy/types'
import { ancestors, dependents, LABEL_H, layoutSkillMap, NODE_R } from './skillMapLayout'

describe('layoutSkillMap', () => {
  for (const width of [640, 828, 1200]) {
    const map = layoutSkillMap(curriculum, width)

    it(`places every skill once, in curriculum order, at ${width}px`, () => {
      expect(map.nodes.map((n) => n.skill.id)).toEqual(curriculum.skills.map((s) => s.id))
    })

    it(`keeps nodes apart and inside the map at ${width}px`, () => {
      for (const [i, a] of map.nodes.entries()) {
        expect(a.x - NODE_R).toBeGreaterThanOrEqual(0)
        expect(a.x + NODE_R).toBeLessThanOrEqual(width)
        for (const b of map.nodes.slice(i + 1)) {
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(2 * NODE_R + 40)
        }
      }
    })

    it(`puts each node inside its level band, bands top to bottom at ${width}px`, () => {
      expect(map.bands.map((b) => b.level.id)).toEqual(curriculum.levels.map((l) => l.id))
      map.bands.forEach((b, i) => i > 0 && expect(b.y).toBe(map.bands[i - 1].y + map.bands[i - 1].height))
      for (const n of map.nodes) {
        const band = map.bands[n.band]
        expect(band.level.id).toBe(n.skill.level)
        expect(n.y - NODE_R).toBeGreaterThan(band.y)
        expect(n.y + NODE_R).toBeLessThan(band.y + band.height)
      }
      expect(map.height).toBe(map.bands.at(-1)!.y + map.bands.at(-1)!.height)
    })

    it(`draws one link per prerequisite, node to node, at ${width}px`, () => {
      const expected = curriculum.skills.flatMap((s) => s.prerequisites.map((p) => `${p}>${s.id}`))
      expect(map.links.map((e) => `${e.from}>${e.to}`).sort()).toEqual(expected.sort())
      const at = new Map(map.nodes.map((n) => [n.skill.id, n]))
      for (const e of map.links) {
        const from = at.get(e.from)!
        const to = at.get(e.to)!
        expect(e.d.startsWith(`M${from.x} ${from.y}`)).toBe(true)
        expect(e.d.endsWith(`${to.x} ${to.y}`)).toBe(true)
        expect(e.d).not.toMatch(/NaN|Infinity/)
      }
    })

    it(`draws a quiet path: one step from each skill to the next at ${width}px`, () => {
      expect(map.edges.map((e) => `${e.from}>${e.to}`)).toEqual(
        curriculum.skills.slice(1).map((s, i) => `${curriculum.skills[i].id}>${s.id}`),
      )
      for (const e of map.edges) expect(e.d).not.toMatch(/NaN|Infinity/)
    })

    it(`keeps path steps out of every label at ${width}px`, () => {
      const at = new Map(map.nodes.map((n) => [n.skill.id, n]))
      for (const e of map.edges) {
        const from = at.get(e.from)!
        const to = at.get(e.to)!
        if (from.y === to.y) continue
        // A step between rows starts below the label block and ends above the next medallion.
        expect(e.d.startsWith(`M${from.x} ${from.y + NODE_R + LABEL_H}`)).toBe(true)
        expect(e.d.endsWith(`${to.x} ${to.y - NODE_R}`)).toBe(true)
      }
    })

    it(`centres each row of nodes at ${width}px`, () => {
      const rows = new Map<number, number[]>()
      for (const n of map.nodes) rows.set(n.y, [...(rows.get(n.y) ?? []), n.x])
      for (const xs of rows.values()) expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(width, 0)
    })
  }

  it('is deterministic', () => {
    expect(layoutSkillMap(curriculum, 900)).toEqual(layoutSkillMap(curriculum, 900))
  })

  it('stacks a second skill with the same column into the next row', () => {
    const map = layoutSkillMap(curriculum, 900)
    const board = map.nodes.find((n) => n.skill.id === 'board')!
    const attack = map.nodes.find((n) => n.skill.id === 'attack-defend')!
    expect(attack.x).toBe(board.x)
    expect(attack.row).toBe(1)
    expect(attack.y).toBeGreaterThan(board.y)
  })
})

describe('prerequisite chains', () => {
  it('finds every skill a skill needs, directly or not', () => {
    const need = ancestors(curriculum, skillId('attack-defend'))
    expect([...need].sort()).toEqual(['board', 'knight', 'pawn', 'queen-king', 'rook-bishop'])
    expect(ancestors(curriculum, skillId('board')).size).toBe(0)
  })
  it('finds every skill that builds on a skill', () => {
    expect(dependents(curriculum, skillId('board')).size).toBe(curriculum.skills.length - 1)
    expect([...dependents(curriculum, skillId('zwischenzug'))]).toEqual(['calculation'])
    expect(dependents(curriculum, skillId('calculation')).size).toBe(0)
  })
})
