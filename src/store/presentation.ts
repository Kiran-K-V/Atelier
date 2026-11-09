import { create } from 'zustand'

/**
 * Shared between the 3D scene and the 2D UI.
 * `settledPly` is the last ply whose choreography has finished. The UI compares it with
 * history length, so an overlay for a position can never appear before that position's
 * animation ends, whatever order the stores update in.
 */
export interface PresentationState {
  readonly cinematic: boolean
  readonly settledPly: number
  readonly stage: number
}

export const usePresentation = create<PresentationState>()(() => ({ cinematic: false, settledPly: 0, stage: 0 }))

export const setCinematic = (cinematic: boolean) => usePresentation.setState({ cinematic })
export const setSettledPly = (settledPly: number) => usePresentation.setState({ settledPly })
/**
 * Bumped when the performer starts a move's performance or resets the board. Lingering effects
 * (check and tactic lines) belong to the stage they were emitted in and end when it changes, so
 * they follow what is on screen, not the store, which can be a fast engine reply ahead.
 */
export const nextStage = () => usePresentation.setState((s) => ({ stage: s.stage + 1 }))
