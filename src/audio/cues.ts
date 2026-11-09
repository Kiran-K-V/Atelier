import type { SoundCue } from '../scene/choreo/types'
import type { Voice } from './voice'

/**
 * Levels are the approximate output amplitude of each layer (see noiseCompensation),
 * kept low: the set should sound like felt, stone and brass in a quiet hall.
 */

const swell = (u: number): number => Math.sin(Math.PI * u) ** 2
const rand = (min: number, max: number): number => min + Math.random() * (max - min)

/** Felt-bottomed piece set down on stone. */
function tap(v: Voice, at: number, freq: number, level: number): void {
  v.noise({ at, filter: 'lowpass', freq: 900, freqEnd: 500, gain: 0.22 * level, attack: 0.002, dur: 0.08 })
  v.tone({ at, freq, freqEnd: freq * 0.75, glide: 0.06, gain: 0.3 * level, attack: 0.003, dur: 0.08 })
}

/** Dry wood-on-stone knock. */
function knock(v: Voice, at: number, freq: number, level: number): void {
  v.noise({ at, filter: 'bandpass', freq: freq * 7, q: 2.5, gain: 0.26 * level, attack: 0.001, dur: 0.03 })
  v.tone({ at, type: 'triangle', freq, freqEnd: freq * 0.72, glide: 0.07, gain: 0.26 * level, attack: 0.002, dur: 0.11 })
}

/** Struck bell: inharmonic partials, the upper ones dying sooner. */
function bell(v: Voice, at: number, freq: number, dur: number, level: number): void {
  const partials: readonly (readonly [ratio: number, gain: number, life: number])[] = [
    [1, 1, 1],
    [2.76, 0.45, 0.62],
    [5.4, 0.2, 0.32],
  ]
  for (const [ratio, gain, life] of partials) {
    v.tone({ at, freq: freq * ratio, gain: level * gain, attack: 0.003, dur: dur * life })
  }
}

export const cues: Record<SoundCue, (v: Voice) => void> = {
  pawnStep(v) {
    v.wet(0.1)
    tap(v, 0, 140, 1)
  },

  knightLand(v) {
    v.wet(0.22)
    v.tone({ freq: 90, freqEnd: 48, glide: 0.14, gain: 0.5, attack: 0.003, dur: 0.26 })
    v.noise({ filter: 'bandpass', freq: 1600, q: 1, gain: 0.2, attack: 0.001, dur: 0.035 })
    v.noise({ at: 0.004, filter: 'bandpass', freq: 540, q: 9, gain: 0.18, attack: 0.002, dur: 0.22 })
  },

  bishopWhoosh(v) {
    v.wet(0.28)
    v.noise({ filter: 'bandpass', freq: 600, freqEnd: 2400, q: 1.6, gain: 0.3, attack: 0.09, dur: 0.3 })
    v.noise({ at: 0.03, filter: 'highpass', freq: 4500, gain: 0.04, attack: 0.1, dur: 0.25 })
  },

  rookRumble(v) {
    v.wet(0.15)
    const body = (wobbles: number) => (u: number) => {
      const rise = Math.min(1, u / 0.1)
      const tail = u > 0.55 ? 1 - ((u - 0.55) / 0.45) ** 1.5 : 1
      return rise * tail * (0.72 + 0.28 * Math.sin(2 * Math.PI * wobbles * u))
    }
    v.noise({ filter: 'lowpass', freq: 240, freqEnd: 160, gain: 0.3, shape: body(5.5), dur: 0.6 })
    v.noise({ filter: 'bandpass', freq: 420, q: 2, gain: 0.06, shape: body(8), dur: 0.55 })
    v.tone({ freq: 55, gain: 0.28, shape: body(3), dur: 0.6 })
  },

  queenSweep(v) {
    v.wet(0.5)
    v.noise({ filter: 'bandpass', freq: 500, freqEnd: 3200, q: 1.2, gain: 0.16, attack: 0.15, dur: 0.45 })
    // A fifth up, the second partial slightly sharp so the pair beats softly.
    v.tone({ freq: 330, freqEnd: 495, glide: 0.4, gain: 0.1, attack: 0.12, dur: 0.55 })
    v.tone({ freq: 330 * 1.004, freqEnd: 495 * 1.004, glide: 0.4, gain: 0.1, attack: 0.12, dur: 0.55 })
    v.tone({ at: 0.05, freq: 1320, freqEnd: 1980, glide: 0.4, gain: 0.03, attack: 0.15, dur: 0.6 })
  },

  kingChime(v) {
    v.wet(0.5)
    bell(v, 0, 392, 1.8, 0.2)
    v.noise({ filter: 'bandpass', freq: 3000, q: 2, gain: 0.03, attack: 0.001, dur: 0.02 })
  },

  castle(v) {
    v.wet(0.25)
    tap(v, 0, 120, 1.1)
    tap(v, 0.12, 95, 1.2)
    bell(v, 0.12, 1568, 0.4, 0.05)
  },

  captureTopple(v) {
    v.wet(0.2)
    knock(v, 0, 220, 1.2)
    knock(v, 0.09, 180, 0.7)
    knock(v, 0.17, 160, 0.4)
  },

  captureShatter(v) {
    v.wet(0.35)
    v.noise({ filter: 'highpass', freq: 2800, gain: 0.35, attack: 0.001, dur: 0.06 })
    v.tone({ freq: 120, freqEnd: 70, glide: 0.1, gain: 0.25, attack: 0.003, dur: 0.12 })
    for (let i = 0; i < 7; i++) {
      v.tone({
        at: 0.02 + 0.38 * Math.random() ** 1.6,
        freq: rand(2800, 7500),
        gain: rand(0.02, 0.06),
        attack: 0.001,
        dur: rand(0.06, 0.14),
      })
    }
  },

  captureSlice(v) {
    v.wet(0.3)
    v.noise({ filter: 'bandpass', freq: 3000, freqEnd: 7000, q: 4, gain: 0.26, attack: 0.01, dur: 0.14 })
    bell(v, 0.08, 3300, 0.5, 0.04)
  },

  captureShove(v) {
    v.wet(0.2)
    v.noise({ filter: 'lowpass', freq: 250, freqEnd: 700, gain: 0.28, attack: 0.3, dur: 0.35 })
    v.tone({ freq: 70, gain: 0.15, attack: 0.25, dur: 0.35 })
    knock(v, 0.38, 150, 1.2)
    v.tone({ at: 0.38, freq: 90, freqEnd: 55, glide: 0.12, gain: 0.3, attack: 0.003, dur: 0.2 })
  },

  captureDissolve(v) {
    v.wet(0.55)
    // Random grain levels make the hiss crackle softly instead of hissing flat.
    v.noise({
      filter: 'bandpass',
      freq: 2000,
      freqEnd: 6000,
      q: 0.8,
      gain: 0.12,
      dur: 0.6,
      shape: (u) => u ** 1.4 * (1 - u ** 6) * (0.35 + 0.65 * Math.random()),
    })
    v.tone({ freq: 261, freqEnd: 523, glide: 0.7, gain: 0.12, attack: 0.3, dur: 0.8 })
    v.tone({ freq: 392, freqEnd: 784, glide: 0.7, gain: 0.05, attack: 0.3, dur: 0.8 })
  },

  captureDismiss(v) {
    v.wet(0.3)
    v.tone({ freq: 196, freqEnd: 174, glide: 0.4, gain: 0.22, attack: 0.05, dur: 0.6 })
    v.tone({ freq: 98, gain: 0.12, attack: 0.05, dur: 0.6 })
    v.noise({ at: 0.35, filter: 'lowpass', freq: 600, gain: 0.1, attack: 0.004, dur: 0.1 })
    v.tone({ at: 0.35, freq: 90, freqEnd: 70, glide: 0.1, gain: 0.15, attack: 0.004, dur: 0.15 })
  },

  check(v) {
    v.wet(0.35)
    // A minor second apart: 110 Hz and 110 * 2^(1/12).
    v.tone({ freq: 110, gain: 0.18, shape: swell, dur: 1 })
    v.tone({ freq: 116.54, gain: 0.18, shape: swell, dur: 1 })
    for (const at of [0, 0.45]) {
      v.tone({ at, type: 'sawtooth', freq: 233, lowpass: 700, gain: 0.1, attack: 0.03, dur: 0.25 })
    }
  },

  mate(v) {
    v.wet(0.8)
    v.tone({ freq: 80, freqEnd: 45, glide: 0.25, gain: 0.6, attack: 0.004, dur: 1.6 })
    v.noise({ filter: 'lowpass', freq: 200, gain: 0.25, attack: 0.002, dur: 0.5 })
    // C minor, low and dark.
    for (const freq of [65.4, 77.8, 98, 130.8]) {
      v.tone({ freq, gain: 0.1, attack: 0.5, dur: 3 })
    }
  },

  promotion(v) {
    v.wet(0.5)
    const arpeggio = [1, 1.25, 1.5, 2]
    arpeggio.forEach((ratio, i) => bell(v, 0.13 * i, 523.25 * ratio, i === arpeggio.length - 1 ? 1.2 : 0.7, 0.1))
    v.noise({ filter: 'bandpass', freq: 2000, freqEnd: 7000, q: 0.7, gain: 0.08, attack: 0.5, dur: 1.2 })
  },

  enPassant(v) {
    v.wet(0.6)
    v.noise({ filter: 'bandpass', freq: 1800, freqEnd: 900, q: 3, gain: 0.12, attack: 0.06, dur: 0.2 })
    v.noise({ at: 0.17, filter: 'bandpass', freq: 2400, freqEnd: 1200, q: 3, gain: 0.1, attack: 0.06, dur: 0.2 })
  },

  tactic(v) {
    v.wet(0.45)
    bell(v, 0, 880, 0.35, 0.07)
    bell(v, 0.09, 1318.5, 0.5, 0.08)
    v.tone({ at: 0.09, freq: 2637, gain: 0.02, attack: 0.01, dur: 0.45 })
    v.noise({ at: 0.09, filter: 'bandpass', freq: 5000, freqEnd: 8000, q: 2, gain: 0.025, attack: 0.04, dur: 0.4 })
  },

  illegal(v) {
    v.wet(0.05)
    tap(v, 0, 170, 0.45)
    tap(v, 0.09, 150, 0.38)
  },
}
