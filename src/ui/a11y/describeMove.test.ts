import { describe, expect, it } from 'vitest'
import type { PieceInstance, PlayedMove, Tactic } from '../../rules/types'
import { describeMove, describeSquare, describeStatus } from './describeMove'

const move = (over: Partial<PlayedMove>): PlayedMove => ({
  ply: 1,
  color: 'w',
  piece: 'n',
  from: 'g1',
  to: 'f3',
  san: 'Nf3',
  isCheck: false,
  fenAfter: '',
  tactics: [],
  ...over,
})

describe('describeMove', () => {
  it('speaks a quiet move with both squares', () => {
    expect(describeMove(move({}))).toBe('White knight from g1 to f3')
  })

  it('speaks a capture by destination', () => {
    const capture = move({
      color: 'b',
      piece: 'p',
      from: 'd5',
      to: 'e4',
      captured: { id: 'wp5', type: 'p', square: 'e4' },
    })
    expect(describeMove(capture)).toBe('Black pawn takes e4')
  })

  it('marks en passant when the captured pawn is not on the target square', () => {
    const ep = move({
      piece: 'p',
      from: 'e5',
      to: 'd6',
      captured: { id: 'bp4', type: 'p', square: 'd5' },
    })
    expect(describeMove(ep)).toBe('White pawn takes d6, en passant')
  })

  it('speaks castling by side', () => {
    const rookMove = { id: 'wr2', from: 'h1', to: 'f1' } as const
    expect(describeMove(move({ piece: 'k', from: 'e1', to: 'g1', rookMove }))).toBe('White castles kingside')
    expect(describeMove(move({ color: 'b', piece: 'k', from: 'e8', to: 'c8', rookMove }))).toBe('Black castles queenside')
  })

  it('speaks promotion', () => {
    expect(describeMove(move({ piece: 'p', from: 'a7', to: 'a8', promotion: 'q' }))).toBe(
      'White pawn from a7 to a8, promotes to queen',
    )
  })

  it('appends check', () => {
    expect(describeMove(move({ isCheck: true }))).toBe('White knight from g1 to f3. Check')
  })

  it('replaces check with checkmate when the game is won', () => {
    const mate = move({ piece: 'q', from: 'h5', to: 'f7', isCheck: true })
    expect(describeMove(mate, { kind: 'checkmate', winner: 'w' })).toBe(
      'White queen from h5 to f7. Checkmate, White wins',
    )
  })

  it('appends a draw result', () => {
    expect(describeMove(move({}), { kind: 'stalemate' })).toBe('White knight from g1 to f3. Stalemate')
  })
})

describe('describeMove tactics', () => {
  const fork: Tactic = { kind: 'fork', by: 'w', attacker: 'f7', targets: ['e8', 'h8'] }
  const pin: Tactic = { kind: 'pin', by: 'w', attacker: 'b5', pinned: 'c6', behind: 'e8', absolute: true }
  const capture = { id: 'bp6', type: 'p', square: 'f7' } as const

  it('appends the primary tactic after a check', () => {
    expect(describeMove(move({ to: 'f7', captured: capture, isCheck: true, tactics: [fork] }))).toBe(
      'White knight takes f7. Check. Fork',
    )
  })

  it('appends a tactic to a quiet move', () => {
    expect(describeMove(move({ tactics: [fork] }))).toBe('White knight from g1 to f3. Fork')
  })

  it('speaks only the first tactic', () => {
    expect(describeMove(move({ tactics: [fork, pin] }))).toBe('White knight from g1 to f3. Fork')
  })

  it('capitalises the multi-word name', () => {
    const discovered: Tactic = { kind: 'discovered', by: 'w', mover: 'f3', vacated: 'g1', attacker: 'a1', target: 'h8', check: false }
    expect(describeMove(move({ tactics: [discovered] }))).toBe('White knight from g1 to f3. Discovered attack')
  })

  it('follows the game result', () => {
    expect(describeMove(move({ isCheck: true, tactics: [fork] }), { kind: 'checkmate', winner: 'w' })).toBe(
      'White knight from g1 to f3. Checkmate, White wins. Fork',
    )
  })
})

describe('describeStatus', () => {
  it('is empty while playing', () => {
    expect(describeStatus({ kind: 'playing' })).toBe('')
  })

  it('names the draw reason', () => {
    expect(describeStatus({ kind: 'draw', reason: 'threefold' })).toBe('Draw by threefold repetition')
    expect(describeStatus({ kind: 'draw', reason: 'fifty-move' })).toBe('Draw by the fifty-move rule')
  })
})

describe('describeSquare', () => {
  const pieces: PieceInstance[] = [{ id: 'wp5', type: 'p', color: 'w', square: 'e2' }]

  it('names the piece on a square', () => {
    expect(describeSquare('e2', pieces)).toBe('e2, white pawn')
  })

  it('says empty for a bare square', () => {
    expect(describeSquare('e4', pieces)).toBe('e4, empty')
  })
})
