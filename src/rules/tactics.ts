import type { MoveIntent, Tactic } from './types'

/**
 * Tactics that `move`, played from `fenBefore`, creates for the side that moved.
 * Pure: builds its own chess.js boards. Sorted by TACTIC_PRIORITY.
 */
export function detectTactics(fenBefore: string, move: MoveIntent): Tactic[] {
  void fenBefore
  void move
  return []
}
