import type { Engine, Route } from './engine'

const JITTER = 0.03
const FLOOR = 0.0001
const CURVE_POINTS = 64
/** RMS of uniform noise in [-1, 1]. */
const NOISE_RMS = 1 / Math.sqrt(3)

export interface Envelope {
  /** Seconds after the cue starts. */
  at?: number
  attack?: number
  /** Total length in seconds, attack included. */
  dur: number
  /** Approximate peak level of the source. */
  gain: number
  /** Replaces attack/decay with a custom 0..1 contour over the whole length. */
  shape?: (u: number) => number
}

export interface ToneOpts extends Envelope {
  freq: number
  freqEnd?: number
  /** Seconds the pitch glide takes; defaults to `dur`. */
  glide?: number
  type?: OscillatorType
  lowpass?: number
}

export interface NoiseOpts extends Envelope {
  filter: 'lowpass' | 'highpass' | 'bandpass'
  freq: number
  freqEnd?: number
  q?: number
}

export interface Voice {
  tone(o: ToneOpts): void
  noise(o: NoiseOpts): void
  /** Reverb send level for the whole cue. */
  wet(amount: number): void
}

const jitter = (): number => 1 + (Math.random() * 2 - 1) * JITTER

/**
 * Narrow filters remove most of the noise energy. This boosts the source so that
 * `gain` in a cue means the level you get out, not the level that went in.
 */
function noiseCompensation(filter: NoiseOpts['filter'], f: number, q: number, nyquist: number): number {
  const bandwidth = filter === 'lowpass' ? f : filter === 'highpass' ? nyquist - f : f / q
  return 1 / (NOISE_RMS * Math.sqrt(Math.min(bandwidth, nyquist) / nyquist))
}

/** One cue's scheduling surface. Frees its nodes once every source has ended. */
export function createVoice(engine: Engine, route: Route): Voice {
  const { ctx } = engine
  // A few ms of lookahead keeps the first sample from being scheduled in the past.
  const t0 = ctx.currentTime + 0.005
  const pitch = jitter()
  let live = 0
  route.input.gain.value = jitter()

  const settle = (): void => {
    if (live === 0) route.dispose()
  }

  function envelope(o: Envelope): GainNode {
    const g = ctx.createGain()
    const start = t0 + (o.at ?? 0)
    g.gain.value = 0
    if (o.shape) {
      const { shape } = o
      const curve = new Float32Array(CURVE_POINTS)
      for (let i = 0; i < CURVE_POINTS; i++) curve[i] = shape(i / (CURVE_POINTS - 1)) * o.gain
      g.gain.setValueCurveAtTime(curve, start, o.dur)
    } else {
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(o.gain, start + (o.attack ?? 0.004))
      g.gain.exponentialRampToValueAtTime(FLOOR, start + o.dur)
    }
    return g
  }

  function run(source: OscillatorNode | AudioBufferSourceNode, chain: readonly AudioNode[], o: Envelope): void {
    const start = t0 + (o.at ?? 0)
    let node: AudioNode = source
    for (const next of chain) node = node.connect(next)
    node.connect(route.input)
    live++
    source.onended = () => {
      source.disconnect()
      for (const n of chain) n.disconnect()
      live--
      settle()
    }
    if (source instanceof AudioBufferSourceNode) source.start(start, Math.random() * engine.noise.duration)
    else source.start(start)
    source.stop(start + o.dur + 0.03)
  }

  return {
    wet(amount) {
      route.send.gain.value = amount
    },

    tone(o) {
      const osc = ctx.createOscillator()
      osc.type = o.type ?? 'sine'
      const start = t0 + (o.at ?? 0)
      osc.frequency.setValueAtTime(o.freq * pitch, start)
      if (o.freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(o.freqEnd * pitch, start + (o.glide ?? o.dur))
      const chain: AudioNode[] = []
      if (o.lowpass !== undefined) {
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = o.lowpass
        chain.push(lp)
      }
      chain.push(envelope(o))
      run(osc, chain, o)
    },

    noise(o) {
      const src = ctx.createBufferSource()
      src.buffer = engine.noise
      src.loop = true
      const q = o.q ?? 0.7
      const filter = ctx.createBiquadFilter()
      filter.type = o.filter
      filter.Q.value = q
      const start = t0 + (o.at ?? 0)
      filter.frequency.setValueAtTime(o.freq * pitch, start)
      if (o.freqEnd !== undefined) filter.frequency.exponentialRampToValueAtTime(o.freqEnd * pitch, start + o.dur)
      const mid = (o.freq + (o.freqEnd ?? o.freq)) / 2
      const comp = noiseCompensation(o.filter, mid, q, ctx.sampleRate / 2)
      run(src, [filter, envelope({ ...o, gain: o.gain * comp })], o)
    },
  }
}
