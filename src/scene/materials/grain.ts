import type * as THREE from 'three'

/**
 * Piece meshes carry no UVs, so their surface grain is procedural: 3D value noise on the
 * object-space position tilts the normal (grain), and sparse cells drop to near-zero roughness
 * (glints). Both are uniforms, so a set switch never recompiles; at 0 the shader output is
 * unchanged.
 */
export interface GrainUniforms {
  readonly uGrain: { value: number }
  readonly uSparkle: { value: number }
  readonly uGrainScale: { value: number }
}

const DECL = /* glsl */ `
uniform float uGrain;
uniform float uSparkle;
uniform float uGrainScale;
varying vec3 vGrainPos;
vec3 gHash3(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
vec3 gNoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(gHash3(i), gHash3(i + vec3(1, 0, 0)), u.x), mix(gHash3(i + vec3(0, 1, 0)), gHash3(i + vec3(1, 1, 0)), u.x), u.y),
    mix(mix(gHash3(i + vec3(0, 0, 1)), gHash3(i + vec3(1, 0, 1)), u.x), mix(gHash3(i + vec3(0, 1, 1)), gHash3(i + vec3(1, 1, 1)), u.x), u.y),
    u.z);
}
`

const SPARKLE = /* glsl */ `
#include <roughnessmap_fragment>
if (uSparkle > 0.0) {
  vec3 cp = vGrainPos * uGrainScale * 0.55;
  vec3 h = gHash3(floor(cp));
  float d = length(fract(cp) - 0.5 - (h - 0.5) * 0.5);
  float spark = step(1.0 - uSparkle, h.x) * (1.0 - smoothstep(0.06, 0.16, d));
  roughnessFactor = mix(roughnessFactor, 0.03, spark);
}
`

const GRAIN = /* glsl */ `
#include <normal_fragment_maps>
if (uGrain > 0.0) {
  vec3 gp = vGrainPos * uGrainScale;
  vec3 g = (gNoise3(gp) - 0.5) * 0.6 + (gNoise3(gp * 2.7 + 13.1) - 0.5) * 0.4;
  g -= dot(g, normal) * normal;
  normal = normalize(normal + uGrain * g);
}
`

export function withGrain(m: THREE.MeshPhysicalMaterial): GrainUniforms {
  const uniforms: GrainUniforms = { uGrain: { value: 0 }, uSparkle: { value: 0 }, uGrainScale: { value: 1 } }
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = 'varying vec3 vGrainPos;\n' + shader.vertexShader.replace(
      '#include <project_vertex>',
      'vGrainPos = transformed;\n#include <project_vertex>',
    )
    shader.fragmentShader = DECL + shader.fragmentShader
      .replace('#include <roughnessmap_fragment>', SPARKLE)
      .replace('#include <normal_fragment_maps>', GRAIN)
  }
  m.customProgramCacheKey = () => 'piece-grain'
  return uniforms
}
