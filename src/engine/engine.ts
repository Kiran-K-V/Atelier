import type { MoveIntent } from '../rules/types'
import type { Difficulty } from '../store/types'
import { difficultySettings, parseBestMove } from './uci'

export interface ChessEngine {
  init(): Promise<void>
  /** Rejects with an AbortError (see `isAbortError`) when superseded, stopped or disposed. */
  bestMove(fen: string, d: Difficulty): Promise<MoveIntent>
  stop(): void
  dispose(): void
}

const ENGINE_URL = '/engine/stockfish-19-lite-single.js'

function abortError(): DOMException {
  return new DOMException('Search aborted', 'AbortError')
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}

interface ActiveSearch {
  readonly resolve: (m: MoveIntent) => void
  readonly reject: (e: unknown) => void
}

export class StockfishEngine implements ChessEngine {
  private worker: Worker | null = null
  private ready: Promise<void> | null = null
  private listener: ((line: string) => void) | null = null
  private active: ActiveSearch | null = null
  /** True from `go` until the engine prints its `bestmove`, even if we stopped caring. */
  private searching = false
  private idleWaiters: (() => void)[] = []
  private requestId = 0
  private skill: number | null = null
  private failure: Error | null = null

  init(): Promise<void> {
    this.ready ??= this.start()
    return this.ready
  }

  async bestMove(fen: string, d: Difficulty): Promise<MoveIntent> {
    await this.init()
    this.cancelActive()
    const id = ++this.requestId
    // The old search's bestmove must arrive before new commands, or it would answer this one.
    await this.waitIdle()
    if (id !== this.requestId) throw abortError()
    if (this.failure) throw this.failure

    const { skill, movetime, depth } = difficultySettings(d)
    return new Promise<MoveIntent>((resolve, reject) => {
      this.active = { resolve, reject }
      if (this.skill !== skill) {
        this.send(`setoption name Skill Level value ${skill}`)
        this.skill = skill
      }
      this.send(`position fen ${fen}`)
      this.searching = true
      this.send(`go movetime ${movetime}${depth === undefined ? '' : ` depth ${depth}`}`)
    })
  }

  stop(): void {
    this.requestId++
    this.cancelActive()
  }

  dispose(): void {
    this.stop()
    this.worker?.terminate()
    this.worker = null
    this.listener = null
    this.failure ??= new Error('Engine disposed')
    this.flushIdle()
  }

  private start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(ENGINE_URL)
      this.worker = worker
      worker.onmessage = (ev: MessageEvent<unknown>) => {
        if (typeof ev.data === 'string') this.onLine(ev.data)
      }
      worker.onerror = (ev) => {
        const err = new Error(ev.message || 'Engine worker failed')
        this.failure = err
        reject(err)
        this.active?.reject(err)
        this.active = null
        this.searching = false
        this.flushIdle()
      }
      this.listener = (line) => {
        if (line === 'uciok') this.send('isready')
        else if (line === 'readyok') resolve()
      }
      this.send('uci')
    })
  }

  private onLine(line: string): void {
    this.listener?.(line)
    if (!line.startsWith('bestmove')) return
    this.searching = false
    const active = this.active
    this.active = null
    if (active) {
      const move = parseBestMove(line)
      if (move) active.resolve(move)
      else active.reject(new Error(`Engine returned no move: ${line}`))
    }
    this.flushIdle()
  }

  private cancelActive(): void {
    if (this.active) {
      this.active.reject(abortError())
      this.active = null
    }
    if (this.searching) this.send('stop')
  }

  private waitIdle(): Promise<void> {
    if (!this.searching) return Promise.resolve()
    return new Promise((resolve) => this.idleWaiters.push(resolve))
  }

  private flushIdle(): void {
    const waiters = this.idleWaiters
    this.idleWaiters = []
    for (const w of waiters) w()
  }

  private send(cmd: string): void {
    this.worker?.postMessage(cmd)
  }
}
