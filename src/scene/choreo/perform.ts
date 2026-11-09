import { playSound } from '../../audio'
import { gDur, gEase, gsap } from '../../motion/ease'
import { useGame } from '../../store/game'
import { nextStage, setCinematic, setSettledPly } from '../../store/presentation'
import { captureTimeline, ghostTargets } from '../animation/captures'
import { kingTopple } from '../animation/pivot'
import { motionTargets, signatures } from '../animation/signatures'
import { squareToPosition } from '../coords'
import { useInteraction, vibrate } from '../interaction/state'
import { morphTimeline } from '../pieces/morph'
import { cameraBus, fxBus } from './bus'
import { direction } from './plan'
import { registry, type PieceHandle } from './registry'
import type { Beat, ChoreoPlan } from './types'

export interface Performance {
  readonly plan: ChoreoPlan
  readonly ply: number
}

export interface Performer {
  /** Plays after whatever is playing, so animations never cut each other off. */
  enqueue(performance: Performance): void
  /** A ply with no plan: settled at once when idle, else when the queue drains. */
  settle(ply: number): void
  /** The board changed under us (undo, new game): stop everything and put pieces on their squares. */
  resetAll(reducedMotion: boolean): void
  dispose(): void
}

/** Puts a piece back on its square, upright, showing its true type. */
export function returnHome(h: PieceHandle, reducedMotion: boolean): void {
  gsap.killTweensOf(motionTargets(h))
  h.reveal()
  h.lift.rotation.set(0, 0, 0)
  h.lift.scale.set(1, 1, 1)
  h.shake.position.set(0, 0, 0)
  h.shake.quaternion.identity()
  const [x, y, z] = squareToPosition(h.square)
  if (reducedMotion) {
    h.outer.position.set(x, y, z)
    h.outer.rotation.x = 0
    h.outer.rotation.z = 0
    return
  }
  gsap.to(h.outer.position, { x, y, z, duration: gDur('base'), ease: gEase('standard') })
  gsap.to(h.outer.rotation, { x: 0, z: 0, duration: gDur('base'), ease: gEase('standard') })
}

/** Topple away from the checker; toward camera-right when no checker is known. */
function toppleDirection(plan: ChoreoPlan, king: Beat & { kind: 'topple' }): readonly [number, number] {
  for (const b of plan.beats) {
    if (b.kind === 'fx' && b.fx.type === 'threatLine' && b.fx.to === king.square) return direction(b.fx.from, king.square)
  }
  return useGame.getState().orientation === 'w' ? [1, 0] : [-1, 0]
}

export function createPerformer(): Performer {
  const queue: Performance[] = []
  let current: gsap.core.Timeline | null = null
  let cleanups: (() => void)[] = []
  let floor = 0
  const track = (cleanup: () => void) => void cleanups.push(cleanup)

  const runCleanups = () => {
    const list = cleanups
    cleanups = []
    list.forEach((c) => c())
  }

  function addBeat(tl: gsap.core.Timeline, beat: Beat, plan: ChoreoPlan, speed: number): void {
    switch (beat.kind) {
      case 'move': {
        const handle = registry.piece(beat.id)
        if (!handle) return
        gsap.killTweensOf(motionTargets(handle))
        const p = handle.outer.position
        const ctx = {
          handle,
          from: [p.x, p.y, p.z] as const,
          to: squareToPosition(beat.to),
          fromSquare: beat.from,
          toSquare: beat.to,
          duration: beat.duration,
          capturing: beat.capturing,
        }
        tl.add(signatures[beat.signature](ctx), beat.at)
        return
      }
      case 'capture': {
        const ghost = registry.ghost(beat.id)
        if (ghost) tl.add(captureTimeline(beat.style, { ghost, direction: beat.direction, track }), beat.at)
        return
      }
      case 'morph': {
        const handle = registry.piece(beat.id)
        if (handle) tl.add(morphTimeline(handle, beat.to, beat.duration, track), beat.at)
        return
      }
      case 'topple': {
        const king = registry.pieceOn(beat.square)
        if (!king || king.type !== 'k') return
        const [dx, dz] = toppleDirection(plan, beat)
        tl.add(kingTopple(king, dx, dz), beat.at)
        return
      }
      case 'fx':
        tl.call(() => fxBus.emit(beat.fx), undefined, beat.at)
        return
      case 'camera':
        tl.call(() => cameraBus.emit(beat.action), undefined, beat.at)
        return
      case 'sound':
        tl.call(() => playSound(beat.cue, beat.square), undefined, beat.at)
        return
      case 'haptic':
        tl.call(() => vibrate(beat.pattern), undefined, beat.at)
        return
      case 'timeScale': {
        const s = { v: 1 }
        const apply = () => void tl.timeScale(speed * s.v)
        tl.to(s, { v: beat.scale, duration: 0.12, ease: 'sine.inOut', onUpdate: apply }, beat.at)
        tl.to(s, { v: 1, duration: 0.25, ease: 'sine.inOut', onUpdate: apply }, beat.at + beat.duration)
        return
      }
    }
  }

  function playNext(): void {
    const waiting = queue.length
    const next = queue.shift()
    if (!next) {
      current = null
      setCinematic(false)
      return
    }
    // A backlog (engine replied mid-animation) plays at double speed to catch up.
    const speed = waiting > 1 ? 2 : 1
    const tl = gsap.timeline({ paused: true })
    for (const beat of next.plan.beats) addBeat(tl, beat, next.plan, speed)
    tl.set({}, {}, next.plan.duration)
    tl.eventCallback('onComplete', () => {
      tl.kill()
      cleanups = []
      setSettledPly(queue.length === 0 ? Math.max(next.ply, floor) : next.ply)
      playNext()
    })
    current = tl
    nextStage()
    setCinematic(true)
    tl.timeScale(speed).play()
  }

  const stop = () => {
    current?.kill()
    current = null
    queue.length = 0
    runCleanups()
    floor = 0
  }

  return {
    enqueue(performance) {
      for (const b of performance.plan.beats) {
        const ghost = b.kind === 'capture' ? registry.ghost(b.id) : undefined
        if (ghost) ghost.claimed = true
      }
      queue.push(performance)
      if (!current) playNext()
    },

    settle(ply) {
      floor = Math.max(floor, ply)
      if (!current) setSettledPly(floor)
    },

    resetAll(reducedMotion) {
      stop()
      for (const g of registry.ghosts()) {
        gsap.killTweensOf(ghostTargets(g))
        g.remove()
      }
      const dragging = useInteraction.getState().dragging
      for (const h of registry.pieces()) if (h.id !== dragging) returnHome(h, reducedMotion)
      registry.takeMoved()
      nextStage()
      fxBus.emit({ type: 'mood', mood: 'normal' })
      cameraBus.emit({ type: 'release', duration: 0.8 })
      setCinematic(false)
      setSettledPly(useGame.getState().history.length)
    },

    dispose() {
      stop()
      setCinematic(false)
    },
  }
}
