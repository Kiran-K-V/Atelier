import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useSettings } from '../../store/settings'
import { noRaycast } from '../board/Highlights'
import { mulberry32 } from '../materials/marble'
import { particleScale } from './shaders'

/** Same layer as FxLayer's effects: the main camera sees it, shadows and the pointer raycaster do not. */
const FX_LAYER = 1
const FLAKES = 160
const SPREAD = 5.5
const HEIGHT = 6.5
/** One snowfall at a time, so its clock can live at module level. */
const time = { value: 0 }

const VERT = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    // aSeed.z: fall speed, aSeed.w: phase and size.
    float y = mod(position.y - uTime * aSeed.z, ${HEIGHT.toFixed(1)});
    vec3 p = vec3(
      position.x + sin(uTime * 0.35 + aSeed.w * 6.2831) * 0.35,
      y + 0.15,
      position.z + cos(uTime * 0.27 + aSeed.w * 4.0) * 0.3
    );
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = 0.03 + 0.03 * fract(aSeed.w * 13.7);
    gl_PointSize = min(size * uScale / -mv.z, 9.0);
    // Fade in at the top, out just above the board, and keep flakes off the near lens.
    vAlpha = smoothstep(0.0, 0.8, y) * smoothstep(${HEIGHT.toFixed(1)}, ${(HEIGHT - 1.5).toFixed(1)}, y) * smoothstep(2.5, 6.0, -mv.z);
  }
`

const FRAG = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vec3(0.93, 0.98, 1.0), a);
    #include <colorspace_fragment>
  }
`

/** Sparse, slow flakes drifting over the glacier board. Purely decorative: off under reduced motion. */
export function Snowfall({ density }: { density: number }) {
  const reduced = useSettings((s) => s.reducedMotion)
  const count = Math.round(FLAKES * density)
  const points = useMemo(() => {
    const rand = mulberry32(99)
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() * 2 - 1) * SPREAD
      pos[i * 3 + 1] = rand() * HEIGHT
      pos[i * 3 + 2] = (rand() * 2 - 1) * SPREAD
      seed[i * 4 + 2] = 0.12 + rand() * 0.16
      seed[i * 4 + 3] = rand()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, HEIGHT / 2, 0), SPREAD * 1.6)
    const m = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uTime: time, uScale: particleScale, uOpacity: { value: 0.4 } },
      transparent: true,
      depthWrite: false,
    })
    const p = new THREE.Points(g, m)
    p.layers.set(FX_LAYER)
    p.raycast = noRaycast
    p.renderOrder = 3
    return p
  }, [count])

  useEffect(
    () => () => {
      points.geometry.dispose()
      ;(points.material as THREE.Material).dispose()
    },
    [points],
  )

  useFrame((_, dt) => {
    time.value += Math.min(dt, 0.1)
  })

  if (reduced) return null
  return <primitive object={points} />
}
