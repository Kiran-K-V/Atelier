import type { PlayedMove } from '../../rules/types'

export interface MoveRow {
  readonly number: number
  /** Undefined only in the first row of a game that began with Black to move. */
  readonly white: PlayedMove | undefined
  readonly black: PlayedMove | undefined
}

/** Numbered white/black rows for the move table. */
export function moveRows(history: readonly PlayedMove[]): MoveRow[] {
  const rows: MoveRow[] = []
  let i = 0
  if (history[0]?.color === 'b') {
    rows.push({ number: 1, white: undefined, black: history[0] })
    i = 1
  }
  for (; i < history.length; i += 2) {
    rows.push({ number: rows.length + 1, white: history[i], black: history[i + 1] })
  }
  return rows
}
