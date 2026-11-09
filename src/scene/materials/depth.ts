import * as THREE from 'three'

/**
 * Fake volume for the glass squares: bubbles, frost and a cloudy veil at three depths below the
 * surface. Each layer is sampled in world space and shifted against the view direction by its
 * depth (parallax), so as the camera moves they slide past each other inside the glass.
 * `uDepth` 0 leaves the material exactly as it was.
 */
export const depthUniforms = {
  uDepth: { value: 0 },
  uDeepMap: { value: new THREE.DataTexture(new Uint8Array(4), 1, 1) as THREE.Texture },
  uDeepTint: { value: new THREE.Color('#7fb8ff') },
}
depthUniforms.uDeepMap.value.needsUpdate = true

const VERT = /* glsl */ `
vDeepWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
#include <project_vertex>
`

const FRAG = /* glsl */ `
#include <map_fragment>
if (uDepth > 0.0) {
  // View ray in world space; each layer shifts by its depth, more at grazing angles (parallax).
  vec3 v = normalize(cameraPosition - vDeepWorld);
  vec2 par = v.xz / max(v.y, 0.35);
  vec2 w = vDeepWorld.xz;
  float bubbles = texture2D(uDeepMap, (w - par * 0.04) * 0.25).g;
  float frost = texture2D(uDeepMap, (w - par * 0.08) * 0.17 + 0.31).b;
  // The deepest layer is blurred (a coarse mip) and only absorbs.
  float veil = texture2D(uDeepMap, (w - par * 0.3) * 0.11 + 0.63, 3.0).r;
  // Looking straight down sees deepest: darker there, lighter toward grazing where light enters.
  float column = mix(0.72, 1.0, smoothstep(0.95, 0.55, v.y));
  vec3 body = diffuseColor.rgb * column * (1.0 - 0.35 * uDepth * veil);
  body += uDeepTint * uDepth * (bubbles * 0.5 + frost * 0.015);
  diffuseColor.rgb = body;
}
`

/** Fake bevel: normals tip outward in a thin band at each square's edge, so env light rims every tile. */
const BEVEL = /* glsl */ `
vec3 bevelTilt() {
  if (uDepth <= 0.0) return vec3(0.0);
  vec2 local = fract(vDeepWorld.xz) - 0.5;
  vec2 a = abs(local);
  float edge = 0.497 - max(a.x, a.y);
  float k = 1.0 - smoothstep(0.0, 0.045, edge);
  vec2 dir = a.x > a.y ? vec2(sign(local.x), 0.0) : vec2(0.0, sign(local.y));
  return (viewMatrix * vec4(dir.x, 0.0, dir.y, 0.0)).xyz * k * 1.3 * uDepth;
}
`

/** Chains onto an existing onBeforeCompile (the board ripple), so both apply. */
export function withDepth<T extends THREE.MeshPhysicalMaterial>(m: T): T {
  const prev = m.onBeforeCompile.bind(m)
  const prevKey = m.customProgramCacheKey()
  m.onBeforeCompile = (shader, renderer) => {
    prev(shader, renderer)
    Object.assign(shader.uniforms, depthUniforms)
    shader.vertexShader = 'varying vec3 vDeepWorld;\n' + shader.vertexShader.replace('#include <project_vertex>', VERT)
    shader.fragmentShader =
      'uniform float uDepth;\nuniform sampler2D uDeepMap;\nuniform vec3 uDeepTint;\nvarying vec3 vDeepWorld;\n' +
      BEVEL +
      shader.fragmentShader
        .replace('#include <map_fragment>', FRAG)
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(normal + bevelTilt());')
        .replace(
          '#include <clearcoat_normal_fragment_begin>',
          '#include <clearcoat_normal_fragment_begin>\nclearcoatNormal = normalize(clearcoatNormal + bevelTilt());',
        )
  }
  m.customProgramCacheKey = () => `${prevKey}+depth`
  return m
}
