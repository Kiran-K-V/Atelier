import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useGame } from '../../store/game'
import { useSettings } from '../../store/settings'
import { fxBus } from '../choreo/bus'
import { ALL_SQUARES, isLightSquare, positionToSquare, squareToPosition } from '../coords'
import { hover } from '../interaction/state'
import { useLook } from '../look'
import { linkMaterial, materials } from '../materials'
import { withDepth } from '../materials/depth'
import { mulberry32 } from '../materials/marble'
import { RIPPLE } from './ripple'
import { rippleUniforms, withRipple } from './rippleMaterial'

export const FRAME_TOP = 0.07
const FRAME_OUTER = 4.8
const FRAME_INNER = 4.07
const FRAME_DEPTH = 0.36
const FRAME_BEVEL = 0.03
const INLAY = [4.17, 4.2] as const
const LABEL_BAND = [4.22, 4.75] as const
export const TABLE_Y = FRAME_TOP - FRAME_DEPTH - 2 * FRAME_BEVEL

/** Each square samples its own rotated window of the marble, so no two squares repeat. */
function squaresGeometry(light: boolean): THREE.BufferGeometry {
  const rand = mulberry32(light ? 7 : 13)
  const parts = ALL_SQUARES.filter((sq) => isLightSquare(sq) === light).map((sq) => {
    const g = new THREE.BoxGeometry(0.994, 0.04, 0.994)
    const [x, , z] = squareToPosition(sq)
    g.translate(x, -0.02, z)
    const center = new Float32Array(g.getAttribute('position').count * 2)
    for (let i = 0; i < center.length; i += 2) {
      center[i] = x
      center[i + 1] = z
    }
    g.setAttribute('aCenter', new THREE.BufferAttribute(center, 2))
    const uv = g.getAttribute('uv')
    const size = 0.24 + rand() * 0.08
    const u0 = rand() * (1 - size)
    const v0 = rand() * (1 - size)
    const turns = Math.floor(rand() * 4)
    for (let i = 0; i < uv.count; i++) {
      let u = uv.getX(i)
      let v = uv.getY(i)
      for (let t = 0; t < turns; t++) [u, v] = [1 - v, u]
      uv.setXY(i, u0 + u * size, v0 + v * size)
    }
    return g
  })
  const merged = mergeGeometries(parts)
  if (!merged) throw new Error('square merge failed')
  return merged
}

function squarePath<T extends THREE.Path>(path: T, half: number, r: number): T {
  path.moveTo(-half + r, -half)
  path.lineTo(half - r, -half)
  path.quadraticCurveTo(half, -half, half, -half + r)
  path.lineTo(half, half - r)
  path.quadraticCurveTo(half, half, half - r, half)
  path.lineTo(-half + r, half)
  path.quadraticCurveTo(-half, half, -half, half - r)
  path.lineTo(-half, -half + r)
  path.quadraticCurveTo(-half, -half, -half + r, -half)
  return path
}

function ring(outer: number, inner: number, r = 0.02): THREE.Shape {
  const s = squarePath(new THREE.Shape(), outer, r)
  s.holes.push(squarePath(new THREE.Path(), inner, r))
  return s
}

/** Shape coordinates (x, y) map to world (x, -z); lay flat at height y. */
function flat(g: THREE.BufferGeometry, y: number): THREE.BufferGeometry {
  g.rotateX(-Math.PI / 2)
  g.translate(0, y, 0)
  return g
}

function frameGeometry(): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(ring(FRAME_OUTER, FRAME_INNER, 0.14), {
    depth: FRAME_DEPTH,
    bevelEnabled: true,
    bevelThickness: FRAME_BEVEL,
    bevelSize: FRAME_BEVEL,
    bevelSegments: 4,
    curveSegments: 8,
  })
  return flat(g, FRAME_TOP - FRAME_DEPTH - FRAME_BEVEL)
}

const ICE_BEVEL = 0.07

/** Smooth closed noise along the frame's perimeter: a few sines with seeded phases. */
function swell(t: number, phases: readonly number[]): number {
  let v = 0
  phases.forEach((p, i) => {
    const f = [5, 11, 23, 37][i]
    v += Math.sin(t * Math.PI * 2 * f + p) / (i + 1.4)
  })
  return v
}

/**
 * Glacier frame: the same ring, but the outer edge is molten ice. Its outline bulges in and out,
 * its top swells near the edge, and normals are smoothed so the ripples catch highlights.
 */
function iceFrameGeometry(): THREE.BufferGeometry {
  const rand = mulberry32(31)
  const phases = [0, 0, 0, 0].map(() => rand() * Math.PI * 2)
  const lift = [0, 0, 0, 0].map(() => rand() * Math.PI * 2)
  const base = squarePath(new THREE.Path(), FRAME_OUTER - 0.06, 0.3).getSpacedPoints(720)
  base.pop()
  const outline = base.map((p, i) => {
    const t = i / base.length
    const len = Math.hypot(p.x, p.y)
    const k = 1 + (0.035 * swell(t, phases)) / len
    return new THREE.Vector2(p.x * k, p.y * k)
  })
  const shape = new THREE.Shape(outline)
  shape.holes.push(squarePath(new THREE.Path(), FRAME_INNER, 0.14))
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: FRAME_DEPTH,
    bevelEnabled: true,
    bevelThickness: ICE_BEVEL,
    bevelSize: ICE_BEVEL,
    bevelSegments: 6,
    curveSegments: 8,
  })
  g.deleteAttribute('normal')
  g.deleteAttribute('uv')
  const welded = mergeVertices(g, 1e-4)
  flat(welded, FRAME_TOP - FRAME_DEPTH - ICE_BEVEL)
  // Swell the top toward the outer edge, never over the label band.
  const pos = welded.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const y = pos.getY(i)
    const edge = THREE.MathUtils.smoothstep(Math.max(Math.abs(x), Math.abs(z)), LABEL_BAND[1], FRAME_OUTER + 0.05)
    const up = THREE.MathUtils.smoothstep(y, TABLE_Y, FRAME_TOP)
    const t = (Math.atan2(z, x) / (Math.PI * 2) + 1) % 1
    pos.setY(i, y + edge * up * 0.03 * (1 + swell(t, lift)))
  }
  welded.computeVertexNormals()
  return welded
}

function labelGeometry(): THREE.BufferGeometry {
  const g = new THREE.ShapeGeometry(ring(LABEL_BAND[1], LABEL_BAND[0]))
  const pos = g.getAttribute('position')
  const uv = g.getAttribute('uv')
  const span = FRAME_OUTER * 2
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / span + 0.5, pos.getY(i) / span + 0.5)
  return flat(g, FRAME_TOP + 0.002)
}

const LABEL_PX = 2048
const LABEL_FONT = "600 44px 'Fraunces Variable', Georgia, serif"

/** Engraved coordinates, readable from both sides of the board. */
function drawLabels(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const span = FRAME_OUTER * 2
  const toPx = (x: number, z: number) => [(x / span + 0.5) * LABEL_PX, (z / span + 0.5) * LABEL_PX] as const
  const mid = (LABEL_BAND[0] + LABEL_BAND[1]) / 2
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, LABEL_PX, LABEL_PX)
  ctx.fillStyle = '#fff'
  ctx.font = LABEL_FONT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const put = (text: string, x: number, z: number, flip: boolean) => {
    const [px, py] = toPx(x, z)
    ctx.save()
    ctx.translate(px, py)
    if (flip) ctx.rotate(Math.PI)
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }
  for (let i = 0; i < 8; i++) {
    const file = 'abcdefgh'[i]
    const rank = String(i + 1)
    put(file, i - 3.5, mid, false)
    put(file, i - 3.5, -mid, true)
    put(rank, -mid, 3.5 - i, false)
    put(rank, mid, 3.5 - i, true)
  }
}

function useLabelTexture(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = LABEL_PX
    drawLabels(canvas)
    const t = new THREE.CanvasTexture(canvas)
    t.anisotropy = 8
    return t
  }, [])
  useEffect(() => {
    let live = true
    document.fonts.load(LABEL_FONT).then(() => {
      if (!live) return
      drawLabels(texture.image as HTMLCanvasElement)
      texture.needsUpdate = true
    }, () => undefined)
    return () => {
      live = false
      texture.dispose()
    }
  }, [texture])
  return texture
}

const geometries = (() => {
  let built: Record<'light' | 'dark' | 'frame' | 'iceFrame' | 'inlay' | 'labels', THREE.BufferGeometry> | null = null
  return () =>
    (built ??= {
      light: squaresGeometry(true),
      dark: squaresGeometry(false),
      frame: frameGeometry(),
      iceFrame: iceFrameGeometry(),
      inlay: flat(new THREE.ShapeGeometry(ring(INLAY[1], INLAY[0])), FRAME_TOP + 0.0015),
      labels: labelGeometry(),
    })
})()

const rippleMaterials = (() => {
  let built: { light: THREE.MeshPhysicalMaterial; dark: THREE.MeshPhysicalMaterial } | null = null
  return () =>
    (built ??= {
      light: linkMaterial('squareLight', withRipple(materials().squareLight)),
      dark: linkMaterial('squareDark', withDepth(withRipple(materials().squareDark))),
    })
})()

/** Knight landings send a wave through the tiles; slots are reused round-robin. */
function useBoardRipple(): void {
  const clock = useThree((s) => s.clock)
  useEffect(() => {
    let next = 0
    return fxBus.on((e) => {
      if (e.type !== 'ripple' || useSettings.getState().reducedMotion) return
      const [x, , z] = squareToPosition(e.square)
      rippleUniforms.uRipples.value[next].set(x, z, clock.elapsedTime, e.strength)
      next = (next + 1) % RIPPLE.slots
    })
  }, [clock])
  useFrame(({ clock: c }) => {
    rippleUniforms.uRippleTime.value = c.elapsedTime
  })
}

function onSquareMove(e: ThreeEvent<PointerEvent>) {
  hover(positionToSquare(e.point.x, e.point.z))
}

function onSquareClick(e: ThreeEvent<MouseEvent>) {
  if (e.delta > 4) return
  const sq = positionToSquare(e.point.x, e.point.z)
  if (sq) useGame.getState().clickSquare(sq)
}

export function Board({ room }: { room: string }) {
  const m = materials()
  const g = geometries()
  const squares = rippleMaterials()
  const labels = useLabelTexture()
  const look = useLook()
  const set = useSettings((s) => s.boardSet)
  useBoardRipple()

  return (
    <group>
      <mesh geometry={g.light} material={squares.light} receiveShadow />
      <mesh geometry={g.dark} material={squares.dark} receiveShadow />
      {/* Grout bed: shows as fine dark seams between squares. */}
      <mesh position={[0, -0.03, 0]} material={m.frame}>
        <boxGeometry args={[8.1, 0.05, 8.1]} />
      </mesh>
      <mesh geometry={set === 'glacier' ? g.iceFrame : g.frame} material={m.frame} castShadow receiveShadow />
      <mesh geometry={g.inlay} material={m.brass} receiveShadow />
      <mesh geometry={g.labels} renderOrder={1}>
        <meshStandardMaterial
          color={look.brass}
          metalness={0.85}
          roughness={0.38}
          alphaMap={labels}
          transparent
          opacity={0.75}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, TABLE_Y, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={room} roughness={0.92} />
      </mesh>
      {/* Pointer target for squares: invisible, but still raycast. */}
      <mesh
        position={[0, 0.001, 0]}
        rotation-x={-Math.PI / 2}
        visible={false}
        onPointerMove={onSquareMove}
        onPointerOut={() => hover(null)}
        onClick={onSquareClick}
      >
        <planeGeometry args={[8, 8]} />
      </mesh>
    </group>
  )
}
