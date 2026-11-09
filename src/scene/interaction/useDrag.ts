import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { gDur, gEase, gsap } from '../../motion/ease'
import type { PieceInstance } from '../../rules/types'
import { useGame } from '../../store/game'
import { useSettings } from '../../store/settings'
import { positionToSquare, squareToPosition } from '../coords'
import { stepSpring, type SpringState } from '../animation/spring'
import { useInteraction, vibrate } from './state'

const DRAG_HEIGHT = 0.6
const START_PX = 4
const FOLLOW_OMEGA = 20
const RISE_OMEGA = 14
const TILT_GAIN = 0.045
const MAX_TILT = (15 * Math.PI) / 180
const REACH = 4.6

const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DRAG_HEIGHT)
const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hit = new THREE.Vector3()

const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v))

/** R3F wraps event.target with capture helpers that route later events to this object. */
interface CaptureTarget {
  setPointerCapture(id: number): void
  releasePointerCapture(id: number): void
}
const captureTarget = (e: ThreeEvent<PointerEvent>) => e.target as unknown as CaptureTarget

export interface DragOptions {
  readonly piece: PieceInstance
  readonly outer: RefObject<THREE.Group | null>
  /** Own piece, player's turn, game running. */
  readonly enabled: boolean
  /** Return the piece to its square; `illegalNonce` is set when the store rejected the move. */
  readonly onReject: (illegalNonce: number | null) => void
}

export interface DragBindings {
  readonly onPointerDown: (e: ThreeEvent<PointerEvent>) => void
  readonly onPointerMove: (e: ThreeEvent<PointerEvent>) => void
  readonly onPointerUp: (e: ThreeEvent<PointerEvent>) => void
  readonly onPointerCancel: (e: ThreeEvent<PointerEvent>) => void
}

export function useDrag({ piece, outer, enabled, onReject }: DragOptions): {
  bind: DragBindings
  /** True if the last press turned into a drag, so the trailing click must be ignored. */
  wasDragged: RefObject<boolean>
} {
  const controls = useThree((s) => s.controls)
  const reduced = useSettings((s) => s.reducedMotion)
  const pending = useGame((s) => s.pendingPromotion)
  const press = useRef<{ id: number; x: number; y: number } | null>(null)
  const active = useRef(false)
  const wasDragged = useRef(false)
  const awaitingPromotion = useRef(false)
  const spring = useRef({
    x: { x: 0, v: 0 } as SpringState,
    y: { x: 0, v: 0 } as SpringState,
    z: { x: 0, v: 0 } as SpringState,
    target: new THREE.Vector3(),
  })

  const setControls = (on: boolean) => {
    if (controls && 'enabled' in controls) controls.enabled = on
  }

  // A resolved promotion moves the piece (square changes); a cancelled one leaves it home.
  useEffect(() => {
    awaitingPromotion.current = false
  }, [piece.square])
  useEffect(() => {
    if (pending || !awaitingPromotion.current) return
    awaitingPromotion.current = false
    onReject(null)
  }, [pending, onReject])

  useEffect(
    () => () => {
      if (!active.current) return
      useInteraction.setState({ dragging: null })
      if (controls && 'enabled' in controls) controls.enabled = true
    },
    [controls],
  )

  useFrame((_, delta) => {
    const o = outer.current
    if (!active.current || !o) return
    const s = spring.current
    const dt = Math.min(delta, 0.05)
    stepSpring(s.x, s.target.x, FOLLOW_OMEGA, dt)
    stepSpring(s.y, DRAG_HEIGHT, RISE_OMEGA, dt)
    stepSpring(s.z, s.target.z, FOLLOW_OMEGA, dt)
    o.position.set(s.x.x, s.y.x, s.z.x)
    if (reduced) return
    // Lean into the motion, eased so velocity noise does not jitter the tilt.
    const k = 1 - Math.exp(-14 * dt)
    o.rotation.z += (clamp(-s.x.v * TILT_GAIN, MAX_TILT) - o.rotation.z) * k
    o.rotation.x += (clamp(s.z.v * TILT_GAIN, MAX_TILT) - o.rotation.x) * k
  })

  const start = () => {
    const o = outer.current
    if (!o) return
    active.current = true
    wasDragged.current = true
    useInteraction.setState({ dragging: piece.id, hovered: null })
    const game = useGame.getState()
    if (game.selected !== piece.square) game.clickSquare(piece.square)
    vibrate(8)
    gsap.killTweensOf([o.position, o.rotation])
    const s = spring.current
    s.x = { x: o.position.x, v: 0 }
    s.y = { x: o.position.y, v: 0 }
    s.z = { x: o.position.z, v: 0 }
    s.target.copy(o.position)
  }

  const drop = (to: PieceInstance['square'] | null) => {
    const from = piece.square
    if (!to || to === from) return onReject(null)
    const accepted = useGame.getState().tryMove({ from, to })
    const after = useGame.getState()
    const promo = after.pendingPromotion
    // Accepted promotions wait for the picker: hover over the target until it resolves.
    if (accepted && promo && promo.from === from && promo.to === to) {
      awaitingPromotion.current = true
      const o = outer.current
      if (!o) return
      const [x, , z] = squareToPosition(to)
      gsap.to(o.position, { x, y: 0.25, z, duration: gDur('base'), ease: gEase('standard') })
      gsap.to(o.rotation, { x: 0, z: 0, duration: gDur('base'), ease: gEase('standard') })
      return
    }
    if (!accepted) onReject(after.illegalAttempt?.nonce ?? -1)
  }

  const end = (e: ThreeEvent<PointerEvent>, cancelled: boolean) => {
    if (!press.current || e.pointerId !== press.current.id) return
    e.stopPropagation()
    captureTarget(e).releasePointerCapture(e.pointerId)
    press.current = null
    setControls(true)
    if (!active.current) return
    active.current = false
    useInteraction.setState({ dragging: null })
    const to = !cancelled && e.ray.intersectPlane(boardPlane, hit) ? positionToSquare(hit.x, hit.z) : null
    drop(to)
  }

  const bind: DragBindings = {
    onPointerDown: (e) => {
      if (!enabled || e.button !== 0) return
      e.stopPropagation()
      // Runs before OrbitControls' own listener on the same canvas, so the orbit never starts.
      setControls(false)
      wasDragged.current = false
      press.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
      captureTarget(e).setPointerCapture(e.pointerId)
    },
    onPointerMove: (e) => {
      const p = press.current
      if (!p || e.pointerId !== p.id) return
      e.stopPropagation()
      if (!active.current) {
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < START_PX) return
        start()
      }
      if (e.ray.intersectPlane(dragPlane, hit)) spring.current.target.set(clamp(hit.x, REACH), DRAG_HEIGHT, clamp(hit.z, REACH))
    },
    onPointerUp: (e) => end(e, false),
    onPointerCancel: (e) => end(e, true),
  }

  return { bind, wasDragged }
}
