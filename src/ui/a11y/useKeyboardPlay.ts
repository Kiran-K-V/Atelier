import { useCallback, type FocusEvent, type KeyboardEvent } from 'react'
import type { Color, Square } from '../../rules/types'
import { useGame } from '../../store/game'
import { announce } from './announce'
import { describeSquare } from './describeMove'

const FILES = 'abcdefgh'

// Screen direction as (file step, rank step) for white at the bottom. Up is away from the player.
const ARROWS: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
}

const startSquare = (orientation: Color): Square => (orientation === 'w' ? 'e2' : 'e7')

function step(from: Square, key: string, orientation: Color): Square {
  const [df, dr] = ARROWS[key] ?? [0, 0]
  const flip = orientation === 'w' ? 1 : -1
  const file = Math.min(7, Math.max(0, FILES.indexOf(from[0] ?? 'a') + df * flip))
  const rank = Math.min(8, Math.max(1, Number(from[1]) + dr * flip))
  // The clamps above keep this inside a1..h8.
  return `${FILES[file]}${rank}` as Square
}

function moveCursorTo(square: Square): void {
  const { moveCursor, pieces } = useGame.getState()
  moveCursor(square)
  announce(describeSquare(square, pieces))
}

function activate(cursor: Square): void {
  const before = useGame.getState()
  before.clickSquare(cursor)
  const after = useGame.getState()
  if (after.pendingPromotion) {
    announce('Choose a promotion piece')
  } else if (after.selected && after.selected !== before.selected) {
    const targets = after.legalTargets.length > 0 ? `Moves: ${after.legalTargets.join(', ')}` : 'No legal moves'
    announce(`${describeSquare(after.selected, after.pieces)}, selected. ${targets}`)
  } else if (before.selected && !after.selected && after.history.length === before.history.length) {
    announce('Selection cleared')
  }
}

/** Props to spread on the focusable board container. */
export function useKeyboardPlay() {
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    const { cursor, orientation, selected, clickSquare, moveCursor } = useGame.getState()
    if (event.key in ARROWS) {
      event.preventDefault()
      moveCursorTo(cursor ? step(cursor, event.key, orientation) : startSquare(orientation))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (cursor) activate(cursor)
      else moveCursorTo(startSquare(orientation))
    } else if (event.key === 'Escape') {
      event.preventDefault()
      // Clicking the selected square again is the store's way to clear a selection.
      if (selected) clickSquare(selected)
      moveCursor(null)
      announce('Cleared')
    }
  }, [])

  // Pointer focus must not draw a cursor, so only keyboard focus starts one.
  const onFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || !event.currentTarget.matches(':focus-visible')) return
    const { cursor, orientation } = useGame.getState()
    if (!cursor) moveCursorTo(startSquare(orientation))
  }, [])

  const onBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) useGame.getState().moveCursor(null)
  }, [])

  return { onKeyDown, onFocus, onBlur }
}
