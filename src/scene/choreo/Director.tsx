import { useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef, useState } from 'react'
import { useGame } from '../../store/game'
import { setSettledPly } from '../../store/presentation'
import { useSettings } from '../../store/settings'
import { toMoveEvent } from './moveEvent'
import { createPerformer, returnHome } from './perform'
import { planMove } from './plan'
import { registry } from './registry'

/**
 * Turns each new move into a choreographed performance. Mount right after <Pieces/>: its
 * layout effect then runs after every Piece and ghost has registered and marked itself moved.
 */
export function Director() {
  const gl = useThree((s) => s.gl)
  const history = useGame((s) => s.history)
  const seen = useRef(history)
  const [performer] = useState(createPerformer)

  useLayoutEffect(() => {
    gl.localClippingEnabled = true
  }, [gl])

  useLayoutEffect(() => {
    setSettledPly(useGame.getState().history.length)
    return () => performer.dispose()
  }, [performer])

  useLayoutEffect(() => {
    const before = seen.current
    if (before === history) return
    seen.current = history
    const reducedMotion = useSettings.getState().reducedMotion
    const last = history.at(-1)
    const grewByOne = last !== undefined && history.length === before.length + 1 && history[before.length - 1] === before.at(-1)
    if (!grewByOne) {
      performer.resetAll(reducedMotion)
      return
    }
    const game = useGame.getState()
    const event = toMoveEvent(last, game.pieces, game)
    const covered = new Set<string>()
    if (event) {
      const plan = planMove(event, { reducedMotion })
      for (const b of plan.beats) if (b.kind === 'move') covered.add(b.id)
      performer.enqueue({ plan, ply: event.ply })
    } else {
      performer.settle(history.length)
    }
    for (const id of registry.takeMoved()) {
      const h = registry.piece(id)
      if (h && !covered.has(id)) returnHome(h, reducedMotion)
    }
  }, [history, performer])

  return null
}
