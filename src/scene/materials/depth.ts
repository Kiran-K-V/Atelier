import * as THREE from 'three'

/**
 * Fake volume for the resin squares: two fracture layers that sit below the surface. They are
 * sampled in world space and shifted against the view direction (parallax), so as the camera
 * moves they slide under the surface cracks like things frozen deeper in the resin.
 * `uDepth` 0 leaves the material exactly as it was.
 */
export const depthUniforms = {
  uDepth: { value: 0 },
  uDeepMap: { value: new THREE.DataTexture(new Uint8Array(4), 1, 1) as THREE.Texture },
  uDeepTint: { value: new THREE.Color('#5aa8ff') },
}
depthUniforms.uDeepMap.value.needsUpdate = true

const VERT = /* glsl */ `
vDeepWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
#include <project_vertex>
`

const FRAG = /* glsl */ `
#include <map_fragment>
if (uDepth > 0.0) {
  vec3 v = normalize(cameraPosition - vDeepWorld);
  vec2 par = v.xz / max(v.y, 0.3);
  vec2 w = vDeepWorld.xz;
  float mid = texture2D(uDeepMap, w * 0.19 - par * 0.03).r;
  float deep = texture2D(uDeepMap, w * 0.11 + 0.37 - par * 0.045).g;
  diffuseColor.rgb = diffuseColor.rgb * (1.0 - 0.35 * uDepth * deep) + uDeepTint * uDepth * (mid * 0.22 + deep * 0.06);
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
      shader.fragmentShader.replace('#include <map_fragment>', FRAG)
  }
  m.customProgramCacheKey = () => `${prevKey}+depth`
  return m
}
