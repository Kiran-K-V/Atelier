import type { Color, GameStatus, PieceInstance, PieceSymbol, PlayedMove, Square } from '../../rules/types'

const COLOR_NAME: Record<Color, string> = { w: 'White', b: 'Black' }

const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

const DRAW_REASON: Record<Extract<GameStatus, { kind: 'draw' }>['reason'], string> = {
  insufficient: 'insufficient material',
  threefold: 'threefold repetition',
  'fifty-move': 'the fifty-move rule',
}

export const colorName = (color: Color): string => COLOR_NAME[color]
export const pieceName = (piece: PieceSymbol): string => PIECE_NAME[piece]
export const drawReasonText = (reason: Extract<GameStatus, { kind: 'draw' }>['reason']): string => DRAW_REASON[reason]

/** Ends a game: "Checkmate, White wins", "Stalemate", "Draw by threefold repetition". Empty while playing. */
export function describeStatus(status: GameStatus): string {
  switch (status.kind) {
    case 'playing':
      return ''
    case 'checkmate':
      return `Checkmate, ${colorName(status.winner)} wins`
    case 'stalemate':
      return 'Stalemate'
    case 'draw':
      return `Draw by ${drawReasonText(status.reason)}`
  }
}

function describeAction(move: PlayedMove): string {
  const who = colorName(move.color)
  if (move.rookMove) {
    return `${who} castles ${move.to.startsWith('g') ? 'kingside' : 'queenside'}`
  }
  const piece = `${who} ${pieceName(move.piece)}`
  const action = move.captured ? `takes ${move.to}` : `from ${move.from} to ${move.to}`
  const extras = [
    move.captured && move.captured.square !== move.to ? 'en passant' : null,
    move.promotion ? `promotes to ${pieceName(move.promotion)}` : null,
  ].filter((part): part is string => part !== null)
  return [`${piece} ${action}`, ...extras].join(', ')
}

/**
 * Spoken form of a move, for example "White knight from g1 to f3" or "Black pawn takes e4".
 * Pass the game status after the move so mate and draws are spoken too.
 */
export function describeMove(move: PlayedMove, status: GameStatus = { kind: 'playing' }): string {
  const result = status.kind !== 'playing' ? describeStatus(status) : move.isCheck ? 'Check' : ''
  return result ? `${describeAction(move)}. ${result}` : describeAction(move)
}

/** Spoken form of one square for keyboard play: "e2, white pawn" or "e4, empty". */
export function describeSquare(square: Square, pieces: readonly PieceInstance[]): string {
  const piece = pieces.find((p) => p.square === square)
  return piece ? `${square}, ${piece.color === 'w' ? 'white' : 'black'} ${pieceName(piece.type)}` : `${square}, empty`
}
