import { Chess } from 'chess.js'
import type { Move, Piece } from 'chess.js'
import { PIECE_VALUE, opposite, see } from './see'
import { TACTIC_PRIORITY } from './types'
import type { Color, MoveIntent, PieceSymbol, Square, Tactic } from './types'

type Direction = readonly [number, number]

const DIAGONALS: readonly Direction[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
const ORTHOGONALS: readonly Direction[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]

interface Placed {
  readonly square: Square
  readonly piece: Piece
}

function directionsOf(type: PieceSymbol): readonly Direction[] {
  if (type === 'b') return DIAGONALS
  if (type === 'r') return ORTHOGONALS
  if (type === 'q') return [...DIAGONALS, ...ORTHOGONALS]
  return []
}

function isSlider(type: PieceSymbol): boolean {
  return type === 'b' || type === 'r' || type === 'q'
}

function piecesOf(chess: Chess, color: Color): Placed[] {
  const placed: Placed[] = []
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.color === color) placed.push({ square: cell.square, piece: { type: cell.type, color: cell.color } })
    }
  }
  return placed
}

function kingSquareOf(chess: Chess, color: Color): Square | undefined {
  return piecesOf(chess, color).find((p) => p.piece.type === 'k')?.square
}

/** The first `limit` pieces met walking from `origin` in `direction` (origin excluded). */
function walk(chess: Chess, origin: Square, [df, dr]: Direction, limit: number): Placed[] {
  const hits: Placed[] = []
  let file = origin.charCodeAt(0) - 97 + df
  let rank = Number(origin[1]) + dr
  while (file >= 0 && file < 8 && rank >= 1 && rank <= 8 && hits.length < limit) {
    const square = `${String.fromCharCode(97 + file)}${rank}` as Square
    const piece = chess.get(square)
    if (piece) hits.push({ square, piece })
    file += df
    rank += dr
  }
  return hits
}

function isDefended(chess: Chess, target: Placed): boolean {
  return chess.attackers(target.square, target.piece.color).length > 0
}

function doubleCheck(after: Chess, by: Color): Tactic[] {
  const king = kingSquareOf(after, opposite(by))
  if (!king) return []
  const checkers = after.attackers(king, by)
  return checkers.length >= 2 ? [{ kind: 'doubleCheck', by, checkers, king }] : []
}

function discovered(before: Chess, after: Chess, played: Move, by: Color): Tactic[] {
  if (played.isKingsideCastle() || played.isQueensideCastle()) return []
  const found: Tactic[] = []
  for (const slider of piecesOf(before, by)) {
    if (!isSlider(slider.piece.type) || slider.square === played.from) continue
    for (const direction of directionsOf(slider.piece.type)) {
      if (walk(before, slider.square, direction, 1)[0]?.square !== played.from) continue
      const target = walk(after, slider.square, direction, 1)[0]
      if (!target || target.piece.color === by) continue
      const isKing = target.piece.type === 'k'
      const worthwhile =
        isKing ||
        PIECE_VALUE[target.piece.type] > PIECE_VALUE[slider.piece.type] ||
        (target.piece.type !== 'p' && !isDefended(after, target))
      if (!worthwhile) continue
      found.push({
        kind: 'discovered',
        by,
        mover: played.to,
        vacated: played.from,
        attacker: slider.square,
        target: target.square,
        check: isKing,
      })
    }
  }
  return found
}

function fork(after: Chess, played: Move, by: Color): Tactic[] {
  const moved = after.get(played.to)
  if (!moved) return []
  // A forker that is simply won back is no fork; an even trade still is.
  if (see(after.fen(), played.to, opposite(by)) > 0) return []
  const targets = piecesOf(after, opposite(by))
    .filter((target) => after.attackers(target.square, by).includes(played.to))
    .filter(
      (target) =>
        target.piece.type === 'k' ||
        PIECE_VALUE[target.piece.type] > PIECE_VALUE[moved.type] ||
        (target.piece.type !== 'p' && !isDefended(after, target)),
    )
    .map((target) => target.square)
  return targets.length >= 2 ? [{ kind: 'fork', by, attacker: played.to, targets }] : []
}

/** Pins and skewers by `by`'s sliders. Keyed by the attacked pair, so sliding the attacker along the line is not a new tactic. */
function lineTactics(chess: Chess, by: Color): Map<string, Tactic> {
  const found = new Map<string, Tactic>()
  for (const slider of piecesOf(chess, by)) {
    if (!isSlider(slider.piece.type)) continue
    for (const direction of directionsOf(slider.piece.type)) {
      const [front, behind] = walk(chess, slider.square, direction, 2)
      if (!front || !behind || front.piece.color === by || behind.piece.color === by) continue
      const frontValue = PIECE_VALUE[front.piece.type]
      const behindValue = PIECE_VALUE[behind.piece.type]
      if (front.piece.type !== 'k' && behindValue > frontValue) {
        found.set(`pin:${front.square}:${behind.square}`, {
          kind: 'pin',
          by,
          attacker: slider.square,
          pinned: front.square,
          behind: behind.square,
          absolute: behind.piece.type === 'k',
        })
      } else if (frontValue > behindValue && behindValue >= 3) {
        found.set(`skewer:${front.square}:${behind.square}`, {
          kind: 'skewer',
          by,
          attacker: slider.square,
          front: front.square,
          behind: behind.square,
        })
      }
    }
  }
  return found
}

function newLineTactics(before: Chess, after: Chess, by: Color): Tactic[] {
  const old = lineTactics(before, by)
  return [...lineTactics(after, by)].filter(([key]) => !old.has(key)).map(([, tactic]) => tactic)
}

interface MatingEntry {
  readonly attacker: Square
  readonly entry: Square
}

function withTurn(fen: string, turn: Color): Chess | undefined {
  const fields = fen.split(' ')
  fields[1] = turn
  fields[3] = '-'
  try {
    return new Chess(fields.join(' '))
  } catch {
    return undefined
  }
}

/** Rook or queen moves onto the king's home rank that checkmate, `by` to move on `board`. */
function backRankMates(board: Chess, rank: string): MatingEntry[] {
  const mates: MatingEntry[] = []
  const candidates = board
    .moves({ verbose: true })
    .filter((m) => (m.piece === 'r' || m.piece === 'q') && m.to[1] === rank)
  for (const m of candidates) {
    board.move({ from: m.from, to: m.to })
    if (board.isCheckmate()) mates.push({ attacker: m.from, entry: m.to })
    board.undo()
  }
  return mates
}

function backRank(before: Chess, after: Chess, by: Color): Tactic[] {
  const foe = opposite(by)
  const king = kingSquareOf(after, foe)
  const homeRank = foe === 'w' ? '1' : '8'
  if (!king || king[1] !== homeRank) return []

  if (after.isCheckmate()) {
    const checker = after
      .attackers(king, by)
      .find((sq) => sq[1] === homeRank && ['r', 'q'].includes(after.get(sq)?.type ?? ''))
    return checker ? [{ kind: 'backRank', by, attacker: checker, king, entry: checker, mate: true }] : []
  }
  if (after.inCheck()) return []

  const nullMove = withTurn(after.fen(), by)
  if (!nullMove) return []
  const threats = backRankMates(nullMove, homeRank)
  if (threats.length === 0) return []
  const existing = new Set(backRankMates(before, homeRank).map((t) => t.entry))
  const created = threats.find((t) => !existing.has(t.entry))
  return created ? [{ kind: 'backRank', by, attacker: created.attacker, king, entry: created.entry, mate: false }] : []
}

function sacrifice(after: Chess, played: Move, by: Color, hasOtherTactic: boolean): Tactic[] {
  const moved = after.get(played.to)
  if (!moved || after.isCheckmate()) return []
  const gain = see(after.fen(), played.to, opposite(by))
  const capturedValue = played.captured ? PIECE_VALUE[played.captured] : 0
  const loss = gain - capturedValue
  if (loss < 2 || !(after.inCheck() || hasOtherTactic)) return []
  return [{ kind: 'sacrifice', by, square: played.to, piece: moved.type, loss }]
}

/**
 * Tactics that `move`, played from `fenBefore`, creates for the side that moved.
 * Pure: builds its own chess.js boards. Sorted by TACTIC_PRIORITY.
 */
export function detectTactics(fenBefore: string, move: MoveIntent): Tactic[] {
  let before: Chess
  let after: Chess
  let played: Move
  try {
    before = new Chess(fenBefore)
    after = new Chess(fenBefore)
    played = after.move({ from: move.from, to: move.to, promotion: move.promotion })
  } catch {
    return []
  }
  const by = played.color

  const found: Tactic[] = [
    ...doubleCheck(after, by),
    ...discovered(before, after, played, by),
    ...fork(after, played, by),
    ...newLineTactics(before, after, by),
    ...backRank(before, after, by),
  ]
  found.push(...sacrifice(after, played, by, found.length > 0))

  const rank = (t: Tactic) => TACTIC_PRIORITY.indexOf(t.kind)
  return found.sort((a, b) => rank(a) - rank(b))
}
