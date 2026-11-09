/**
 * One lazily created AudioContext and the shared master chain:
 *   cue gain -> StereoPanner -> master gain -> compressor -> destination
 *                     \-> reverb send -> convolver -> master gain
 */

export interface Route {
  /** Per-cue gain; every source of one cue connects here. */
  readonly input: GainNode
  readonly send: GainNode
  dispose(): void
}

export interface Engine {
  readonly ctx: AudioContext
  readonly noise: AudioBuffer
  route(pan: number): Route
}

const REVERB_SECONDS = 1.8
const NOISE_SECONDS = 2

let engine: Engine | null = null
let unlockInstalled = false

/** Uniform white noise in [-1, 1]. */
function makeNoise(ctx: BaseAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * NOISE_SECONDS), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

/** Decaying stereo noise whose high end dies faster than its low end, like a stone hall. */
function makeImpulse(ctx: BaseAudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * REVERB_SECONDS)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  const fadeIn = Math.floor(ctx.sampleRate * 0.012)
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c)
    let lp = 0
    for (let i = 0; i < length; i++) {
      const u = i / length
      // One-pole lowpass whose coefficient falls over time darkens the tail.
      lp += (0.55 - 0.47 * u) * (Math.random() * 2 - 1 - lp)
      data[i] = lp * Math.exp(-5.2 * u) * Math.min(1, i / fadeIn)
    }
  }
  return buffer
}

function createEngine(ctx: AudioContext): Engine {
  const master = ctx.createGain()
  master.gain.value = 0.8
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -18
  compressor.knee.value = 24
  compressor.ratio.value = 3
  compressor.attack.value = 0.005
  compressor.release.value = 0.22
  master.connect(compressor).connect(ctx.destination)

  const reverb = ctx.createConvolver()
  reverb.buffer = makeImpulse(ctx)
  reverb.connect(master)

  return {
    ctx,
    noise: makeNoise(ctx),
    route(pan) {
      const input = ctx.createGain()
      const panner = ctx.createStereoPanner()
      panner.pan.value = pan
      const send = ctx.createGain()
      send.gain.value = 0
      input.connect(panner)
      panner.connect(master)
      panner.connect(send).connect(reverb)
      return {
        input,
        send,
        dispose() {
          input.disconnect()
          panner.disconnect()
          send.disconnect()
        },
      }
    },
  }
}

function unlock(): void {
  if (typeof AudioContext === 'undefined') return
  engine ??= createEngine(new AudioContext())
  engine.ctx.resume().then(
    () => {
      if (engine?.ctx.state === 'running') removeUnlockListeners()
    },
    () => {
      // Stay armed: the next gesture may be allowed to start audio.
    },
  )
}

function removeUnlockListeners(): void {
  window.removeEventListener('pointerdown', unlock)
  window.removeEventListener('keydown', unlock)
}

/** Browsers only start audio inside a user gesture, so the context is created by the first one. */
export function installUnlock(): void {
  if (unlockInstalled || typeof window === 'undefined' || typeof AudioContext === 'undefined') return
  unlockInstalled = true
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

/** The engine once it is unlocked and running, otherwise null. */
export function getEngine(): Engine | null {
  return engine?.ctx.state === 'running' ? engine : null
}
