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
}

export const usePresentation = create<PresentationState>()(() => ({ cinematic: false, settledPly: 0 }))

export const setCinematic = (cinematic: boolean) => usePresentation.setState({ cinematic })
export const setSettledPly = (settledPly: number) => usePresentation.setState({ settledPly })
