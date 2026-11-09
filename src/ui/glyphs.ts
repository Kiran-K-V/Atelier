import type { Color, PieceSymbol } from '../rules/types'

// U+FE0E forces text presentation; otherwise some platforms draw the black pawn as an emoji.
const TEXT = '︎'

const GLYPHS: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
}

export const glyph = (color: Color, piece: PieceSymbol): string => GLYPHS[color][piece] + TEXT

export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
