import { describe, expect, it } from 'vitest'
import { CALLOUT_DURATION, planMove } from './plan'
import type { Beat, FxEvent, MoveEvent } from './types'
import type { Tactic } from '../../rules/types'

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
  tactics: [],
}
const full = { reducedMotion: false, showTactics: true }
const reduced = { reducedMotion: true, showTactics: true }
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

  describe('tactics', () => {
    const fork: Tactic = { kind: 'fork', by: 'w', attacker: 'c7', targets: ['a8', 'e8'] }
    const pin: Tactic = { kind: 'pin', by: 'w', attacker: 'b5', pinned: 'c6', behind: 'e8', absolute: true }
    const skewer: Tactic = { kind: 'skewer', by: 'w', attacker: 'h1', front: 'e4', behind: 'b7' }
    const sac: Tactic = { kind: 'sacrifice', by: 'w', square: 'c7', piece: 'n', loss: 3 }
    const knightFork: MoveEvent = { ...base, piece: 'n', id: 'w-n', from: 'b5', to: 'c7', tactics: [fork, pin] }
    const fx = <T extends FxEvent['type']>(beats: readonly Beat[], type: T) =>
      beats.flatMap((b) => (b.kind === 'fx' && b.fx.type === type ? [{ at: b.at, fx: b.fx as Extract<FxEvent, { type: T }> }] : []))

    it('draws one tactic beat per tactic, primary first, and labels only the primary at its anchor', () => {
      const plan = planMove(knightFork, full)
      const lines = fx(plan.beats, 'tactic')
      expect(lines.map((l) => [l.fx.tactic.kind, l.fx.primary])).toEqual([
        ['fork', true],
        ['pin', false],
      ])
      expect(lines[1].at).toBeGreaterThan(lines[0].at)
      const callouts = fx(plan.beats, 'callout')
      expect(callouts).toHaveLength(1)
      expect(callouts[0].fx).toMatchObject({ square: 'c7', duration: CALLOUT_DURATION })
      expect(callouts[0].fx.tactic).toBe(fork)
      expect(plan.beats.some((b) => b.kind === 'sound' && b.cue === 'tactic' && b.at === callouts[0].at)).toBe(true)
      expect(plan.beats.some((b) => b.kind === 'haptic' && b.at === callouts[0].at)).toBe(true)
      expect(plan.duration).toBeGreaterThanOrEqual(callouts[0].at + CALLOUT_DURATION)
    })

    it('anchors the label on the piece each tactic is about', () => {
      const anchor = (t: Tactic) => fx(planMove({ ...knightFork, tactics: [t] }, full).beats, 'callout')[0].fx.square
      expect(anchor(pin)).toBe('c6')
      expect(anchor(skewer)).toBe('e4')
      expect(anchor(sac)).toBe('c7')
      expect(anchor({ kind: 'discovered', by: 'w', mover: 'd5', vacated: 'd4', attacker: 'd1', target: 'd8', check: false })).toBe('d8')
      expect(anchor({ kind: 'doubleCheck', by: 'w', checkers: ['f7', 'c4'], king: 'e8' })).toBe('e8')
      expect(anchor({ kind: 'backRank', by: 'w', attacker: 'e1', king: 'g8', entry: 'e8', mate: false })).toBe('e8')
    })

    it('emits nothing when the setting is off or there are no tactics', () => {
      const off = planMove(knightFork, { ...full, showTactics: false })
      expect(fxTypes(off.beats)).not.toContain('tactic')
      expect(fxTypes(off.beats)).not.toContain('callout')
      expect(off.beats.some((b) => b.kind === 'sound' && b.cue === 'tactic')).toBe(false)
      expect(fxTypes(planMove(base, full).beats)).not.toContain('tactic')
    })

    it('draws at most three tactics', () => {
      const plan = planMove({ ...knightFork, tactics: [fork, skewer, pin, sac] }, full)
      expect(fx(plan.beats, 'tactic').map((l) => l.fx.tactic.kind)).toEqual(['fork', 'skewer', 'pin'])
    })

    it('reveals after the move lands, alongside the check beats', () => {
      const plan = planMove({ ...knightFork, checkers: ['c7'], kingSquare: 'e8' }, full)
      const move = kinds(plan.beats, 'move')[0]
      const [first] = fx(plan.beats, 'tactic')
      const [threat] = fx(plan.beats, 'threatLine')
      if (move.kind !== 'move') throw new Error('expected move')
      // Knight impact is 86% of its leap.
      expect(first.at).toBeGreaterThan(move.duration * 0.86)
      expect(first.at).toBeGreaterThanOrEqual(threat.at)
      expect(fx(plan.beats, 'callout')[0].at).toBeGreaterThan(first.at)
    })

    it('waits for a capture or promotion to settle', () => {
      const promo = planMove({ ...base, from: 'b7', to: 'b8', promotion: 'q', tactics: [fork] }, full)
      const [morph] = kinds(promo.beats, 'morph')
      if (morph.kind !== 'morph') throw new Error('expected morph')
      expect(fx(promo.beats, 'tactic')[0].at).toBeGreaterThan(morph.at + morph.duration)
    })

    it('on mate skips tactic lines; a back-rank mate keeps only its label', () => {
      const mate = { ...base, piece: 'r' as const, from: 'e1' as const, to: 'e8' as const, checkers: ['e8' as const], kingSquare: 'g8' as const, mate: true }
      const plain = planMove({ ...mate, tactics: [pin] }, full)
      expect(fxTypes(plain.beats)).not.toContain('tactic')
      expect(fxTypes(plain.beats)).not.toContain('callout')

      const backRank: Tactic = { kind: 'backRank', by: 'w', attacker: 'e8', king: 'g8', entry: 'e8', mate: true }
      const plan = planMove({ ...mate, tactics: [pin, backRank] }, full)
      expect(fxTypes(plan.beats)).not.toContain('tactic')
      const callouts = fx(plan.beats, 'callout')
      expect(callouts).toHaveLength(1)
      expect(callouts[0].fx.tactic).toBe(backRank)
      expect(callouts[0].fx.square).toBe('e8')
      const [topple] = kinds(plan.beats, 'topple')
      expect(callouts[0].at).toBeLessThan(topple.at)
      expect(plan.beats.some((b) => b.kind === 'sound' && b.cue === 'tactic')).toBe(false)
    })

    it('reduced motion keeps the lines and the label', () => {
      const plan = planMove(knightFork, reduced)
      expect(fx(plan.beats, 'tactic')).toHaveLength(2)
      expect(fx(plan.beats, 'callout')).toHaveLength(1)
    })
  })
})
