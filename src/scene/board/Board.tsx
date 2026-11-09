import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useGame } from '../../store/game'
import { useSettings } from '../../store/settings'
import { fxBus } from '../choreo/bus'
import { ALL_SQUARES, isLightSquare, positionToSquare, squareToPosition } from '../coords'
import { hover } from '../interaction/state'
import { useLook } from '../look'
import { linkMaterial, materials, TRAY_DEPTH } from '../materials'
import { mulberry32 } from '../materials/marble'
import { RIPPLE } from './ripple'
import { TrappedIce } from './TrappedIce'
import { rippleUniforms, withRipple } from './rippleMaterial'

export const FRAME_TOP = 0.07
const FRAME_OUTER = 4.8
const FRAME_INNER = 4.07
const FRAME_DEPTH = 0.36
const FRAME_BEVEL = 0.03
const INLAY = [4.17, 4.2] as const
const LABEL_BAND = [4.22, 4.75] as const
export const TABLE_Y = FRAME_TOP - FRAME_DEPTH - 2 * FRAME_BEVEL
const SLAB = 0.04
/** Glacier light squares: a thin frosted slab over a dark core, so its bright side wall stays a hairline. */
const FROST = 0.012
/** Glacier floor: far larger than the view, so its edge never shows; fog finishes the fade. */
const FLOOR_SIZE = 240

/**
 * Each square samples its own rotated window of its texture, so no two squares repeat. Tiles are
 * slabs whose top face sits at `top` (y = 0 for the playing surface).
 */
function squaresGeometry(light: boolean, height = SLAB, top = 0): THREE.BufferGeometry {
  const rand = mulberry32(light ? 7 : 13)
  const parts = ALL_SQUARES.filter((sq) => isLightSquare(sq) === light).map((sq) => {
    const g = new THREE.BoxGeometry(0.994, height, 0.994)
    const [x, , z] = squareToPosition(sq)
    g.translate(x, top - height / 2, z)
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
  let built: Record<
    'light' | 'dark' | 'frost' | 'lightCore' | 'darkBlock' | 'frame' | 'underGlow' | 'inlay' | 'labels',
    THREE.BufferGeometry
  > | null = null
  return () =>
    (built ??= {
      light: squaresGeometry(true),
      dark: squaresGeometry(false),
      frost: squaresGeometry(true, FROST),
      lightCore: squaresGeometry(true, TRAY_DEPTH - FROST, -FROST),
      underGlow: flat(new THREE.ShapeGeometry(ring(FRAME_OUTER - 0.15, FRAME_INNER + 0.05)), TABLE_Y + 0.005),
      darkBlock: squaresGeometry(false, TRAY_DEPTH),
      frame: frameGeometry(),
      inlay: flat(new THREE.ShapeGeometry(ring(INLAY[1], INLAY[0])), FRAME_TOP + 0.0015),
      labels: labelGeometry(),
    })
})()

const rippleMaterials = (() => {
  let built: { light: THREE.MeshPhysicalMaterial; dark: THREE.MeshPhysicalMaterial; core: THREE.MeshPhysicalMaterial } | null = null
  return () =>
    (built ??= {
      light: linkMaterial('squareLight', withRipple(materials().squareLight)),
      dark: linkMaterial('squareDark', withRipple(materials().squareDark)),
      // Glacier: the body under each frosted slab. Dark deep teal, so through the neighbouring
      // glass you see depth, not a bright wall. Ripples with the slab above it.
      core: withRipple(new THREE.MeshPhysicalMaterial({ color: '#06161f', roughness: 0.6 })),
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

/**
 * Glacier floor: a faint deep-teal pool of light under the board that falls off to exactly the
 * room colour (sRGB texture, unlit), so it never shows an edge or a step against the background.
 */
function useFloorGlow(room: string): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const SIZE = 512
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const h = SIZE / 2
      const grad = ctx.createRadialGradient(h, h, 0, h, h, h)
      // Board half-width is ~5 units of a FLOOR_SIZE plane: the pool spans a few board widths.
      const k = 10 / FLOOR_SIZE
      grad.addColorStop(0, '#0d2a3a')
      grad.addColorStop(k * 0.6, '#0a2030')
      grad.addColorStop(k * 1.6, room)
      grad.addColorStop(1, room)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, SIZE, SIZE)
    }
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [room])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function onSquareMove(e: ThreeEvent<PointerEvent>) {
  hover(positionToSquare(e.point.x, e.point.z))
}

function onSquareClick(e: ThreeEvent<MouseEvent>) {
  if (e.delta > 4) return
  const sq = positionToSquare(e.point.x, e.point.z)
  if (sq) useGame.getState().clickSquare(sq)
}

export function Board({ room, dark }: { room: string; dark: boolean }) {
  const m = materials()
  const g = geometries()
  const squares = rippleMaterials()
  const labels = useLabelTexture()
  const look = useLook()
  const set = useSettings((s) => s.boardSet)
  const floorGlow = useFloorGlow(room)
  const tray = set === 'glacier'
  const navyFloor = set === 'glacier' && dark
  useBoardRipple()

  return (
    <group>
      <mesh geometry={tray ? g.frost : g.light} material={squares.light} receiveShadow />
      {tray && <mesh geometry={g.lightCore} material={squares.core} />}
      <mesh geometry={tray ? g.darkBlock : g.dark} material={squares.dark} receiveShadow />
      {tray ? (
        <>
          {/* Tray floor under the blocks: what the glass tiles look down onto. */}
          <mesh position={[0, -TRAY_DEPTH + 0.002, 0]} rotation-x={-Math.PI / 2} raycast={() => undefined}>
            <planeGeometry args={[8.14, 8.14]} />
            <meshBasicMaterial color="#2a4d5e" />
          </mesh>
          <TrappedIce />
        </>
      ) : (
        // Grout bed: shows as fine dark seams between squares.
        <mesh position={[0, -0.03, 0]} material={m.frame}>
          <boxGeometry args={[8.1, 0.05, 8.1]} />
        </mesh>
      )}
      <mesh geometry={g.frame} material={m.frame} castShadow receiveShadow />
      {tray && (
        // Faint teal light under the glass frame, so its thickness reads instead of going black.
        <mesh geometry={g.underGlow} raycast={() => undefined}>
          <meshBasicMaterial color="#14506b" />
        </mesh>
      )}
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
        <planeGeometry args={navyFloor ? [FLOOR_SIZE, FLOOR_SIZE] : [80, 80]} />
        {navyFloor ? (
          // Unlit: a lit dielectric floor picks up the bright studio env as a grey sheen.
          <meshBasicMaterial map={floorGlow} />
        ) : (
          <meshStandardMaterial color={room} roughness={0.92} />
        )}
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
