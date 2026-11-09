import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { gDur, gEase, gsap } from '../../motion/ease'
import { playSound } from '../../audio'
import type { Color, PieceInstance, Square } from '../../rules/types'
import { useGame } from '../../store/game'
import { useSettings } from '../../store/settings'
import { playSnapBack, shakeTimeline } from '../animation/snapBack'
import { motionTargets } from '../animation/signatures'
import { noRaycast } from '../board/Highlights'
import { registry, type PieceHandle } from '../choreo/registry'
import { squareToPosition } from '../coords'
import { hover, useInteraction, vibrate } from '../interaction/state'
import { useDrag } from '../interaction/useDrag'
import { materials, pieceMaterial } from '../materials'
import { glowTexture } from '../materials/glow'
import { pieceGeometry, type AccentKind } from './geometry'
import { BASE_RADIUS, PIECE_HEIGHT } from './profiles'

const HOVER_LIFT = 0.12

/** Black pieces are turned to face their own player (and the knight to face white). */
export const yawFor = (color: Color) => (color === 'w' ? 0 : Math.PI)

/** Slot order matches geometry groups: body, felt, accent. */
export function pieceMaterials(color: Color, accent: AccentKind): THREE.Material[] {
  const m = materials()
  const list: THREE.Material[] = [pieceMaterial(color), m.felt]
  if (accent === 'brass') list.push(m.brass)
  if (accent === 'slit') list.push(m.slit)
  return list
}

const hitGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 12)
hitGeometry.translate(0, 0.5, 0)

let blobMaterial: THREE.MeshBasicMaterial | null = null
const blobGeometry = new THREE.PlaneGeometry(1, 1)

/** Low tier stand-in for contact shadows: a soft blob that stays on the board and spreads as the piece rises. */
function BlobShadow({ outer, lift, radius }: { outer: RefObject<THREE.Group | null>; lift: RefObject<THREE.Group | null>; radius: number }) {
  const mesh = useRef<THREE.Mesh>(null)
  blobMaterial ??= new THREE.MeshBasicMaterial({
    color: '#000',
    map: glowTexture('blob'),
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  })
  useFrame(() => {
    const m = mesh.current
    if (!m || !outer.current || !lift.current) return
    const y = outer.current.position.y
    const h = y + lift.current.position.y
    m.position.y = 0.004 - y
    m.scale.setScalar(radius * 3.2 * (1 + h * 0.8))
  })
  return <mesh ref={mesh} geometry={blobGeometry} material={blobMaterial} rotation-x={-Math.PI / 2} renderOrder={1} raycast={noRaycast} />
}

interface PieceProps {
  readonly piece: PieceInstance
  readonly blobShadow: boolean
}

function PieceView({ piece, blobShadow }: PieceProps) {
  const outer = useRef<THREE.Group>(null)
  const lift = useRef<THREE.Group>(null)
  const shake = useRef<THREE.Group>(null)
  const mesh = useRef<THREE.Mesh>(null)
  const handle = useRef<PieceHandle | null>(null)
  const placedOn = useRef<Square | null>(null)
  // Lags `piece.type` through a promotion until the morph reveals the new body.
  const [shownType, setShownType] = useState(piece.type)
  const reduced = useSettings((s) => s.reducedMotion)
  const canAct = useGame(
    (s) => s.playerColor === piece.color && s.turn === s.playerColor && s.status.kind === 'playing' && !s.pendingPromotion,
  )
  const selected = useGame((s) => s.selected === piece.square)
  const illegal = useGame((s) => s.illegalAttempt)
  const hovered = useInteraction((s) => s.hovered === piece.square)
  const dragging = useInteraction((s) => s.dragging === piece.id)
  const handledNonce = useRef(illegal?.nonce ?? null)

  const { geometry, accent } = pieceGeometry(shownType)
  const mats = useMemo(() => pieceMaterials(piece.color, accent), [piece.color, accent])

  useLayoutEffect(() => {
    const [o, l, s, m] = [outer.current, lift.current, shake.current, mesh.current]
    if (!o || !l || !s || !m) return
    const h: PieceHandle = {
      id: piece.id,
      color: piece.color,
      type: piece.type,
      square: piece.square,
      outer: o,
      lift: l,
      shake: s,
      mesh: m,
      reveal: () => {
        // Set imperatively too, so the swap lands on the same frame the morph mesh leaves.
        const g = pieceGeometry(h.type)
        m.geometry = g.geometry
        m.material = pieceMaterials(h.color, g.accent)
        m.visible = true
        setShownType(h.type)
      },
    }
    handle.current = h
    const unregister = registry.addPiece(h)
    return () => {
      unregister()
      gsap.killTweensOf([...motionTargets(h), l.position])
    }
    // The key is the piece id, so the handle lives exactly as long as this component.
  }, [])

  useLayoutEffect(() => {
    if (!handle.current) return
    handle.current.type = piece.type
    handle.current.square = piece.square
  })

  // First placement is instant; later square changes are performed by the Director.
  useLayoutEffect(() => {
    const o = outer.current
    if (!o || placedOn.current === piece.square) return
    if (placedOn.current === null) o.position.set(...squareToPosition(piece.square))
    else registry.markMoved(piece.id)
    placedOn.current = piece.square
  }, [piece.square, piece.id])

  const lifted = (hovered || selected) && canAct && !dragging && !reduced
  useEffect(() => {
    if (!lift.current) return
    gsap.to(lift.current.position, {
      y: lifted ? HOVER_LIFT : 0,
      duration: gDur('fast'),
      ease: gEase(lifted ? 'enter' : 'standard'),
      overwrite: true,
    })
  }, [lifted])

  const onReject = useCallback(
    (illegalNonce: number | null) => {
      if (!outer.current || !shake.current) return
      if (illegalNonce !== null) {
        handledNonce.current = illegalNonce
        vibrate(15)
        playSound('illegal', piece.square)
      }
      playSnapBack({
        object: outer.current,
        shake: shake.current,
        to: squareToPosition(piece.square),
        withShake: illegalNonce !== null,
        reducedMotion: reduced,
      })
    },
    [piece.square, reduced],
  )

  // Rejections from clicks or the keyboard arrive through the store, not through a drop.
  useEffect(() => {
    if (!illegal || illegal.nonce === handledNonce.current) return
    handledNonce.current = illegal.nonce
    if (illegal.square !== piece.square) return
    vibrate(15)
    playSound('illegal', piece.square)
    if (!reduced && shake.current) shakeTimeline(shake.current)
  }, [illegal, piece.square, reduced])

  const { bind, wasDragged } = useDrag({ piece, outer, enabled: canAct, onReject })

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    bind.onPointerMove(e)
    e.stopPropagation()
    hover(piece.square)
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 4 || wasDragged.current) return
    useGame.getState().clickSquare(piece.square)
  }

  return (
    <group ref={outer}>
      <group ref={lift}>
        <group ref={shake}>
          <mesh
            ref={mesh}
            geometry={geometry}
            material={mats}
            rotation-y={yawFor(piece.color)}
            castShadow
            receiveShadow
            raycast={noRaycast}
          />
        </group>
      </group>
      <mesh
        geometry={hitGeometry}
        scale={[1, PIECE_HEIGHT[piece.type], 1]}
        visible={false}
        onPointerDown={bind.onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={bind.onPointerUp}
        onPointerCancel={bind.onPointerCancel}
        onPointerOut={() => hover(null)}
        onClick={onClick}
      />
      {blobShadow && <BlobShadow outer={outer} lift={lift} radius={BASE_RADIUS[piece.type]} />}
    </group>
  )
}

export const Piece = memo(
  PieceView,
  (a, b) =>
    a.blobShadow === b.blobShadow &&
    a.piece.id === b.piece.id &&
    a.piece.square === b.piece.square &&
    a.piece.type === b.piece.type &&
    a.piece.color === b.piece.color,
)
