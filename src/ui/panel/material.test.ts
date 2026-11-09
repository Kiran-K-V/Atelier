import { describe, expect, it } from 'vitest'
import type { PlayedMove } from '../../rules/types'
import { materialFromHistory } from './material'

let ply = 0
const move = (over: Partial<PlayedMove>): PlayedMove => ({
  ply: ++ply,
  color: 'w',
  piece: 'p',
  from: 'e2',
  to: 'e4',
  san: 'e4',
  isCheck: false,
  fenAfter: '',
  tactics: [],
  ...over,
})
const takes = (color: 'w' | 'b', type: PlayedMove['piece']): PlayedMove => move({ color, captured: { id: `${type}${ply}`, type, square: 'd5' } })

describe('materialFromHistory', () => {
  it('is empty and level at the start', () => {
    expect(materialFromHistory([])).toEqual({ w: { groups: [], lead: 0 }, b: { groups: [], lead: 0 } })
  })

  it('ignores quiet moves', () => {
    expect(materialFromHistory([move({}), move({ color: 'b' })]).w.lead).toBe(0)
  })

  it('groups captures by type, cheapest first', () => {
    const m = materialFromHistory([takes('w', 'q'), takes('w', 'p'), takes('w', 'n'), takes('w', 'p')])
    expect(m.w.groups).toEqual([
      { type: 'p', count: 2 },
      { type: 'n', count: 1 },
      { type: 'q', count: 1 },
    ])
    expect(m.b.groups).toEqual([])
  })

  it('gives the lead only to the side that is ahead', () => {
    // White wins a rook and a pawn (6), Black wins a knight (3): White +3.
    const m = materialFromHistory([takes('w', 'r'), takes('b', 'n'), takes('w', 'p')])
    expect(m.w.lead).toBe(3)
    expect(m.b.lead).toBe(0)
  })

  it('is level after an even trade', () => {
    const m = materialFromHistory([takes('w', 'b'), takes('b', 'n')])
    expect(m.w.lead).toBe(0)
    expect(m.b.lead).toBe(0)
  })

  it('counts a promotion as the new piece minus the pawn', () => {
    const m = materialFromHistory([move({ color: 'b', promotion: 'q', san: 'e1=Q' })])
    expect(m.b.lead).toBe(8)
    expect(m.b.groups).toEqual([])
  })

  it('counts a capturing under-promotion twice over', () => {
    const m = materialFromHistory([move({ promotion: 'n', captured: { id: 'br', type: 'r', square: 'h8' } })])
    expect(m.w.lead).toBe(5 + 2)
    expect(m.w.groups).toEqual([{ type: 'r', count: 1 }])
  })
})
