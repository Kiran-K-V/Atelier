import * as THREE from 'three'
import { scene } from '../../design/tokens'
import type { Color } from '../../rules/types'
import { marbleTextures } from './marble'

export interface SceneMaterials {
  readonly squareLight: THREE.MeshPhysicalMaterial
  readonly squareDark: THREE.MeshPhysicalMaterial
  readonly frame: THREE.MeshPhysicalMaterial
  readonly brass: THREE.MeshPhysicalMaterial
  readonly pieceLight: THREE.MeshPhysicalMaterial
  readonly pieceDark: THREE.MeshPhysicalMaterial
  readonly felt: THREE.MeshStandardMaterial
  readonly slit: THREE.MeshStandardMaterial
}

function create(): SceneMaterials {
  const marble = marbleTextures()
  const polishedMarble = (map: THREE.Texture) =>
    new THREE.MeshPhysicalMaterial({
      map,
      roughnessMap: marble.roughness,
      roughness: 1,
      clearcoat: 0.65,
      clearcoatRoughness: 0.12,
      envMapIntensity: 0.9,
    })

  return {
    squareLight: polishedMarble(marble.light),
    squareDark: polishedMarble(marble.dark),
    frame: new THREE.MeshPhysicalMaterial({
      color: scene.frame,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    }),
    brass: new THREE.MeshPhysicalMaterial({
      color: scene.brass,
      metalness: 1,
      roughness: 0.3,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
    }),
    // Ivory: softer coat, warm sheen and a faint warm self-glow stand in for subsurface scattering.
    pieceLight: new THREE.MeshPhysicalMaterial({
      color: scene.pieceLight,
      roughness: 0.38,
      clearcoat: 0.45,
      clearcoatRoughness: 0.22,
      sheen: 0.35,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color('#ffe9cc'),
      emissive: new THREE.Color('#3a2a16'),
      emissiveIntensity: 0.12,
    }),
    // Ebony: deep, high-gloss lacquer.
    pieceDark: new THREE.MeshPhysicalMaterial({
      color: scene.pieceDark,
      roughness: 0.42,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      sheen: 0.12,
      sheenRoughness: 0.4,
      sheenColor: new THREE.Color('#8a6a4a'),
    }),
    felt: new THREE.MeshStandardMaterial({ color: '#1d3a2b', roughness: 1 }),
    slit: new THREE.MeshStandardMaterial({ color: '#0b0908', roughness: 0.7 }),
  }
}

let cached: SceneMaterials | null = null

/** Created on first use (needs a DOM for the marble canvas) and shared for the app's lifetime. */
export function materials(): SceneMaterials {
  cached ??= create()
  return cached
}

export function pieceMaterial(color: Color): THREE.MeshPhysicalMaterial {
  const m = materials()
  return color === 'w' ? m.pieceLight : m.pieceDark
}
