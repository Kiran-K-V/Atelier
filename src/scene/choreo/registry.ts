import type * as THREE from 'three'
import type { Color, PieceSymbol, Square } from '../../rules/types'

/** A live piece's scene graph, registered by Piece so the performer can drive it. */
export interface PieceHandle {
  readonly id: string
  readonly color: Color
  /** Game truth, kept current by Piece; the mesh may still show the old type until `reveal`. */
  type: PieceSymbol
  square: Square
  /** Board position and yaw. */
  readonly outer: THREE.Group
  /** Squash, lean and tilt pivot at the base. Its y position belongs to the hover lift. */
  readonly lift: THREE.Group
  /** Jitter, rejection shake and the king topple. */
  readonly shake: THREE.Group
  readonly mesh: THREE.Mesh
  /** Shows the mesh for the current `type` and makes it visible. */
  reveal(): void
}

/** A captured piece's last pose on private transparent materials, waiting for its capture beat. */
export interface GhostHandle {
  readonly id: string
  readonly type: PieceSymbol
  readonly color: Color
  readonly group: THREE.Group
  readonly mesh: THREE.Mesh
  readonly materials: readonly THREE.Material[]
  /** Set when a plan takes this ghost; unclaimed ghosts fade on their own. */
  claimed: boolean
  /** Unmounts the ghost. */
  remove(): void
}

const pieces = new Map<string, PieceHandle>()
const ghosts = new Map<string, GhostHandle>()
const moved = new Set<string>()

function add<T extends { id: string }>(map: Map<string, T>, handle: T): () => void {
  map.set(handle.id, handle)
  return () => {
    if (map.get(handle.id) === handle) map.delete(handle.id)
  }
}

export const registry = {
  addPiece: (h: PieceHandle) => add(pieces, h),
  addGhost: (h: GhostHandle) => add(ghosts, h),
  piece: (id: string) => pieces.get(id),
  pieceOn: (square: Square) => [...pieces.values()].find((h) => h.square === square),
  ghost: (id: string) => ghosts.get(id),
  pieces: () => [...pieces.values()],
  ghosts: () => [...ghosts.values()],
  /** Piece changed square; the Director decides how it gets there. */
  markMoved: (id: string) => void moved.add(id),
  takeMoved: (): string[] => {
    const ids = [...moved]
    moved.clear()
    return ids
  },
}
