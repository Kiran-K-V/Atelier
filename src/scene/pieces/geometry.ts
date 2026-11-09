import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { PieceSymbol } from '../../rules/types'
import { BASE_RADIUS, KNIGHT_PLINTH, PIECE_HEIGHT, PROFILES, type Profile } from './profiles'

export const RADIAL_SEGMENTS = 72
const DEG = Math.PI / 180

/** Material slot order inside every piece geometry (geometry groups). */
export const SLOT = { body: 0, felt: 1, accent: 2 } as const

export type AccentKind = 'brass' | 'slit' | null

export interface PieceGeometry {
  readonly geometry: THREE.BufferGeometry
  readonly accent: AccentKind
}

export function profileToPoints(profile: Profile, divisions = 12): THREE.Vector2[] {
  const path = new THREE.Path()
  for (const c of profile) {
    switch (c[0]) {
      case 'M':
        path.moveTo(c[1], c[2])
        break
      case 'L':
        path.lineTo(c[1], c[2])
        break
      case 'Q':
        path.quadraticCurveTo(c[1], c[2], c[3], c[4])
        break
      case 'A':
        path.absarc(c[1], c[2], c[3], c[4] * DEG, c[5] * DEG, false)
        break
    }
  }
  return path.getPoints(divisions).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y))
}

/** Position + normal only, non-indexed, so parts built by different generators merge. */
function normalize(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const src = g.index ? g.toNonIndexed() : g
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', src.getAttribute('position'))
  out.setAttribute('normal', src.getAttribute('normal'))
  return out
}

function merge(parts: THREE.BufferGeometry[], useGroups = false): THREE.BufferGeometry {
  const merged = mergeGeometries(parts.map(normalize), useGroups)
  if (!merged) throw new Error('piece geometry merge failed')
  return merged
}

function lathe(profile: Profile): THREE.BufferGeometry {
  return new THREE.LatheGeometry(profileToPoints(profile), RADIAL_SEGMENTS)
}

/** Baize disc just under the foot; hidden on the board, seen when a piece is lifted or tilted. */
function felt(type: PieceSymbol): THREE.BufferGeometry {
  const g = new THREE.CircleGeometry(BASE_RADIUS[type] - 0.008, RADIAL_SEGMENTS)
  g.rotateX(Math.PI / 2)
  g.translate(0, -0.0008, 0)
  return g
}

function collar(y: number, radius: number, tube: number): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(radius, tube, 16, RADIAL_SEGMENTS)
  g.rotateX(Math.PI / 2)
  g.translate(0, y, 0)
  return g
}

function assemble(body: THREE.BufferGeometry[], type: PieceSymbol, accent: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const roles = [merge(body), normalize(felt(type))]
  if (accent.length) roles.push(merge(accent))
  return merge(roles, true)
}

/** Six merlons as bevelled ring sectors, so the crenels read as real cuts in the turret. */
function rookCrenels(): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = []
  const count = 6
  const span = (360 / count) * 0.68 * DEG
  for (let i = 0; i < count; i++) {
    const a0 = (i * 360) / count * DEG - span / 2
    const shape = new THREE.Shape()
    shape.absarc(0, 0, 0.198, a0, a0 + span, false)
    shape.absarc(0, 0, 0.15, a0 + span, a0, true)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.007,
      bevelSegments: 3,
      curveSegments: 10,
    })
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0.58, 0)
    parts.push(g)
  }
  return parts
}

/** Radius of a lathe profile at height y, from a y-monotonic run of its points. */
function radiusAt(points: readonly THREE.Vector2[], y: number): number {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) return a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x)
  }
  return 0
}

/**
 * The mitre slit as a thin dark ribbon lying on the mitre surface along a tilted-plane cut.
 * Cheaper and cleaner than boolean geometry, and reads as an engraved cut.
 */
function bishopSlit(): THREE.BufferGeometry {
  const mitre = profileToPoints(PROFILES.b, 24).filter((p) => p.y >= 0.5 && p.y <= 0.735)
  const steps = 40
  const halfWidth = 0.009
  const lift = 0.0015
  const positions: number[] = []
  const normals: number[] = []
  const ring = (phi: number, y: number) => {
    const r = radiusAt(mitre, y) + lift
    return [r * Math.sin(phi), y, r * Math.cos(phi)]
  }
  for (let i = 0; i < steps; i++) {
    const p0 = (-75 + (150 * i) / steps) * DEG
    const p1 = (-75 + (150 * (i + 1)) / steps) * DEG
    const y0 = 0.63 + 0.055 * Math.sin(p0)
    const y1 = 0.63 + 0.055 * Math.sin(p1)
    const a = ring(p0, y0 - halfWidth)
    const b = ring(p1, y1 - halfWidth)
    const c = ring(p1, y1 + halfWidth)
    const d = ring(p0, y0 + halfWidth)
    positions.push(...a, ...b, ...c, ...a, ...c, ...d)
    const n0 = [Math.sin(p0), 0.3, Math.cos(p0)]
    const n1 = [Math.sin(p1), 0.3, Math.cos(p1)]
    normals.push(...n0, ...n1, ...n1, ...n0, ...n1, ...n0)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  return g
}

function sphere(radius: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(radius, 24, 16)
  g.translate(x, y, z)
  return g
}

function queenCoronet(): THREE.BufferGeometry[] {
  const balls: THREE.BufferGeometry[] = []
  const count = 9
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    balls.push(sphere(0.021, 0.158 * Math.sin(a), 0.846, 0.158 * Math.cos(a)))
  }
  return balls
}

function kingCross(): THREE.BufferGeometry[] {
  const upright = new RoundedBoxGeometry(0.05, 0.125, 0.05, 3, 0.012)
  upright.translate(0, 0.9875, 0)
  const bar = new RoundedBoxGeometry(0.125, 0.045, 0.05, 3, 0.012)
  bar.translate(0, 1.0, 0)
  return [upright, bar]
}

// Knight head, drawn facing +x in its own units, then scaled onto the plinth.
function horseShape(): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(-0.17, 0)
  s.lineTo(0.17, 0)
  s.bezierCurveTo(0.2, 0.07, 0.17, 0.17, 0.1, 0.22) // chest into throat
  s.bezierCurveTo(0.06, 0.26, 0.1, 0.3, 0.2, 0.33) // jaw line
  s.bezierCurveTo(0.25, 0.34, 0.275, 0.36, 0.265, 0.4) // lower lip and muzzle
  s.bezierCurveTo(0.26, 0.44, 0.24, 0.46, 0.2, 0.47) // nose
  s.bezierCurveTo(0.14, 0.5, 0.07, 0.54, 0.035, 0.575) // face to forehead
  s.bezierCurveTo(0.045, 0.61, 0.035, 0.65, 0.012, 0.675) // ear front
  s.bezierCurveTo(-0.01, 0.65, -0.03, 0.61, -0.04, 0.57) // ear back
  for (const c of maneCurves()) s.bezierCurveTo(c.v1.x, c.v1.y, c.v2.x, c.v2.y, c.v3.x, c.v3.y)
  return s
}

function maneCurves(): THREE.CubicBezierCurve[] {
  const v = (x: number, y: number) => new THREE.Vector2(x, y)
  return [
    new THREE.CubicBezierCurve(v(-0.04, 0.57), v(-0.1, 0.54), v(-0.15, 0.47), v(-0.14, 0.38)),
    new THREE.CubicBezierCurve(v(-0.14, 0.38), v(-0.13, 0.25), v(-0.2, 0.12), v(-0.17, 0)),
  ]
}

/** A scalloped crest following the back of the neck: reads as carved mane locks. */
function maneShape(): THREE.Shape {
  const path = new THREE.CurvePath<THREE.Vector2>()
  for (const c of maneCurves()) path.add(c)
  const outer: THREE.Vector2[] = []
  const inner: THREE.Vector2[] = []
  const n = 48
  for (let i = 0; i <= n; i++) {
    const t = 0.03 + (0.8 * i) / n
    const p = path.getPointAt(t)
    const tan = path.getTangentAt(t)
    const out = new THREE.Vector2(tan.y, -tan.x)
    const lock = Math.abs(Math.sin(i * (Math.PI / 6)))
    outer.push(p.clone().addScaledVector(out, 0.008 + 0.012 * lock))
    inner.push(p.clone().addScaledVector(out, -0.045))
  }
  return new THREE.Shape([...outer, ...inner.reverse()])
}

function extrudeCentered(shape: THREE.Shape, depth: number, bevel: number, segments: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.85,
    bevelSegments: segments,
    curveSegments: 28,
  })
  g.translate(0, 0, -depth / 2)
  return g
}

/** Smooth-shaded: weld, then let three average normals across bevel facets. */
function smooth(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const plain = new THREE.BufferGeometry()
  plain.setAttribute('position', g.getAttribute('position'))
  const welded = mergeVertices(plain, 1e-5)
  welded.computeVertexNormals()
  return welded
}

function knightHead(): THREE.BufferGeometry {
  const depth = 0.1
  const bevel = 0.035
  const head = smooth(extrudeCentered(horseShape(), depth, bevel, 5))
  const mane = smooth(extrudeCentered(maneShape(), 0.07, 0.012, 3))
  const eyeZ = depth / 2 + bevel - 0.008
  const parts = merge([head, mane, sphere(0.017, 0.105, 0.49, eyeZ), sphere(0.017, 0.105, 0.49, -eyeZ)])

  // Sculptural taper: slimmer through the face, fuller at the neck.
  parts.computeBoundingBox()
  const box = parts.boundingBox!
  const pos = parts.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getX(i) - box.min.x) / (box.max.x - box.min.x)
    const u = (pos.getY(i) - box.min.y) / (box.max.y - box.min.y)
    pos.setZ(i, pos.getZ(i) * (1.15 - 0.3 * u * t - 0.15 * u))
  }
  parts.computeVertexNormals()

  const plinthTop = 0.14
  const scale = (PIECE_HEIGHT.n - plinthTop) / (box.max.y - box.min.y)
  parts.translate(-(box.min.x + box.max.x) / 2 - 0.02, -box.min.y, 0)
  parts.scale(scale, scale, scale)
  parts.translate(0, plinthTop, 0)
  return parts
}

function build(type: PieceSymbol): PieceGeometry {
  switch (type) {
    case 'p':
      return { geometry: assemble([lathe(PROFILES.p)], type, []), accent: null }
    case 'r':
      return { geometry: assemble([lathe(PROFILES.r), ...rookCrenels()], type, []), accent: null }
    case 'b':
      return { geometry: assemble([lathe(PROFILES.b)], type, [bishopSlit()]), accent: 'slit' }
    case 'q':
      return {
        geometry: assemble([lathe(PROFILES.q), ...queenCoronet()], type, [collar(0.58, 0.112, 0.024)]),
        accent: 'brass',
      }
    case 'k':
      return {
        geometry: assemble([lathe(PROFILES.k), ...kingCross()], type, [collar(0.62, 0.118, 0.026)]),
        accent: 'brass',
      }
    case 'n': {
      const head = knightHead()
      // Faces the opponent's side, turned 60 degrees so its profile reads from the player's seat.
      head.rotateY((5 * Math.PI) / 6)
      return { geometry: assemble([lathe(KNIGHT_PLINTH), head], type, []), accent: null }
    }
  }
}

export type AccentSlot = 'body' | 'brass' | 'slit'

export interface AccentGeometry {
  /** Centred on its own bounding box so it can scale in place; place the mesh at `center`. */
  readonly geometry: THREE.BufferGeometry
  /** Material role per geometry group. */
  readonly slots: readonly AccentSlot[]
  readonly center: THREE.Vector3
}

function buildAccent(type: 'q' | 'r' | 'b'): AccentGeometry {
  const groups: [AccentSlot, THREE.BufferGeometry[]][] =
    type === 'r'
      ? [['body', rookCrenels()]]
      : type === 'q'
        ? [['body', queenCoronet()], ['brass', [collar(0.58, 0.112, 0.024)]]]
        : [['slit', [bishopSlit()]]]
  const geometry = merge(groups.map(([, parts]) => merge(parts)), true)
  geometry.computeBoundingBox()
  const center = geometry.boundingBox!.getCenter(new THREE.Vector3())
  geometry.translate(-center.x, -center.y, -center.z)
  return { geometry, slots: groups.map(([slot]) => slot), center }
}

const accentCache = new Map<'q' | 'r' | 'b', AccentGeometry>()

/** The detail parts a promotion scales in once the body morph has finished. */
export function accentGeometry(type: 'q' | 'r' | 'b'): AccentGeometry {
  let g = accentCache.get(type)
  if (!g) {
    g = buildAccent(type)
    accentCache.set(type, g)
  }
  return g
}

const cache = new Map<PieceSymbol, PieceGeometry>()

/** Built once per type on first use and shared by every instance. */
export function pieceGeometry(type: PieceSymbol): PieceGeometry {
  let g = cache.get(type)
  if (!g) {
    g = build(type)
    g.geometry.computeBoundingSphere()
    cache.set(type, g)
  }
  return g
}
