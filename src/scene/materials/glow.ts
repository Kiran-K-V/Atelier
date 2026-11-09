import * as THREE from 'three'

export type GlowShape = 'disc' | 'ring' | 'frame' | 'blob'

const SIZE = 256

function draw(shape: GlowShape, ctx: CanvasRenderingContext2D): void {
  const c = SIZE / 2
  if (shape === 'frame') {
    ctx.strokeStyle = '#fff'
    ctx.shadowColor = '#fff'
    ctx.shadowBlur = 22
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.roundRect(22, 22, SIZE - 44, SIZE - 44, 14)
    ctx.stroke()
    ctx.stroke()
    return
  }
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  const stops: Record<Exclude<GlowShape, 'frame'>, [number, string][]> = {
    disc: [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.9)'], [0.75, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']],
    ring: [[0, 'rgba(255,255,255,0)'], [0.66, 'rgba(255,255,255,0)'], [0.8, 'rgba(255,255,255,1)'], [0.9, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']],
    blob: [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']],
  }
  for (const [o, col] of stops[shape]) g.addColorStop(o, col)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, SIZE, SIZE)
}

const cache = new Map<GlowShape, THREE.CanvasTexture>()

/** White alpha masks for highlights; color comes from the material. */
export function glowTexture(shape: GlowShape): THREE.CanvasTexture {
  let t = cache.get(shape)
  if (!t) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas unavailable')
    draw(shape, ctx)
    t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    cache.set(shape, t)
  }
  return t
}
