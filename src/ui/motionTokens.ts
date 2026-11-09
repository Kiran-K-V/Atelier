import { duration, ease, type DurationToken, type EaseToken } from '../design/tokens'

/** motion/react wants a mutable 4-tuple; tokens are readonly. */
export const bezier = (e: EaseToken): [number, number, number, number] => {
  const [a, b, c, d] = ease[e]
  return [a, b, c, d]
}

/** motion/react durations are seconds. */
export const sec = (d: DurationToken): number => duration[d] / 1000
