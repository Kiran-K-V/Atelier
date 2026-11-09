import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { ALL_SQUARES, isLightSquare, squareToPosition } from '../coords'
import { materials } from '../materials'

/** The effects layer: the main camera sees it; contact shadows, the pointer and the mirror camera do not. */
const FX_LAYER = 1

/**
 * Mirror image of the pieces and frame in the glossy glass squares. One planar reflection
 * (the scene rendered once more from below the board) is added on top of the squares:
 * strong on the dark glass, faint on the frosted snow. Additive, so the squares stay as they are
 * and only gain reflected light, like real polished glass.
 */
const SHADER = {
  name: 'GlassReflection',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    tMask: { value: null },
    uStrength: { value: 0.55 },
    uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vProj;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vProj = textureMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tMask;
    uniform float uStrength;
    uniform vec2 uTexel;
    varying vec4 vProj;
    varying vec2 vUv;
    void main() {
      vec2 p = vProj.xy / vProj.w;
      // A light 5-tap blur: polished, not a perfect mirror.
      vec3 r = texture2D(tDiffuse, p).rgb * 0.4;
      r += texture2D(tDiffuse, p + vec2(uTexel.x, uTexel.y) * 1.5).rgb * 0.15;
      r += texture2D(tDiffuse, p + vec2(-uTexel.x, uTexel.y) * 1.5).rgb * 0.15;
      r += texture2D(tDiffuse, p + vec2(uTexel.x, -uTexel.y) * 1.5).rgb * 0.15;
      r += texture2D(tDiffuse, p + vec2(-uTexel.x, -uTexel.y) * 1.5).rgb * 0.15;
      float mask = texture2D(tMask, vUv).g;
      gl_FragColor = vec4(r * uStrength * mask, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
}

/** 8x8 mask over the board: 1 on dark squares, low on light ones (frosted snow barely mirrors). */
function maskTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 8
  const ctx = canvas.getContext('2d')
  if (ctx) {
    for (const sq of ALL_SQUARES) {
      const [x, , z] = squareToPosition(sq)
      const v = isLightSquare(sq) ? 22 : 255
      ctx.fillStyle = `rgb(${v},${v},${v})`
      // Plane v runs from z = +4 (v = 0) to z = -4; canvas rows run top (v = 1) down.
      ctx.fillRect(Math.floor(x + 4), Math.floor(4 + z), 1, 1)
    }
  }
  const t = new THREE.CanvasTexture(canvas)
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestFilter
  t.generateMipmaps = false
  return t
}

/**
 * The mirror pass re-renders the scene, so it refreshes every `interval` frames (the board is
 * mostly still; a frame of lag in a soft reflection is not visible), and it draws the glass
 * without transmission: a refraction inside a blurred reflection is invisible, but its extra
 * scene pass would double the mirror's cost.
 */
export function GlassReflection({ resolution, interval }: { resolution: number; interval: number }) {
  const reflector = useMemo(() => {
    const r = new Reflector(new THREE.PlaneGeometry(8, 8), {
      textureWidth: resolution,
      textureHeight: resolution,
      shader: SHADER,
      multisample: 0,
    })
    const m = r.material as THREE.ShaderMaterial
    m.uniforms.tMask.value = maskTexture()
    m.uniforms.uTexel.value.set(1 / resolution, 1 / resolution)
    m.transparent = true
    m.blending = THREE.AdditiveBlending
    m.depthWrite = false
    r.rotation.x = -Math.PI / 2
    r.position.y = 0.0008
    r.renderOrder = 1
    r.layers.set(FX_LAYER)
    r.raycast = () => undefined
    const mirror = r.onBeforeRender.bind(r)
    const m3 = materials()
    const glass = [m3.pieceLight, m3.pieceDark, m3.frame]
    const saved = glass.map(() => 0)
    let frame = 0
    r.onBeforeRender = (...args) => {
      if (frame++ % interval !== 0) return
      glass.forEach((g, i) => {
        saved[i] = g.transmission
        g.transmission = 0
      })
      mirror(...args)
      glass.forEach((g, i) => {
        g.transmission = saved[i]
      })
    }
    return r
  }, [resolution, interval])

  useEffect(
    () => () => {
      ;(reflector.material as THREE.ShaderMaterial).uniforms.tMask.value.dispose()
      reflector.dispose()
    },
    [reflector],
  )

  return <primitive object={reflector} />
}
