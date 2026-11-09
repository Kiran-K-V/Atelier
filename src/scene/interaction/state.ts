import { create } from 'zustand'
import type { Square } from '../../rules/types'
import { useGame } from '../../store/game'

interface InteractionState {
  /** Square under the pointer (scene-local: the game store only receives hoverSquare calls). */
  readonly hovered: Square | null
  /** Id of the piece being dragged. */
  readonly dragging: string | null
}

export const useInteraction = create<InteractionState>()(() => ({ hovered: null, dragging: null }))

export function hover(square: Square | null): void {
  const s = useInteraction.getState()
  if (s.dragging || s.hovered === square) return
  useInteraction.setState({ hovered: square })
  useGame.getState().hoverSquare(square)
}

export function vibrate(ms: number): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms)
}
