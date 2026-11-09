import { describe, expect, it } from 'vitest'
import type { Color, PlayedMove } from '../../rules/types'
import { moveRows } from './moveRows'

const move = (san: string, color: Color): PlayedMove => ({
  ply: 0,
  color,
  piece: 'p',
  from: 'e2',
  to: 'e4',
  san,
  isCheck: false,
  fenAfter: '',
  tactics: [],
})

const sans = (history: readonly PlayedMove[]) => moveRows(history).map((r) => [r.number, r.white?.san, r.black?.san])

describe('moveRows', () => {
  it('has no rows before the first move', () => {
    expect(moveRows([])).toEqual([])
  })

  it('pairs white and black moves under one number', () => {
    expect(sans([move('e4', 'w'), move('e5', 'b'), move('Nf3', 'w')])).toEqual([
      [1, 'e4', 'e5'],
      [2, 'Nf3', undefined],
    ])
  })

  it('leaves the white cell empty when Black moved first', () => {
    expect(sans([move('e5', 'b'), move('Nf3', 'w'), move('Nc6', 'b')])).toEqual([
      [1, undefined, 'e5'],
      [2, 'Nf3', 'Nc6'],
    ])
  })
})
