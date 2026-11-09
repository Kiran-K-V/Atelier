import * as THREE from 'three'
import { RIPPLE, RIPPLE_GLSL } from './ripple'

/** Shared by both square materials; Board writes time and ripple slots. */
export const rippleUniforms = {
  uRippleTime: { value: 0 },
  uRipples: { value: Array.from({ length: RIPPLE.slots }, () => new THREE.Vector4(0, 0, -100, 0)) },
}

/** A clone of a square material whose tiles lift and tilt with the ripple. Needs an `aCenter` (xz) attribute. */
export function withRipple(base: THREE.MeshPhysicalMaterial): THREE.MeshPhysicalMaterial {
  const m = base.clone()
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, rippleUniforms)
    shader.vertexShader = RIPPLE_GLSL + shader.vertexShader
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        float ripH; vec3 ripW;
        rippleAt(aCenter, ripH, ripW);
        objectNormal += cross(ripW, objectNormal);`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        transformed += cross(ripW, transformed - vec3(aCenter.x, -0.02, aCenter.y)) + vec3(0.0, ripH, 0.0);`,
      )
  }
  m.customProgramCacheKey = () => 'board-ripple'
  return m
}
