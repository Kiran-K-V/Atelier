import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type * as THREE from 'three'
import type { PieceInstance } from '../../rules/types'
import { useGame } from '../../store/game'
import { useSettings } from '../../store/settings'
import { playCaptureTween } from '../animation/moveTween'
import { noRaycast } from '../board/Highlights'
import { squareToPosition } from '../coords'
import { pieceGeometry } from './geometry'
import { Piece, pieceMaterials, yawFor } from './Piece'

interface Ghost {
  readonly key: string
  readonly piece: PieceInstance
}

/** A piece that just left the board: plays the capture animation on private, fadeable materials. */
function CapturedGhost({ piece, onDone }: { piece: PieceInstance; onDone: () => void }) {
  const group = useRef<THREE.Group>(null)
  const reduced = useSettings((s) => s.reducedMotion)
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

  useLayoutEffect(() => {
    if (!group.current) return
    const tl = playCaptureTween({ object: group.current, materials: mats, reducedMotion: reduced })
    tl.eventCallback('onComplete', onDone)
    return () => {
      tl.kill()
    }
    // Plays once per ghost; later prop changes must not restart it.
  }, [])

  useLayoutEffect(() => () => mats.forEach((m) => m.dispose()), [mats])
  const [position] = useState(() => squareToPosition(piece.square) as [number, number, number])

  return (
    <group ref={group} position={position}>
      <mesh geometry={geometry} material={mats} rotation-y={yawFor(piece.color)} castShadow raycast={noRaycast} />
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
