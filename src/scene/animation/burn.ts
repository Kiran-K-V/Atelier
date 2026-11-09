import * as THREE from 'three'

/** Shared by a ghost's materials so one tween drives every slot. */
export interface BurnUniforms {
  readonly uBurn: { value: number }
  readonly uBurnColor: { value: THREE.Color }
}

const NOISE = /* glsl */ `
uniform float uBurn;
uniform vec3 uBurnColor;
varying vec3 vBurnPos;
float burnHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float burnValue(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(burnHash(i), burnHash(i + vec3(1, 0, 0)), f.x), mix(burnHash(i + vec3(0, 1, 0)), burnHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(burnHash(i + vec3(0, 0, 1)), burnHash(i + vec3(1, 0, 1)), f.x), mix(burnHash(i + vec3(0, 1, 1)), burnHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
// Noise biased by height so the burn eats down from the crown.
float burnField(vec3 p) {
  float n = 0.65 * burnValue(p * 11.0) + 0.35 * burnValue(p * 25.0 + 7.1);
  return 0.6 * n + 0.4 * (1.0 - clamp(p.y / 1.05, 0.0, 1.0));
}
`

/**
 * Makes a material burn away as `uBurn` goes 0 -> 1: fragments below the noise threshold are
 * discarded and a warm glowing rim runs ahead of the edge. Procedural 3D noise instead of an
 * alphaMap because piece geometry carries no UVs.
 */
export function installBurn(material: THREE.Material, uniforms: BurnUniforms): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBurnPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBurnPos = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${NOISE}`)
      .replace(
        '#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\nfloat burnN = burnField(vBurnPos);\nif (burnN < uBurn) discard;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
float burnRim = (1.0 - smoothstep(uBurn, uBurn + 0.07, burnN)) * step(0.001, uBurn);
totalEmissiveRadiance += uBurnColor * (burnRim * 3.0 + uBurn * 0.35);`,
      )
  }
  material.customProgramCacheKey = () => 'burn'
  material.needsUpdate = true
}
