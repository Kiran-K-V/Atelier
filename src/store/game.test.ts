import { Chess } from 'chess.js'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ChessEngine } from '../engine/engine'
import type { MoveIntent } from '../rules/types'
import { loadFenForTest, setEngineFactory, useGame } from './game'

/** Replies with the first legal move, optionally after being released manually. */
class FakeEngine implements ChessEngine {
  requests: string[] = []
  private pending: { resolve: (m: MoveIntent) => void; fen: string }[] = []
  private readonly manual: boolean
  constructor(manual = false) {
    this.manual = manual
  }

  init() {
    return Promise.resolve()
  }

  bestMove(fen: string): Promise<MoveIntent> {
    this.requests.push(fen)
    return new Promise((resolve) => {
      if (this.manual) this.pending.push({ resolve, fen })
      else resolve(firstLegal(fen))
    })
  }

  releaseAll() {
    for (const p of this.pending.splice(0)) p.resolve(firstLegal(p.fen))
  }

  stop() {}
  dispose() {}
}

function firstLegal(fen: string): MoveIntent {
  const m = new Chess(fen).moves({ verbose: true })[0]
  return { from: m.from, to: m.to, promotion: m.promotion === 'q' ? 'q' : undefined }
}

const state = () => useGame.getState()
const settle = () => new Promise((r) => setTimeout(r, 0))

async function setup(manual = false) {
  const fake = new FakeEngine(manual)
  setEngineFactory(() => fake)
  state().newGame('w')
  await settle()
  return fake
}

beforeEach(async () => {
  await setup()
})

describe('game store', () => {
  it('starts with a full board and the player to move', () => {
    expect(state().pieces).toHaveLength(32)
    expect(state().turn).toBe('w')
    expect(state().status).toEqual({ kind: 'playing' })
    expect(state().engine).toBe('ready')
  })

  it('answers a player move with an engine move', async () => {
    expect(state().tryMove({ from: 'e2', to: 'e4' })).toBe(true)
    expect(state().history).toHaveLength(1)
    await settle()
    expect(state().history).toHaveLength(2)
    expect(state().turn).toBe('w')
    expect(state().engine).toBe('ready')
    expect(state().history[0]).toMatchObject({ san: 'e4', from: 'e2', to: 'e4', color: 'w' })
    expect(state().history[1].color).toBe('b')
    expect(state().pieces).toHaveLength(32)
  })

  it('selects an own piece on click, then moves to a legal target', async () => {
    state().clickSquare('g1')
    expect(state().selected).toBe('g1')
    expect([...state().legalTargets].sort()).toEqual(['f3', 'h3'])
    state().clickSquare('f3')
    expect(state().selected).toBeNull()
    expect(state().history[0].san).toBe('Nf3')
    await settle()
    expect(state().history).toHaveLength(2)
  })

  it('clears on a second click, reselects another own piece, and ignores enemy pieces', () => {
    state().clickSquare('g1')
    state().clickSquare('g1')
    expect(state().selected).toBeNull()
    state().clickSquare('e7')
    expect(state().selected).toBeNull()
    expect(state().illegalAttempt).toBeNull()
    state().clickSquare('g1')
    state().clickSquare('b1')
    expect(state().selected).toBe('b1')
  })

  it('flags an illegal destination and clears the selection', () => {
    state().clickSquare('g1')
    state().clickSquare('g4')
    expect(state().selected).toBeNull()
    expect(state().illegalAttempt).toMatchObject({ square: 'g1' })
    expect(state().history).toHaveLength(0)
  })

  it('rejects an illegal drag-drop with a fresh nonce each time', () => {
    expect(state().tryMove({ from: 'e2', to: 'e5' })).toBe(false)
    const first = state().illegalAttempt
    expect(first).toMatchObject({ square: 'e2' })
    expect(state().tryMove({ from: 'e2', to: 'e5' })).toBe(false)
    expect(state().illegalAttempt?.nonce).toBeGreaterThan(first?.nonce ?? Infinity)
  })

  it('rejects moving the opponent\'s piece', () => {
    expect(state().tryMove({ from: 'e7', to: 'e5' })).toBe(false)
    expect(state().history).toHaveLength(0)
  })

  it('shows hover targets only when nothing is selected', () => {
    state().hoverSquare('e2')
    expect([...state().legalTargets].sort()).toEqual(['e3', 'e4'])
    state().hoverSquare(null)
    expect(state().legalTargets).toEqual([])
    state().clickSquare('g1')
    state().hoverSquare('e2')
    expect([...state().legalTargets].sort()).toEqual(['f3', 'h3'])
  })

  it('opens a promotion prompt, then completes it with the chosen piece', async () => {
    // The black pawn keeps K+N vs K from being an insufficient-material draw.
    loadFenForTest('7k/P7/8/8/8/8/6p1/4K3 w - - 0 1')
    state().clickSquare('a7')
    state().clickSquare('a8')
    expect(state().pendingPromotion).toEqual({ from: 'a7', to: 'a8' })
    expect(state().history).toHaveLength(0)
    state().choosePromotion('n')
    expect(state().pendingPromotion).toBeNull()
    expect(state().history[0]).toMatchObject({ promotion: 'n', piece: 'p' })
    expect(state().pieces.find((p) => p.id === 'w-p-a7')).toMatchObject({ type: 'n', square: 'a8' })
    await settle()
    expect(state().history.length).toBeGreaterThanOrEqual(2)
  })

  it('cancelPromotion leaves the board untouched', () => {
    loadFenForTest('7k/P7/8/8/8/8/8/4K3 w - - 0 1')
    expect(state().tryMove({ from: 'a7', to: 'a8' })).toBe(true)
    expect(state().pendingPromotion).not.toBeNull()
    state().cancelPromotion()
    expect(state().pendingPromotion).toBeNull()
    expect(state().history).toHaveLength(0)
    expect(state().turn).toBe('w')
  })

  it('undo returns to the player\'s turn after a full exchange', async () => {
    state().tryMove({ from: 'e2', to: 'e4' })
    await settle()
    state().tryMove({ from: 'd2', to: 'd4' })
    await settle()
    expect(state().history).toHaveLength(4)
    state().undo()
    expect(state().history).toHaveLength(2)
    expect(state().turn).toBe('w')
    expect(state().fen).toBe(state().history[1].fenAfter)
    expect(state().pieces).toHaveLength(32)
    expect(state().pieces.find((p) => p.id === 'w-p-e2')?.square).toBe('e4')
    expect(state().pieces.find((p) => p.id === 'w-p-d2')?.square).toBe('d2')
  })

  it('undo before the engine replied takes back one ply and drops the late reply', async () => {
    const fake = await setup(true)
    state().tryMove({ from: 'e2', to: 'e4' })
    await settle()
    expect(state().engine).toBe('thinking')
    state().undo()
    expect(state().history).toHaveLength(0)
    expect(state().turn).toBe('w')
    fake.releaseAll()
    await settle()
    expect(state().history).toHaveLength(0)
    expect(state().turn).toBe('w')
    expect(state().engine).toBe('ready')
  })

  it('lets the engine open when the player is black', async () => {
    state().newGame('b')
    await settle()
    expect(state().orientation).toBe('b')
    expect(state().history).toHaveLength(1)
    expect(state().history[0].color).toBe('w')
    expect(state().turn).toBe('b')
  })

  it('sets checkmate status with the winner', async () => {
    loadFenForTest('7k/8/6K1/8/8/8/8/R7 w - - 0 1')
    state().tryMove({ from: 'a1', to: 'a8' })
    expect(state().status).toEqual({ kind: 'checkmate', winner: 'w' })
    expect(state().checkSquare).toBe('h8')
    expect(state().history[0].isCheck).toBe(true)
    await settle()
    expect(state().history).toHaveLength(1)
  })

  it('reports engine failure as an error state', async () => {
    setEngineFactory(() => ({
      init: () => Promise.reject(new Error('no worker')),
      bestMove: () => Promise.reject(new Error('no worker')),
      stop() {},
      dispose() {},
    }))
    await settle()
    expect(state().engine).toBe('error')
  })

  it('flips the board and sets difficulty', () => {
    state().flipBoard()
    expect(state().orientation).toBe('b')
    state().setDifficulty(6)
    expect(state().difficulty).toBe(6)
  })
})
