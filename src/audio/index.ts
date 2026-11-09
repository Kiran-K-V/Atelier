import type { Square } from '../rules/types'
import type { SoundCue } from '../scene/choreo/types'
import { useSettings } from '../store/settings'
import { cues } from './cues'
import { getEngine, installUnlock } from './engine'
import { createVoice } from './voice'

const MAX_PAN = 0.6

installUnlock()

/** Files a..h map to a gentle left-to-right spread; clamped so a bad square never hard-pans. */
export function panForSquare(square: Square): number {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0)
  return Math.max(-1, Math.min(1, ((file - 3.5) / 3.5) * MAX_PAN))
}

/** Plays a procedural cue. Silent when sound is off, there is no audio, or the user has not interacted yet. */
export function playSound(cue: SoundCue, square?: Square): void {
  if (!useSettings.getState().sound) return
  const engine = getEngine()
  if (!engine) return
  cues[cue](createVoice(engine, engine.route(square ? panForSquare(square) : 0)))
}
