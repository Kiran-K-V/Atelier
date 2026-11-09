import { Chess } from 'chess.js'
import type { Move } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { applyMove, initialPieces } from './pieces'
import type { PieceInstance } from './types'

function play(chess: Chess, pieces: PieceInstance[], san: string) {
  const move: Move = chess.move(san)
  return { move, ...applyMove(pieces, move) }
}

function replay(sans: string[]) {
  const chess = new Chess()
  let pieces = initialPieces()
  let rookMove: ReturnType<typeof applyMove>['rookMove']
  let captured: PieceInstance | undefined
  for (const san of sans) {
    const r = play(chess, pieces, san)
    pieces = r.pieces
    rookMove = r.rookMove
    captured = r.captured
  }
  return { chess, pieces, rookMove, captured }
}

const key = (p: { type: string; color: string; square: string }) => `${p.color}${p.type}@${p.square}`
const boardKeys = (chess: Chess) =>
  chess
    .board()
    .flat()
    .flatMap((c) => (c ? [key(c)] : []))
    .sort()

describe('initialPieces', () => {
  it('has 32 pieces with stable, unique ids', () => {
    const pieces = initialPieces()
    expect(pieces).toHaveLength(32)
    expect(new Set(pieces.map((p) => p.id)).size).toBe(32)
    const ids = pieces.map((p) => p.id)
    expect(ids).toEqual(expect.arrayContaining(['w-p-a2', 'b-n-g8', 'w-k-e1', 'b-q-d8']))
  })

  it('matches the chess.js starting board', () => {
    expect(initialPieces().map(key).sort()).toEqual(boardKeys(new Chess()))
  })
})

describe('applyMove', () => {
  it('does not mutate its input', () => {
    const pieces = initialPieces()
    const snapshot = JSON.stringify(pieces)
    applyMove(pieces, new Chess().move('e4'))
    expect(JSON.stringify(pieces)).toBe(snapshot)
  })

  it('moves a piece and keeps its id', () => {
    const { pieces } = replay(['e4'])
    expect(pieces.find((p) => p.id === 'w-p-e2')?.square).toBe('e4')
  })

  it('removes the captured piece and reports it', () => {
    const { pieces, captured } = replay(['e4', 'd5', 'exd5'])
    expect(captured?.id).toBe('b-p-d7')
    expect(pieces).toHaveLength(31)
    expect(pieces.find((p) => p.id === 'w-p-e2')?.square).toBe('d5')
  })

  it.each([
    ['white kingside', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O'], 'w-r-h1', 'h1', 'f1', 'w-k-e1', 'g1'],
    ['white queenside', ['d4', 'd5', 'Nc3', 'Nc6', 'Bf4', 'Bf5', 'Qd2', 'Qd7', 'O-O-O'], 'w-r-a1', 'a1', 'd1', 'w-k-e1', 'c1'],
    ['black kingside', ['e4', 'e5', 'Nf3', 'Nf6', 'Bc4', 'Be7', 'd3', 'O-O'], 'b-r-h8', 'h8', 'f8', 'b-k-e8', 'g8'],
    ['black queenside', ['e4', 'd5', 'Nc3', 'Nc6', 'Nf3', 'Bf5', 'd3', 'Qd7', 'Be3', 'O-O-O'], 'b-r-a8', 'a8', 'd8', 'b-k-e8', 'c8'],
  ] as const)('castles %s, moving the rook and keeping its id', (_name, sans, rookId, rookFrom, rookTo, kingId, kingTo) => {
    const { pieces, rookMove, chess } = replay([...sans])
    expect(rookMove).toEqual({ id: rookId, from: rookFrom, to: rookTo })
    expect(pieces.find((p) => p.id === rookId)?.square).toBe(rookTo)
    expect(pieces.find((p) => p.id === kingId)?.square).toBe(kingTo)
    expect(pieces.map(key).sort()).toEqual(boardKeys(chess))
  })

  it('removes the right pawn on en passant', () => {
    const { pieces, captured, chess } = replay(['e4', 'a6', 'e5', 'd5', 'exd6'])
    expect(captured).toMatchObject({ id: 'b-p-d7', square: 'd5', type: 'p' })
    expect(pieces.find((p) => p.id === 'w-p-e2')?.square).toBe('d6')
    expect(pieces.some((p) => p.square === 'd5')).toBe(false)
    expect(pieces.map(key).sort()).toEqual(boardKeys(chess))
  })

  it('keeps the id and changes the type on promotion (with capture)', () => {
    const chess = new Chess('1n2k3/P7/8/8/8/8/8/4K3 w - - 0 1')
    const pieces = [
      { id: 'w-p-a2', type: 'p', color: 'w', square: 'a7' },
      { id: 'b-n-b8', type: 'n', color: 'b', square: 'b8' },
      { id: 'b-k-e8', type: 'k', color: 'b', square: 'e8' },
      { id: 'w-k-e1', type: 'k', color: 'w', square: 'e1' },
    ] as const
    const move = chess.move({ from: 'a7', to: 'b8', promotion: 'q' })
    const result = applyMove(pieces, move)
    expect(result.captured?.id).toBe('b-n-b8')
    expect(result.pieces.find((p) => p.id === 'w-p-a2')).toMatchObject({ type: 'q', square: 'b8' })
    expect(result.pieces).toHaveLength(3)
  })

  it('replays Scholar\'s mate consistently with chess.js after every move', () => {
    const chess = new Chess()
    let pieces = initialPieces()
    for (const san of ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']) {
      pieces = play(chess, pieces, san).pieces
      expect(pieces.map(key).sort()).toEqual(boardKeys(chess))
    }
    expect(chess.isCheckmate()).toBe(true)
  })
})
