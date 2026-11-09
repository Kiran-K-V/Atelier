import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { detectTactics } from './tactics'
import { TACTIC_PRIORITY } from './types'
import type { Tactic } from './types'

function legal(fen: string): string {
  return new Chess(fen).fen()
}

function kinds(tactics: Tactic[]): string[] {
  return tactics.map((t) => t.kind)
}

describe('detectTactics', () => {
  describe('fork', () => {
    it('reports a royal fork of king and rook', () => {
      const fen = legal('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1')
      expect(detectTactics(fen, { from: 'd5', to: 'c7' })).toEqual([
        { kind: 'fork', by: 'w', attacker: 'c7', targets: expect.arrayContaining(['e8', 'a8']) },
      ])
    })

    it('reports a fork of queen and rook', () => {
      const fen = legal('1k6/3q3r/8/8/4N3/8/8/K7 w - - 0 1')
      const tactics = detectTactics(fen, { from: 'e4', to: 'f6' })
      expect(tactics).toHaveLength(1)
      const [fork] = tactics
      expect(fork.kind).toBe('fork')
      if (fork.kind === 'fork') expect([...fork.targets].sort()).toEqual(['d7', 'h7'])
    })

    it('ignores two defended pawns', () => {
      const fen = legal('1r4k1/1p3p2/8/8/4N3/8/8/K7 w - - 0 1')
      expect(detectTactics(fen, { from: 'e4', to: 'd6' })).toEqual([])
    })
  })

  describe('pin', () => {
    it('reports an absolute pin to the king', () => {
      const fen = legal('4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1')
      expect(detectTactics(fen, { from: 'f1', to: 'b5' })).toEqual([
        { kind: 'pin', by: 'w', attacker: 'b5', pinned: 'c6', behind: 'e8', absolute: true },
      ])
    })

    it('reports a relative pin to the queen', () => {
      const fen = legal('4k3/3q4/2n5/8/8/8/8/4KB2 w - - 0 1')
      expect(detectTactics(fen, { from: 'f1', to: 'b5' })).toEqual([
        { kind: 'pin', by: 'w', attacker: 'b5', pinned: 'c6', behind: 'd7', absolute: false },
      ])
    })

    it('does not report a pin that existed before the move', () => {
      const fen = legal('4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1')
      expect(detectTactics(fen, { from: 'e1', to: 'e2' })).toEqual([])
    })
  })

  describe('skewer', () => {
    it('reports a rook skewering king and queen', () => {
      const fen = legal('4q3/8/8/4k3/8/8/8/R5K1 w - - 0 1')
      expect(detectTactics(fen, { from: 'a1', to: 'e1' })).toEqual([
        { kind: 'skewer', by: 'w', attacker: 'e1', front: 'e5', behind: 'e8' },
      ])
    })
  })

  describe('discovered', () => {
    it('reports a discovered check from a moved bishop', () => {
      const fen = legal('4k3/8/8/8/4B3/8/8/4RK2 w - - 0 1')
      expect(detectTactics(fen, { from: 'e4', to: 'd5' })).toEqual([
        { kind: 'discovered', by: 'w', mover: 'd5', vacated: 'e4', attacker: 'e1', target: 'e8', check: true },
      ])
    })

    it('reports a discovered attack on a bigger piece without check', () => {
      const fen = legal('6k1/4q3/8/8/4B3/8/8/4RK2 w - - 0 1')
      expect(detectTactics(fen, { from: 'e4', to: 'c2' })).toEqual([
        { kind: 'discovered', by: 'w', mover: 'c2', vacated: 'e4', attacker: 'e1', target: 'e7', check: false },
      ])
    })

    it('skips castling', () => {
      const fen = legal('4k3/8/8/8/8/8/8/R3K3 w Q - 0 1')
      expect(kinds(detectTactics(fen, { from: 'e1', to: 'c1' }))).not.toContain('discovered')
    })
  })

  describe('doubleCheck', () => {
    it('reports two checkers at once', () => {
      const fen = legal('4k3/8/8/8/4B3/8/8/4RK2 w - - 0 1')
      const tactics = detectTactics(fen, { from: 'e4', to: 'c6' })
      const double = tactics.find((t) => t.kind === 'doubleCheck')
      expect(double).toBeDefined()
      if (double?.kind === 'doubleCheck') {
        expect([...double.checkers].sort()).toEqual(['c6', 'e1'])
        expect(double.king).toBe('e8')
      }
    })

    it('sorts by priority', () => {
      const fen = legal('4k3/8/8/8/4B3/8/8/4RK2 w - - 0 1')
      const order = kinds(detectTactics(fen, { from: 'e4', to: 'c6' }))
      expect(order).toEqual(['doubleCheck', 'discovered'])
      const indices = order.map((k) => TACTIC_PRIORITY.indexOf(k as (typeof TACTIC_PRIORITY)[number]))
      expect(indices).toEqual([...indices].sort((a, b) => a - b))
    })
  })

  describe('backRank', () => {
    it('reports back-rank mate', () => {
      const fen = legal('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1')
      expect(detectTactics(fen, { from: 'e1', to: 'e8' })).toEqual([
        { kind: 'backRank', by: 'w', attacker: 'e8', king: 'g8', entry: 'e8', mate: true },
      ])
    })

    it('reports a back-rank mate threat the move created', () => {
      const fen = legal('6k1/5ppp/8/N7/8/8/8/R5K1 w - - 0 1')
      expect(detectTactics(fen, { from: 'a5', to: 'c6' })).toEqual([
        { kind: 'backRank', by: 'w', attacker: 'a1', king: 'g8', entry: 'a8', mate: false },
      ])
    })

    it('does not report a threat that already existed', () => {
      const fen = legal('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1')
      expect(detectTactics(fen, { from: 'g1', to: 'h1' })).toEqual([])
    })
  })

  describe('sacrifice', () => {
    it('reports a queen sacrifice with check', () => {
      const fen = legal('6k1/5ppp/5n2/7Q/8/3B4/8/6K1 w - - 0 1')
      expect(detectTactics(fen, { from: 'h5', to: 'h7' })).toEqual([
        { kind: 'sacrifice', by: 'w', square: 'h7', piece: 'q', loss: 8 },
      ])
    })

    it('does not report a plain blunder', () => {
      const fen = legal('6k1/4p3/8/8/8/8/3Q4/6K1 w - - 0 1')
      expect(detectTactics(fen, { from: 'd2', to: 'd6' })).toEqual([])
    })
  })

  describe('invalid input', () => {
    it('returns [] for an illegal move', () => {
      const start = new Chess().fen()
      expect(detectTactics(start, { from: 'e2', to: 'e5' })).toEqual([])
    })

    it('returns [] for an invalid FEN', () => {
      expect(detectTactics('not a fen', { from: 'e2', to: 'e4' })).toEqual([])
    })
  })

  describe('review fixes', () => {
    it('does not re-report a pin when the attacker slides along the pin line', () => {
      const fen = legal('4k3/8/8/8/4n3/8/8/4R1K1 w - - 0 1')
      expect(kinds(detectTactics(fen, { from: 'e1', to: 'e2' }))).not.toContain('pin')
    })

    it('does not report a fork when the forker is simply won back', () => {
      const fen = legal('r2bk3/8/8/3N4/8/8/8/4K3 w - - 0 1')
      expect(kinds(detectTactics(fen, { from: 'd5', to: 'c7' }))).not.toContain('fork')
    })

    it('still reports a fork when the forker can only be traded evenly', () => {
      const fen = legal('r3k3/8/8/Bn1N4/8/8/8/4K3 w - - 0 1')
      expect(kinds(detectTactics(fen, { from: 'd5', to: 'c7' }))).toContain('fork')
    })
  })
})
