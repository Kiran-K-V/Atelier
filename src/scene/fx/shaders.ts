import * as THREE from 'three'

/**
 * Effect materials. Each live effect clones one of these prototypes (same program, own uniforms)
 * when it mounts and disposes the clone when it ends; nothing is created per frame.
 * Colors are HDR (multiplied past 1) only where the effect should bloom.
 */

const OUTPUT = /* glsl */ `
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
`

function material(vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>, additive: boolean) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  })
}

/** Clone with fresh uniform objects; three's clone deep-copies uniforms. */
function cloneOf<T extends THREE.ShaderMaterial>(proto: T): T {
  return proto.clone() as T
}

/* Flat disc/ring decal on a unit plane laid on the board. World radius = uv distance * uHalf. */
const RING_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const RING_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uRadius;
  uniform float uWidth;
  uniform float uFill;
  uniform float uHalf;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0 * uHalf;
    float band = exp(-pow((r - uRadius) / uWidth, 2.0));
    float inside = uFill * (1.0 - smoothstep(uRadius - uWidth, uRadius + uWidth, r));
    float a = max(band, inside) * uOpacity * (1.0 - smoothstep(uHalf * 0.9, uHalf, r));
    vec3 col = uColor;
    ${OUTPUT}
  }
`

export interface RingOptions {
  readonly additive: boolean
}

const ringProtos = new Map<boolean, THREE.ShaderMaterial>()

export function ringMaterial({ additive }: RingOptions): THREE.ShaderMaterial {
  let proto = ringProtos.get(additive)
  if (!proto) {
    proto = material(
      RING_VERT,
      RING_FRAG,
      {
        uColor: { value: new THREE.Color() },
        uOpacity: { value: 0 },
        uRadius: { value: 0 },
        uWidth: { value: 0.1 },
        uFill: { value: 0 },
        uHalf: { value: 1 },
      },
      additive,
    )
    ringProtos.set(additive, proto)
  }
  return cloneOf(proto)
}

/*
 * Light strip along a path: uv.x runs 0..1 along it, uv.y -1..1 across. The strip draws itself up to
 * uHead, glows hottest at the head, and can carry a comet tail, a travelling dash and a sinuous wave.
 * uBack (default -1, off) hides everything before it, so a strip can also reveal outward from a midpoint.
 */
const STRIP_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const STRIP_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHeadColor;
  uniform float uOpacity;
  uniform float uHead;
  uniform float uBack;
  uniform float uTail;
  uniform float uLength;
  uniform float uCore;
  uniform float uHalo;
  uniform float uTime;
  uniform float uFlow;
  uniform float uDash;
  uniform float uWave;
  varying vec2 vUv;
  void main() {
    float u = vUv.x;
    float across = vUv.y - uWave * sin(u * uLength * 7.0 - uTime * 9.0) * sin(3.14159 * u);
    float drawn = (1.0 - smoothstep(uHead - 0.004, uHead + 0.004, u)) * smoothstep(uBack - 0.004, uBack + 0.004, u);
    float tail = uTail > 0.0 ? smoothstep(uHead - uTail, uHead, u) : 1.0;
    float ends = smoothstep(0.0, 0.04, u) * (1.0 - smoothstep(0.96, 1.0, u));
    float core = exp(-pow(across / uCore, 2.0));
    float halo = uHalo * exp(-pow(across / 0.55, 2.0));
    float head = exp(-pow((u - uHead) * uLength / 0.22, 2.0)) * step(u, uHead + 0.01);
    head = max(head, exp(-pow((u - uBack) * uLength / 0.22, 2.0)) * step(uBack - 0.01, u) * step(0.0, uBack));
    float dash = uFlow > 0.0 ? 0.7 + 0.3 * sin((u * uLength * uDash - uTime * uFlow) * 6.28318) : 1.0;
    float a = clamp((core + halo) * drawn * tail * ends * dash * uOpacity * (1.0 + head), 0.0, 1.0);
    vec3 col = mix(uColor, uHeadColor, clamp(head + core * 0.35, 0.0, 1.0)) * (1.0 + 0.8 * head);
    ${OUTPUT}
  }
`

let stripProto: THREE.ShaderMaterial | null = null

export function stripMaterial(): THREE.ShaderMaterial {
  stripProto ??= material(
    STRIP_VERT,
    STRIP_FRAG,
    {
      uColor: { value: new THREE.Color() },
      uHeadColor: { value: new THREE.Color() },
      uOpacity: { value: 1 },
      uHead: { value: 0 },
      uBack: { value: -1 },
      uTail: { value: 0 },
      uLength: { value: 1 },
      uCore: { value: 0.3 },
      uHalo: { value: 0.3 },
      uTime: { value: 0 },
      uFlow: { value: 0 },
      uDash: { value: 2 },
      uWave: { value: 0 },
    },
    true,
  )
  stripProto.side = THREE.DoubleSide
  return cloneOf(stripProto)
}

/*
 * Chain of rounded links along a strip (pin). Links alternate: one seen flat (an oval outline), the
 * next edge-on (a bar through the ovals' ends). A hot glint travels along the chain when uShimmer is 1.
 * uLinkLen and uHalfW are world units, so links keep their shape on any length.
 */
const CHAIN_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHotColor;
  uniform float uOpacity;
  uniform float uHead;
  uniform float uLength;
  uniform float uLinkLen;
  uniform float uHalfW;
  uniform float uTime;
  uniform float uShimmer;
  varying vec2 vUv;
  void main() {
    float u = vUv.x;
    float drawn = 1.0 - smoothstep(uHead - 0.004, uHead + 0.004, u);
    float ends = smoothstep(0.0, 0.03, u) * (1.0 - smoothstep(0.97, 1.0, u));
    float s = u * uLength / uLinkLen;
    float odd = mod(floor(s), 2.0);
    vec2 p = vec2((fract(s) - 0.5) * uLinkLen, vUv.y * uHalfW);
    float w = uHalfW * 0.24;
    float r = uHalfW * 0.55;
    float h = uLinkLen * 0.5 - r * 0.55;
    float oval = abs(length(vec2(max(abs(p.x) - h, 0.0), p.y)) - r);
    float bar = length(vec2(max(abs(p.x) - uLinkLen * 0.5, 0.0), p.y));
    float link = exp(-pow(mix(oval, bar, odd) / w, 2.0));
    float halo = 0.22 * exp(-pow(vUv.y / 0.75, 2.0));
    float glint = uShimmer * pow(0.5 + 0.5 * cos((u * uLength * 0.4 - uTime * 0.55) * 6.28318), 10.0);
    float head = exp(-pow((u - uHead) * uLength / 0.2, 2.0)) * step(u, uHead + 0.01);
    float a = clamp((link * (0.85 + 0.9 * glint) + halo) * drawn * ends * uOpacity * (1.0 + head), 0.0, 1.0);
    vec3 col = mix(uColor, uHotColor, clamp(glint + head + link * 0.15, 0.0, 1.0));
    ${OUTPUT}
  }
`

let chainProto: THREE.ShaderMaterial | null = null

export function chainMaterial(): THREE.ShaderMaterial {
  chainProto ??= material(
    STRIP_VERT,
    CHAIN_FRAG,
    {
      uColor: { value: new THREE.Color() },
      uHotColor: { value: new THREE.Color() },
      uOpacity: { value: 1 },
      uHead: { value: 0 },
      uLength: { value: 1 },
      uLinkLen: { value: 0.16 },
      uHalfW: { value: 0.08 },
      uTime: { value: 0 },
      uShimmer: { value: 1 },
    },
    true,
  )
  chainProto.side = THREE.DoubleSide
  return cloneOf(chainProto)
}

/*
 * Sigil decal on a unit plane: a ring (round, or square when uSquare is 1) cut into uSegments arcs
 * with uGap (0..1 of each arc) left open, rotated by uSpin. Locks, target marks, ghost rings.
 */
const SIGIL_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uRadius;
  uniform float uWidth;
  uniform float uFill;
  uniform float uHalf;
  uniform float uSegments;
  uniform float uGap;
  uniform float uSpin;
  uniform float uSquare;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0 * uHalf;
    float r = mix(length(p), max(abs(p.x), abs(p.y)), uSquare);
    float band = exp(-pow((r - uRadius) / uWidth, 2.0));
    float seg = fract((atan(p.y, p.x) + uSpin) / 6.28318 * max(uSegments, 1.0));
    float keep = 0.5 - uGap * 0.5;
    float cut = 1.0 - smoothstep(keep - 0.02, keep + 0.02, abs(seg - 0.5));
    float mask = mix(1.0, cut, step(0.5, uSegments) * step(0.001, uGap));
    float inside = uFill * (1.0 - smoothstep(uRadius - uWidth, uRadius + uWidth, r));
    float a = max(band * mask, inside) * uOpacity * (1.0 - smoothstep(uHalf * 0.9, uHalf, length(p)));
    vec3 col = uColor;
    ${OUTPUT}
  }
`

let sigilProto: THREE.ShaderMaterial | null = null

export function sigilMaterial(): THREE.ShaderMaterial {
  sigilProto ??= material(
    RING_VERT,
    SIGIL_FRAG,
    {
      uColor: { value: new THREE.Color() },
      uOpacity: { value: 0 },
      uRadius: { value: 0.4 },
      uWidth: { value: 0.03 },
      uFill: { value: 0 },
      uHalf: { value: 0.6 },
      uSegments: { value: 0 },
      uGap: { value: 0 },
      uSpin: { value: 0 },
      uSquare: { value: 0 },
    },
    true,
  )
  return cloneOf(sigilProto)
}

/* Open cylinder (local y in 0..1) glowing at its silhouette and fading upward: light shells and columns. */
const SHELL_VERT = /* glsl */ `
  varying float vY;
  varying float vRim;
  void main() {
    vY = position.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vRim = 1.0 - abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`
const SHELL_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uTopColor;
  uniform float uOpacity;
  uniform float uRise;
  uniform float uRim;
  uniform float uTime;
  varying float vY;
  varying float vRim;
  void main() {
    float y = vY / max(uRise, 1e-3);
    float grad = pow(clamp(1.0 - y, 0.0, 1.0), 1.2) * smoothstep(0.0, 0.08, vY);
    float shimmer = 0.9 + 0.1 * sin(vY * 14.0 - uTime * 6.0);
    float a = grad * mix(1.0, pow(vRim, 1.5) * 1.6 + 0.15, uRim) * shimmer * uOpacity;
    vec3 col = mix(uColor, uTopColor, clamp(y, 0.0, 1.0));
    ${OUTPUT}
  }
`

let shellProto: THREE.ShaderMaterial | null = null

export function shellMaterial(): THREE.ShaderMaterial {
  shellProto ??= material(
    SHELL_VERT,
    SHELL_FRAG,
    {
      uColor: { value: new THREE.Color() },
      uTopColor: { value: new THREE.Color() },
      uOpacity: { value: 0 },
      uRise: { value: 1 },
      uRim: { value: 1 },
      uTime: { value: 0 },
    },
    true,
  )
  shellProto.side = THREE.DoubleSide
  return cloneOf(shellProto)
}

/*
 * Analytic particles: each point's path is a closed-form function of time (velocity with drag,
 * gravity, swirl), so the CPU only advances one uniform per frame.
 * aMeta = (delay, life, size in world units, seed).
 */
const PARTICLE_VERT = /* glsl */ `
  attribute vec3 aVel;
  attribute vec4 aMeta;
  uniform float uTime;
  uniform float uGravity;
  uniform float uDrag;
  uniform float uSwirl;
  uniform float uGrow;
  uniform float uFlicker;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    float t = uTime - aMeta.x;
    float tt = max(t, 0.0);
    float k = clamp(t / aMeta.y, 0.0, 1.0);
    float travel = uDrag > 0.0 ? (1.0 - exp(-uDrag * tt)) / uDrag : tt;
    vec3 p = position + aVel * travel;
    p.y += 0.5 * uGravity * tt * tt;
    float ang = aMeta.w * 6.28318 + tt * uSwirl;
    p.xz += vec2(cos(ang), sin(ang)) * 0.07 * min(tt * 2.0, 1.0) * step(0.001, abs(uSwirl));
    p.y = max(p.y, 0.01);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float alive = step(0.0, t) * step(t, aMeta.y);
    float flicker = 1.0 - uFlicker * 0.45 * (0.5 + 0.5 * sin(tt * 37.0 + aMeta.w * 61.0));
    vAlpha = alive * smoothstep(0.0, 0.1, k) * (1.0 - smoothstep(0.5, 1.0, k)) * flicker;
    gl_PointSize = aMeta.z * (1.0 + uGrow * k) * uScale / -mv.z;
  }
`
const PARTICLE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uSoft;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = pow(max(1.0 - d, 0.0), uSoft) * vAlpha * uOpacity;
    if (a < 0.002) discard;
    vec3 col = uColor;
    ${OUTPUT}
  }
`

/** Pixels per world unit at distance 1; FxLayer keeps it in step with the viewport. */
export const particleScale: THREE.IUniform<number> = { value: 500 }

const particleProtos = new Map<boolean, THREE.ShaderMaterial>()

export function particleMaterial(additive: boolean): THREE.ShaderMaterial {
  let proto = particleProtos.get(additive)
  if (!proto) {
    proto = material(
      PARTICLE_VERT,
      PARTICLE_FRAG,
      {
        uColor: { value: new THREE.Color() },
        uOpacity: { value: 1 },
        uTime: { value: 0 },
        uGravity: { value: 0 },
        uDrag: { value: 0 },
        uSwirl: { value: 0 },
        uGrow: { value: 0 },
        uFlicker: { value: 0 },
        uSoft: { value: 1.5 },
        uScale: particleScale,
      },
      additive,
    )
    particleProtos.set(additive, proto)
  }
  const m = cloneOf(proto)
  // Keep the shared viewport scale instead of the copy clone() made.
  m.uniforms.uScale = particleScale
  return m
}

/* Translucent afterimage: faint body, brighter silhouette. */
const GHOST_VERT = /* glsl */ `
  varying float vRim;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vRim = 1.0 - abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`
const GHOST_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uRimColor;
  uniform float uOpacity;
  varying float vRim;
  void main() {
    float rim = pow(vRim, 2.2);
    float a = (0.3 + 0.7 * rim) * uOpacity;
    vec3 col = mix(uColor, uRimColor, rim);
    ${OUTPUT}
  }
`

let ghostProto: THREE.ShaderMaterial | null = null

export function ghostMaterial(): THREE.ShaderMaterial {
  ghostProto ??= material(
    GHOST_VERT,
    GHOST_FRAG,
    { uColor: { value: new THREE.Color() }, uRimColor: { value: new THREE.Color() }, uOpacity: { value: 0 } },
    false,
  )
  return cloneOf(ghostProto)
}
