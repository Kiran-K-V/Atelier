import { SQUARES } from 'chess.js'
import type { Difficulty } from '../store/types'
import type { MoveIntent } from '../rules/types'

const PROMOTIONS = ['q', 'r', 'b', 'n'] as const
const BESTMOVE = /^bestmove\s+([a-h][1-8])([a-h][1-8])([qrbn])?(?:\s|$)/

/** Returns null for `bestmove (none)` and for any line that is not a move. */
export function parseBestMove(line: string): MoveIntent | null {
  const m = BESTMOVE.exec(line.trim())
  if (!m) return null
  const from = SQUARES.find((s) => s === m[1])
  const to = SQUARES.find((s) => s === m[2])
  if (!from || !to) return null
  const promotion = PROMOTIONS.find((p) => p === m[3])
  return promotion ? { from, to, promotion } : { from, to }
}

export interface DifficultySettings {
  readonly skill: number
  /** Search time in milliseconds. */
  readonly movetime: number
  /** Optional depth cap that keeps weak levels weak even on a fast machine. */
  readonly depth?: number
}

const SETTINGS: Record<Difficulty, DifficultySettings> = {
  1: { skill: 0, movetime: 150, depth: 1 },
  2: { skill: 3, movetime: 250, depth: 3 },
  3: { skill: 7, movetime: 400, depth: 6 },
  4: { skill: 12, movetime: 700 },
  5: { skill: 16, movetime: 1000 },
  6: { skill: 20, movetime: 1500 },
}

export function difficultySettings(d: Difficulty): DifficultySettings {
  return SETTINGS[d]
}
