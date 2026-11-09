import { SQUARES } from 'chess.js'
import type { Color, PieceInstance, PieceSymbol, Square } from './types'

/** The subset of chess.js's verbose Move that piece tracking needs. */
export interface MoveLike {
  readonly from: Square
  readonly to: Square
  readonly flags: string
  readonly piece: PieceSymbol
  readonly color: Color
  readonly promotion?: PieceSymbol
  readonly captured?: PieceSymbol
}

export interface RookMove {
  readonly id: string
  readonly from: Square
  readonly to: Square
}

export interface AppliedMove {
  readonly pieces: PieceInstance[]
  /** The removed piece. For en passant its square is the pawn's square, not `to`. */
  readonly captured?: PieceInstance
  readonly rookMove?: RookMove
}

const BACK_RANK: readonly PieceSymbol[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
const FILES = 'abcdefgh'

function toSquare(s: string): Square {
  const found = SQUARES.find((q) => q === s)
  if (!found) throw new Error(`Invalid square: ${s}`)
  return found
}

function idFor(color: Color, type: PieceSymbol, square: Square): string {
  return `${color}-${type}-${square}`
}

function make(color: Color, type: PieceSymbol, square: Square): PieceInstance {
  return { id: idFor(color, type, square), type, color, square }
}

export function initialPieces(): PieceInstance[] {
  const out: PieceInstance[] = []
  for (let f = 0; f < 8; f++) {
    const file = FILES[f]
    out.push(make('w', BACK_RANK[f], toSquare(`${file}1`)))
    out.push(make('w', 'p', toSquare(`${file}2`)))
    out.push(make('b', 'p', toSquare(`${file}7`)))
    out.push(make('b', BACK_RANK[f], toSquare(`${file}8`)))
  }
  return out
}

/** Builds instances from a chess.js `board()` result, for positions loaded from a FEN. */
export function piecesFromBoard(
  board: readonly (readonly ({ square: Square; type: PieceSymbol; color: Color } | null)[])[],
): PieceInstance[] {
  return board.flatMap((row) =>
    row.flatMap((cell) => (cell ? [make(cell.color, cell.type, cell.square)] : [])),
  )
}

export function applyMove(pieces: readonly PieceInstance[], move: MoveLike): AppliedMove {
  const mover = pieces.find((p) => p.square === move.from)
  if (!mover) throw new Error(`No piece on ${move.from}`)

  const isEnPassant = move.flags.includes('e')
  const captureSquare = isEnPassant ? toSquare(`${move.to[0]}${move.from[1]}`) : move.to
  const captured = pieces.find((p) => p.square === captureSquare && p !== mover)

  const rookMove = castlingRook(pieces, move)
  const rook = rookMove ? pieces.find((p) => p.id === rookMove.id) : undefined

  const next = pieces
    .filter((p) => p !== captured)
    .map((p): PieceInstance => {
      if (p === mover) return { ...p, square: move.to, type: move.promotion ?? p.type }
      if (p === rook && rookMove) return { ...p, square: rookMove.to }
      return p
    })

  return { pieces: next, captured, rookMove }
}

function castlingRook(pieces: readonly PieceInstance[], move: MoveLike): RookMove | undefined {
  const kingside = move.flags.includes('k')
  const queenside = move.flags.includes('q')
  if (!kingside && !queenside) return undefined
  const rank = move.from[1]
  const from = toSquare(`${kingside ? 'h' : 'a'}${rank}`)
  const to = toSquare(`${kingside ? 'f' : 'd'}${rank}`)
  const rook = pieces.find((p) => p.square === from && p.type === 'r' && p.color === move.color)
  if (!rook) throw new Error(`No rook on ${from} to castle with`)
  return { id: rook.id, from, to }
}
