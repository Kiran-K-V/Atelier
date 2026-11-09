import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { checkersOf, checkSquareOf, statusOf, toPlayedMove } from '../../rules/game'
import { applyMove, initialPieces, piecesFromBoard } from '../../rules/pieces'
import type { MoveIntent, PieceInstance } from '../../rules/types'
import { toMoveEvent } from './moveEvent'

/** Plays moves the way the store does and returns the event for the last one. */
function play(moves: readonly MoveIntent[], fen?: string) {
  const chess = new Chess(fen)
  let pieces: readonly PieceInstance[] = fen ? piecesFromBoard(chess.board()) : initialPieces()
  let event = null
  moves.forEach((intent, i) => {
    const move = chess.move(intent)
    const applied = applyMove(pieces, move)
    pieces = applied.pieces
    const played = toPlayedMove(move, i + 1, applied.captured, applied.rookMove, chess, [])
    event = toMoveEvent(played, pieces, { checkers: checkersOf(chess), checkSquare: checkSquareOf(chess), status: statusOf(chess) })
  })
  if (!event) throw new Error('no event')
  return event as NonNullable<ReturnType<typeof toMoveEvent>>
}

describe('toMoveEvent', () => {
  it('finds the mover id by its destination', () => {
    const e = play([{ from: 'g1', to: 'f3' }])
    expect(e).toMatchObject({ id: 'w-n-g1', piece: 'n', from: 'g1', to: 'f3', enPassant: false, checkers: [], kingSquare: null, mate: false })
  })


  it('carries the castling rook with its id', () => {
    const e = play([{ from: 'e1', to: 'g1' }], 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
    expect(e.id).toBe('w-k-e1')
    expect(e.rookMove).toEqual({ id: 'w-r-h1', from: 'h1', to: 'f1' })
  })

  it('flags en passant when the captured pawn is not on the destination', () => {
    const e = play([
      { from: 'e2', to: 'e4' },
      { from: 'a7', to: 'a6' },
      { from: 'e4', to: 'e5' },
      { from: 'd7', to: 'd5' },
      { from: 'e5', to: 'd6' },
    ])
    expect(e.enPassant).toBe(true)
    expect(e.captured).toEqual({ id: 'b-p-d7', type: 'p', square: 'd5' })
  })

  it('keeps the pawn id and piece type through promotion', () => {
    const e = play([{ from: 'a7', to: 'a8', promotion: 'q' }], '7k/P7/8/8/8/8/8/K7 w - - 0 1')
    expect(e).toMatchObject({ id: 'w-p-a7', piece: 'p', promotion: 'q' })
    expect(e.checkers).toEqual(['a8'])
    expect(e.kingSquare).toBe('h8')
  })

  it('reports mate with checkers and the king square', () => {
    const e = play([
      { from: 'f2', to: 'f3' },
      { from: 'e7', to: 'e5' },
      { from: 'g2', to: 'g4' },
      { from: 'd8', to: 'h4' },
    ])
    expect(e).toMatchObject({ id: 'b-q-d8', mate: true, kingSquare: 'e1', checkers: ['h4'] })
  })
})
