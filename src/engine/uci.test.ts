import { describe, expect, it } from 'vitest'
import type { Difficulty } from '../store/types'
import { difficultySettings, parseBestMove } from './uci'

describe('parseBestMove', () => {
  it('parses a normal move', () => {
    expect(parseBestMove('bestmove e2e4')).toEqual({ from: 'e2', to: 'e4' })
  })

  it('ignores the ponder part', () => {
    expect(parseBestMove('bestmove g1f3 ponder d7d5')).toEqual({ from: 'g1', to: 'f3' })
  })

  it('parses promotions', () => {
    expect(parseBestMove('bestmove e7e8q ponder a1a2')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' })
    expect(parseBestMove('bestmove a2a1n')).toEqual({ from: 'a2', to: 'a1', promotion: 'n' })
  })

  it('returns null for (none)', () => {
    expect(parseBestMove('bestmove (none)')).toBeNull()
  })

  it.each(['', 'info depth 5 score cp 20', 'bestmove', 'bestmove z9z9', 'bestmove e2e4x', 'readyok'])(
    'returns null for garbage %j',
    (line) => {
      expect(parseBestMove(line)).toBeNull()
    },
  )
})

describe('difficultySettings', () => {
  const levels: Difficulty[] = [1, 2, 3, 4, 5, 6]

  it('spans skill 0 / ~150ms to skill 20 / ~1500ms', () => {
    expect(difficultySettings(1)).toMatchObject({ skill: 0, movetime: 150 })
    expect(difficultySettings(6)).toMatchObject({ skill: 20, movetime: 1500 })
  })

  it('never gets weaker or faster as the level rises', () => {
    for (const [a, b] of levels.slice(1).map((l, i) => [levels[i], l] as const)) {
      expect(difficultySettings(b).skill).toBeGreaterThan(difficultySettings(a).skill)
      expect(difficultySettings(b).movetime).toBeGreaterThan(difficultySettings(a).movetime)
    }
  })
})
