import * as THREE from 'three'
import { gEase, gsap } from '../../motion/ease'
import type { Color, PieceSymbol } from '../../rules/types'
import type { PieceHandle } from '../choreo/registry'
import { materials, pieceMaterial } from '../materials'
import { accentGeometry, pieceGeometry, RADIAL_SEGMENTS, type AccentSlot } from './geometry'
import { yawFor, pieceMaterials } from './Piece'
import { matchedProfiles } from './profileMorph'
import { PROFILES } from './profiles'

type LatheTarget = 'q' | 'r' | 'b'
const POINTS = 72

const morphCache = new Map<LatheTarget, THREE.BufferGeometry>()

/** Pawn lathe carrying the target body as morph target 0. Built once per target and reused. */
function morphGeometry(to: LatheTarget): THREE.BufferGeometry {
  let g = morphCache.get(to)
  if (!g) {
    const [from, target] = matchedProfiles(PROFILES.p, PROFILES[to], POINTS)
    g = new THREE.LatheGeometry(from, RADIAL_SEGMENTS)
    const t = new THREE.LatheGeometry(target, RADIAL_SEGMENTS)
    g.morphAttributes.position = [t.getAttribute('position')]
    g.morphAttributes.normal = [t.getAttribute('normal')]
    morphCache.set(to, g)
  }
  return g
}

function slotMaterial(slot: AccentSlot, color: Color): THREE.Material {
  const m = materials()
  return slot === 'body' ? pieceMaterial(color) : slot === 'brass' ? m.brass : m.slit
}

export type Track = (cleanup: () => void) => void

/**
 * Promotion: the pawn's silhouette flows into the new piece's, then its details (crenels,
 * coronet, collar, slit) grow in. The knight has no lathe body, so it crossfades instead.
 * The real mesh is hidden meanwhile and revealed as the new type at the end.
 */
export function morphTimeline(handle: PieceHandle, to: PieceSymbol, duration: number, track: Track): gsap.core.Timeline {
  const tl = gsap.timeline()
  if (duration === 0 || (to !== 'q' && to !== 'r' && to !== 'b' && to !== 'n')) return tl.call(() => handle.reveal(), undefined, 0)
  const rig = new THREE.Group()
  rig.rotation.y = yawFor(handle.color)
  let disposables: THREE.Material[] = []
  const finish = () => {
    handle.shake.remove(rig)
    disposables.forEach((m) => m.dispose())
    disposables = []
  }
  track(finish)
  tl.call(() => {
    handle.mesh.visible = false
    handle.shake.add(rig)
  }, undefined, 0)
  if (to === 'n') crossfade(tl, rig, handle.color, duration, (m) => disposables.push(...m))
  else flow(tl, rig, handle.color, to, duration)
  tl.call(() => {
    handle.reveal()
    finish()
  }, undefined, duration)
  return tl
}

function flow(tl: gsap.core.Timeline, rig: THREE.Group, color: Color, to: LatheTarget, duration: number): void {
  const body = new THREE.Mesh(morphGeometry(to), pieceMaterial(color))
  body.castShadow = true
  const influences = [0]
  body.morphTargetInfluences = influences
  const accent = accentGeometry(to)
  const detail = new THREE.Mesh(
    accent.geometry,
    accent.slots.map((s) => slotMaterial(s, color)),
  )
  detail.castShadow = true
  detail.position.copy(accent.center)
  detail.scale.setScalar(0.001)
  rig.add(body, detail)
  const k = { v: 0 }
  tl.to(k, { v: 1, duration, ease: gEase('soft'), onUpdate: () => void (influences[0] = k.v) }, 0)
  tl.to(detail.scale, { x: 1, y: 1, z: 1, duration: duration * 0.3, ease: gEase('overshoot') }, duration * 0.7)
}

function crossfade(tl: gsap.core.Timeline, rig: THREE.Group, color: Color, duration: number, own: (m: THREE.Material[]) => void): void {
  const clone = (list: THREE.Material[], opacity: number) =>
    list.map((m) => {
      const c = m.clone()
      c.transparent = true
      c.opacity = opacity
      return c
    })
  const pawnGeo = pieceGeometry('p')
  const knightGeo = pieceGeometry('n')
  const pawnMats = clone(pieceMaterials(color, pawnGeo.accent), 1)
  const knightMats = clone(pieceMaterials(color, knightGeo.accent), 0)
  own([...pawnMats, ...knightMats])
  const pawn = new THREE.Mesh(pawnGeo.geometry, pawnMats)
  const knight = new THREE.Mesh(knightGeo.geometry, knightMats)
  knight.castShadow = true
  knight.scale.set(0.7, 0.25, 0.7)
  rig.add(pawn, knight)
  tl.to(pawnMats, { opacity: 0, duration: duration * 0.55, ease: gEase('exit') }, 0)
  tl.to(pawn.scale, { x: 0.85, y: 0.85, z: 0.85, duration: duration * 0.55, ease: gEase('soft') }, 0)
  tl.to(knightMats, { opacity: 1, duration: duration * 0.6, ease: gEase('enter') }, duration * 0.2)
  tl.to(knight.scale, { x: 1, y: 1, z: 1, duration: duration * 0.8, ease: gEase('overshoot') }, duration * 0.2)
}
