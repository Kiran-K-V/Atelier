import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { duration, ease, type DurationToken, type EaseToken } from '../design/tokens'

gsap.registerPlugin(CustomEase)

for (const [name, [x1, y1, x2, y2]] of Object.entries(ease)) {
  CustomEase.create(name, `M0,0 C${x1},${y1} ${x2},${y2} 1,1`)
}

/** GSAP ease name for a token. Registered above, so tokens are valid GSAP ease strings. */
export const gEase = (e: EaseToken): string => e

/** Seconds for GSAP, scaled by the motion multiplier (0 when reduced motion). */
export const gDur = (d: DurationToken, scale = 1): number => (duration[d] / 1000) * scale

export { gsap }
