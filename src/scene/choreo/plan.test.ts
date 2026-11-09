import { describe, expect, it } from 'vitest'
import { planMove } from './plan'
import type { Beat, MoveEvent } from './types'

const base: MoveEvent = {
  ply: 1,
  color: 'w',
  piece: 'p',
  id: 'w-p-e2',
  from: 'e2',
  to: 'e4',
  enPassant: false,
  checkers: [],
  kingSquare: null,
  mate: false,
}
const full = { reducedMotion: false }
const reduced = { reducedMotion: true }
const kinds = (beats: readonly Beat[], kind: Beat['kind']) => beats.filter((b) => b.kind === kind)
const fxTypes = (beats: readonly Beat[]) => beats.flatMap((b) => (b.kind === 'fx' ? [b.fx.type] : []))

describe('planMove', () => {
  it('gives each piece type its own signature and tempo', () => {
    const sig = (piece: MoveEvent['piece'], from: MoveEvent['from'], to: MoveEvent['to']) => {
      const move = planMove({ ...base, piece, id: `w-${piece}`, from, to }, full).beats[0]
      if (move.kind !== 'move') throw new Error('first beat must be the move')
      return move
    }
    expect(sig('p', 'e2', 'e4').signature).toBe('pawnStep')
    expect(sig('n', 'g1', 'f3').signature).toBe('knightLeap')
    expect(sig('b', 'f1', 'b5').signature).toBe('bishopGlide')
    expect(sig('r', 'a1', 'a8').signature).toBe('rookSlide')
    expect(sig('q', 'd1', 'h5').signature).toBe('queenFlow')
    expect(sig('k', 'e1', 'e2').signature).toBe('kingProcession')
    expect(sig('k', 'e1', 'e2').duration).toBeGreaterThan(sig('b', 'f1', 'e2').duration)
    expect(sig('r', 'a1', 'a8').duration).toBeGreaterThan(sig('r', 'a1', 'a2').duration)
  })

  it('emits signature effects: pawn dust, knight ripple and shake, bishop trail, king aura', () => {
    expect(fxTypes(planMove(base, full).beats)).toContain('dustRing')
    const knight = planMove({ ...base, piece: 'n', from: 'g1', to: 'f3' }, full).beats
    expect(fxTypes(knight)).toContain('ripple')
    expect(kinds(knight, 'camera')).toHaveLength(1)
    expect(fxTypes(planMove({ ...base, piece: 'b', from: 'f1', to: 'b5' }, full).beats)).toContain('trail')
    expect(fxTypes(planMove({ ...base, piece: 'k', from: 'e1', to: 'e2' }, full).beats)).toContain('aura')
  })

  it('shakes the camera only for long rook slides', () => {
    expect(kinds(planMove({ ...base, piece: 'r', from: 'a1', to: 'a3' }, full).beats, 'camera')).toHaveLength(0)
    expect(kinds(planMove({ ...base, piece: 'r', from: 'a1', to: 'a8' }, full).beats, 'camera')).toHaveLength(1)
  })

  it('times the capture to the attacker impact, styled by attacker type', () => {
    const plan = planMove(
      { ...base, piece: 'n', id: 'w-n-g1', from: 'g5', to: 'f7', captured: { id: 'b-p-f7', type: 'p', square: 'f7' } },
      full,
    )
    const [move] = kinds(plan.beats, 'move')
    const [capture] = kinds(plan.beats, 'capture')
    if (move.kind !== 'move' || capture.kind !== 'capture') throw new Error('unexpected beats')
    expect(capture.style).toBe('shatter')
    expect(capture.at).toBeGreaterThan(0)
    expect(capture.at).toBeLessThanOrEqual(move.duration)
    expect(move.capturing).toBe(true)
    expect(fxTypes(plan.beats)).toContain('shards')
  })

  it('choreographs castling: the rook starts after the king and lands later', () => {
    const plan = planMove({ ...base, piece: 'k', id: 'w-k-e1', from: 'e1', to: 'g1', rookMove: { id: 'w-r-h1', from: 'h1', to: 'f1' } }, full)
    const [king, rook] = kinds(plan.beats, 'move')
    if (king.kind !== 'move' || rook.kind !== 'move') throw new Error('expected two moves')
    expect(rook.id).toBe('w-r-h1')
    expect(rook.signature).toBe('rookHop')
    expect(rook.at).toBeGreaterThan(king.at)
    expect(plan.beats.some((b) => b.kind === 'sound' && b.cue === 'castle')).toBe(true)
  })

  it('leaves a ghost trail on the passed square for en passant', () => {
    const plan = planMove(
      { ...base, from: 'e5', to: 'd6', captured: { id: 'b-p-d7', type: 'p', square: 'd5' }, enPassant: true },
      full,
    )
    const ghost = plan.beats.find((b) => b.kind === 'fx' && b.fx.type === 'ghostTrail')
    expect(ghost?.kind === 'fx' && ghost.fx.type === 'ghostTrail' && ghost.fx.square).toBe('d6')
    const capture = kinds(plan.beats, 'capture')[0]
    expect(capture.kind === 'capture' && capture.square).toBe('d5')
  })

  it('promotes with a light column and a morph after landing', () => {
    const plan = planMove({ ...base, from: 'e7', to: 'e8', promotion: 'q' }, full)
    const [morph] = kinds(plan.beats, 'morph')
    expect(morph).toMatchObject({ from: 'p', to: 'q' })
    expect(fxTypes(plan.beats)).toContain('lightColumn')
    expect(plan.duration).toBeGreaterThanOrEqual(morph.at + (morph.kind === 'morph' ? morph.duration : 0))
  })

  it('draws a threat line from every checker; double check gives two', () => {
    const plan = planMove({ ...base, piece: 'n', from: 'g5', to: 'f7', checkers: ['f7', 'c4'], kingSquare: 'e8' }, full)
    const lines = plan.beats.filter((b) => b.kind === 'fx' && b.fx.type === 'threatLine')
    expect(lines).toHaveLength(2)
    expect(plan.beats.some((b) => b.kind === 'sound' && b.cue === 'check')).toBe(true)
    expect(plan.beats.some((b) => b.kind === 'fx' && b.fx.type === 'mood' && b.fx.mood === 'check')).toBe(true)
  })

  it('plays checkmate in slow motion with camera focus and a toppling king', () => {
    const plan = planMove({ ...base, piece: 'q', from: 'h5', to: 'f7', checkers: ['f7'], kingSquare: 'e8', mate: true }, full)
    expect(kinds(plan.beats, 'timeScale')).toHaveLength(1)
    expect(plan.beats.some((b) => b.kind === 'camera' && b.action.type === 'focus' && b.action.square === 'e8')).toBe(true)
    expect(plan.beats.some((b) => b.kind === 'topple' && b.square === 'e8')).toBe(true)
    expect(plan.beats.some((b) => b.kind === 'fx' && b.fx.type === 'mood' && b.fx.mood === 'mate')).toBe(true)
  })

  it('reduced motion: instant moves, fades, no camera, no slow motion, but keeps sound and threat lines', () => {
    const plan = planMove(
      { ...base, piece: 'q', from: 'h5', to: 'f7', captured: { id: 'b-p-f7', type: 'p', square: 'f7' }, checkers: ['f7'], kingSquare: 'e8', mate: true },
      reduced,
    )
    expect(kinds(plan.beats, 'move').every((b) => b.kind === 'move' && b.signature === 'instant')).toBe(true)
    expect(kinds(plan.beats, 'capture').every((b) => b.kind === 'capture' && b.style === 'fade')).toBe(true)
    expect(kinds(plan.beats, 'camera')).toHaveLength(0)
    expect(kinds(plan.beats, 'timeScale')).toHaveLength(0)
    expect(kinds(plan.beats, 'topple')).toHaveLength(0)
    expect(kinds(plan.beats, 'sound').length).toBeGreaterThan(0)
    expect(fxTypes(plan.beats)).toEqual(expect.arrayContaining(['threatLine', 'mood']))
    expect(fxTypes(plan.beats)).not.toContain('trail')
  })

  it('returns beats in time order', () => {
    const plan = planMove({ ...base, piece: 'k', from: 'e1', to: 'g1', rookMove: { id: 'r', from: 'h1', to: 'f1' } }, full)
    const times = plan.beats.map((b) => b.at)
    expect(times).toEqual([...times].sort((a, b) => a - b))
  })
})
