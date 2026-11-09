import { create } from 'zustand'
import type { Square } from '../../rules/types'
import type { Mood } from '../choreo/types'

/** Current lighting mood and the king it centers on. Set by MoodRig; read by post effects. */
export const useMood = create<{ readonly mood: Mood; readonly square: Square | null }>(() => ({ mood: 'normal', square: null }))

/** Eased 0..1 blend toward each mood. MoodRig tweens it; lights and post read it every frame. */
export const moodWeights = { check: 0, mate: 0 }
