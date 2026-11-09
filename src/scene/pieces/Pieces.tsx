import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type * as THREE from 'three'
import { gsap } from '../../motion/ease'
import type { PieceInstance } from '../../rules/types'
import { useGame } from '../../store/game'
import { captureTimeline } from '../animation/captures'
import { noRaycast } from '../board/Highlights'
import { registry, type GhostHandle } from '../choreo/registry'
import { squareToPosition } from '../coords'
import { pieceGeometry } from './geometry'
import { Piece, pieceMaterials, yawFor } from './Piece'

interface Ghost {
  readonly key: string
  readonly piece: PieceInstance
}

/** Frames to wait for a plan to claim a ghost before it fades on its own. */
const CLAIM_WINDOW = 0.05

/** A piece that just left the board, on private fadeable materials, waiting for its capture beat. */
function CapturedGhost({ piece, onDone }: { piece: PieceInstance; onDone: () => void }) {
  const group = useRef<THREE.Group>(null)
  const mesh = useRef<THREE.Mesh>(null)
  const { geometry, accent } = pieceGeometry(piece.type)
  const mats = useMemo(
    () =>
      pieceMaterials(piece.color, accent).map((m) => {
        const c = m.clone()
        c.transparent = true
        return c
      }),
    [piece.color, accent],
  )

  const handleRef = useRef<GhostHandle | null>(null)

  useLayoutEffect(() => {
    if (!group.current || !mesh.current) return
    // Reused across StrictMode's simulated remount so a claim made in between survives.
    const handle: GhostHandle = handleRef.current ?? {
      id: piece.id,
      type: piece.type,
      color: piece.color,
      group: group.current,
      mesh: mesh.current,
      materials: mats,
      claimed: false,
      remove: onDone,
    }
    handleRef.current = handle
    const unregister = registry.addGhost(handle)
    let fade: gsap.core.Timeline | null = null
    const wait = gsap.delayedCall(CLAIM_WINDOW, () => {
      if (!handle.claimed) fade = captureTimeline('fade', { ghost: handle, direction: [0, 0], track: () => {} })
    })
    // Capture tweens are not killed here: StrictMode's simulated remount runs after the
    // Director has scheduled them. A real unmount comes from the capture's end or resetAll.
    return () => {
      unregister()
      wait.kill()
      fade?.kill()
    }
    // Registers once per ghost; later prop changes must not re-register it.
  }, [])

  useLayoutEffect(() => () => mats.forEach((m) => m.dispose()), [mats])
  const [position] = useState(() => squareToPosition(piece.square) as [number, number, number])

  return (
    <group ref={group} position={position}>
      <mesh ref={mesh} geometry={geometry} material={mats} rotation-y={yawFor(piece.color)} castShadow raycast={noRaycast} />
    </group>
  )
}

export function Pieces({ blobShadows }: { blobShadows: boolean }) {
  const pieces = useGame((s) => s.pieces)
  const [prev, setPrev] = useState(pieces)
  const [ghosts, setGhosts] = useState<readonly Ghost[]>([])
  const serial = useRef(0)

  // Derive removals during render so the captured piece never blinks out for a frame.
  if (prev !== pieces) {
    const live = new Set(pieces.map((p) => p.id))
    const gone = prev.filter((p) => !live.has(p.id))
    setPrev(pieces)
    if (gone.length) {
      const added = gone.map((piece) => ({ key: `${piece.id}:${(serial.current += 1)}`, piece }))
      setGhosts((g) => [...g, ...added])
    }
  }

  return (
    <group>
      {pieces.map((p) => (
        <Piece key={p.id} piece={p} blobShadow={blobShadows} />
      ))}
      {ghosts.map((g) => (
        <CapturedGhost key={g.key} piece={g.piece} onDone={() => setGhosts((all) => all.filter((x) => x.key !== g.key))} />
      ))}
    </group>
  )
}
