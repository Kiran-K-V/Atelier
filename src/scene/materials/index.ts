import * as THREE from 'three'
import { sceneSets, type BoardSet } from '../../design/tokens'
import type { Color } from '../../rules/types'
import { useSettings } from '../../store/settings'
import { TIERS } from '../quality'
import { withGrain, type GrainUniforms } from './grain'
import { marbleTextures } from './marble'

/** Glacier tiles are blocks this deep (top at y = 0), sitting on a lit tray floor inside the frame. */
export const TRAY_DEPTH = 0.33

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

type PhysicalKey = Exclude<keyof SceneMaterials, 'felt' | 'slit'>
type StandardKey = 'felt' | 'slit'
type Physical = THREE.MeshPhysicalMaterialParameters
type Standard = THREE.MeshStandardMaterialParameters

interface Grain {
  readonly grain: number
  readonly sparkle: number
  readonly scale: number
}

interface SetSpec {
  readonly physical: Record<PhysicalKey, Physical>
  readonly standard: Record<StandardKey, Standard>
  readonly grain: Record<'pieceLight' | 'pieceDark', Grain>
}

/**
 * Every property any set touches, at three's defaults. Each set is applied over these, so
 * switching back and forth never leaves a value from the other set behind.
 */
const PHYSICAL_DEFAULTS: Physical = {
  color: '#ffffff',
  transparent: false,
  opacity: 1,
  depthWrite: true,
  map: null,
  roughness: 1,
  roughnessMap: null,
  metalness: 0,
  bumpMap: null,
  bumpScale: 1,
  clearcoat: 0,
  clearcoatRoughness: 0,
  sheen: 0,
  sheenRoughness: 1,
  sheenColor: '#000000',
  emissive: '#000000',
  emissiveIntensity: 1,
  transmission: 0,
  thickness: 0,
  ior: 1.5,
  attenuationColor: '#ffffff',
  attenuationDistance: Infinity,
  specularIntensity: 1,
  specularColor: '#ffffff',
  envMapIntensity: 1,
}

const STANDARD_DEFAULTS: Standard = { color: '#ffffff', roughness: 1, metalness: 0, emissive: '#000000', emissiveIntensity: 1 }

const NO_GRAIN: Grain = { grain: 0, sparkle: 0, scale: 1 }

/** Polished ivory marble, ebony and brass: the original set, values unchanged. */
function atelier(): SetSpec {
  const c = sceneSets.atelier
  const marble = marbleTextures()
  const polished = (map: THREE.Texture): Physical => ({
    map,
    roughnessMap: marble.roughness,
    roughness: 1,
    clearcoat: 0.65,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.9,
  })
  return {
    physical: {
      squareLight: polished(marble.light),
      squareDark: polished(marble.dark),
      frame: { color: c.frame, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 },
      brass: { color: c.brass, metalness: 1, roughness: 0.3, clearcoat: 0.3, clearcoatRoughness: 0.2 },
      // Ivory: softer coat, warm sheen and a faint warm self-glow stand in for subsurface scattering.
      pieceLight: {
        color: c.pieceLight,
        roughness: 0.38,
        clearcoat: 0.45,
        clearcoatRoughness: 0.22,
        sheen: 0.35,
        sheenRoughness: 0.55,
        sheenColor: '#ffe9cc',
        emissive: '#3a2a16',
        emissiveIntensity: 0.12,
      },
      // Ebony: deep, high-gloss lacquer.
      pieceDark: {
        color: c.pieceDark,
        roughness: 0.42,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        sheen: 0.12,
        sheenRoughness: 0.4,
        sheenColor: '#8a6a4a',
      },
    },
    standard: {
      felt: { color: '#1d3a2b', roughness: 1 },
      slit: { color: '#0b0908', roughness: 0.7 },
    },
    grain: { pieceLight: NO_GRAIN, pieceDark: NO_GRAIN },
  }
}

/**
 * Frosted glass and calm sapphire: frosted glass light squares, clear blue glass blocks with
 * trapped ice, a deep teal glass frame, frosted crystal white pieces and navy glass dark
 * pieces. Transmission (a second render pass) only where the tier allows it; otherwise glossy
 * opaque stand-ins with a cyan sheen rim so they still read as deep, never flat.
 */
function glacier(transmission: boolean): SetSpec {
  const c = sceneSets.glacier
  return {
    physical: {
      // Frosted glass: smooth, softly diffuse, faint cool tint. Opaque, so it costs no extra pass.
      squareLight: {
        color: '#d4dee7',
        roughness: 0.42,
        clearcoat: 0.7,
        clearcoatRoughness: 0.3,
        sheen: 0.2,
        sheenRoughness: 0.5,
        sheenColor: '#eef5ff',
      },
      // Sapphire glass blocks: real transmission down to the tray floor, darkening with depth.
      // Low tier: alpha transparency instead, so the trapped ice and floor still show through.
      squareDark: transmission
        ? {
            color: '#eef4fb',
            roughness: 0,
            transmission: 1,
            thickness: TRAY_DEPTH,
            ior: 1.5,
            attenuationColor: '#1f5bc4',
            attenuationDistance: 0.85,
            clearcoat: 1,
            clearcoatRoughness: 0.01,
          }
        : {
            color: '#1f4a86',
            roughness: 0.05,
            clearcoat: 1,
            clearcoatRoughness: 0.01,
            transparent: true,
            opacity: 0.42,
            depthWrite: false,
          },
      // Thick teal glass: refracts the board edge and the lit table below; glossy teal on low tier.
      frame: transmission
        ? {
            color: '#c4f0ff',
            roughness: 0.04,
            transmission: 1,
            thickness: 0.8,
            ior: 1.5,
            attenuationColor: c.frame,
            attenuationDistance: 0.45,
            // Teal-tinted reflections: at grazing angles fresnel would otherwise turn the frame silver.
            specularColor: '#6fd6ee',
            specularIntensity: 0.8,
            clearcoat: 0.35,
            clearcoatRoughness: 0.01,
            sheen: 0.6,
            sheenRoughness: 0.3,
            sheenColor: '#46d6f2',
          }
        : {
            color: '#06324c',
            roughness: 0.08,
            clearcoat: 1,
            clearcoatRoughness: 0.02,
            emissive: '#05324a',
            emissiveIntensity: 0.3,
            sheen: 0.3,
            sheenRoughness: 0.3,
            sheenColor: '#46d6f2',
          },
      // Frosted silver-ice trim.
      brass: { color: c.brass, metalness: 0.9, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.25 },
      // Frosted crystal: rough transmission blurs what is behind; grain and glints on top.
      pieceLight: transmission
        ? {
            color: '#ffffff',
            roughness: 0.42,
            transmission: 0.7,
            thickness: 0.35,
            ior: 1.45,
            attenuationColor: '#dceaf3',
            attenuationDistance: 0.6,
            clearcoat: 0.6,
            clearcoatRoughness: 0.12,
            sheen: 0.6,
            sheenRoughness: 0.4,
            sheenColor: '#eef8ff',
            emissive: '#9fb8c6',
            emissiveIntensity: 0.12,
          }
        : {
            color: c.pieceLight,
            roughness: 0.45,
            clearcoat: 0.5,
            clearcoatRoughness: 0.15,
            sheen: 0.8,
            sheenRoughness: 0.4,
            sheenColor: '#e3f4ff',
            emissive: '#2a3f4c',
            emissiveIntensity: 0.1,
          },
      // Deep blue glass: thick cores absorb to navy, thin edges stay bright with a cyan sheen rim.
      pieceDark: transmission
        ? {
            color: '#d6ecff',
            roughness: 0.03,
            transmission: 1,
            thickness: 0.4,
            ior: 1.5,
            attenuationColor: '#0d3f8f',
            attenuationDistance: 0.5,
            clearcoat: 1,
            clearcoatRoughness: 0.01,
            sheen: 1,
            sheenRoughness: 0.25,
            sheenColor: '#4fd8ff',
            emissive: '#04163a',
            emissiveIntensity: 0.6,
          }
        : {
            color: '#0a2d66',
            roughness: 0.08,
            clearcoat: 1,
            clearcoatRoughness: 0.02,
            sheen: 1,
            sheenRoughness: 0.25,
            sheenColor: '#4fd8ff',
            emissive: '#03163a',
            emissiveIntensity: 1,
          },
    },
    standard: {
      felt: { color: '#d5e6f2', roughness: 1 },
      slit: { color: '#04283f', roughness: 0.5 },
    },
    grain: {
      pieceLight: { grain: 0.12, sparkle: 0, scale: 260 },
      pieceDark: NO_GRAIN,
    },
  }
}

interface Store {
  readonly mats: SceneMaterials
  readonly grain: Record<'pieceLight' | 'pieceDark', GrainUniforms>
  /** Long-lived copies (the board's ripple clones) that must follow their source on a switch. */
  readonly linked: { key: PhysicalKey; mat: THREE.MeshPhysicalMaterial }[]
}

function apply(store: Store, set: BoardSet, transmission: boolean): void {
  const spec = set === 'glacier' ? glacier(transmission) : atelier()
  const physical = (key: PhysicalKey, m: THREE.MeshPhysicalMaterial) => {
    m.setValues({ ...PHYSICAL_DEFAULTS, ...spec.physical[key] })
    m.needsUpdate = true
  }
  for (const key of Object.keys(spec.physical) as PhysicalKey[]) physical(key, store.mats[key])
  for (const { key, mat } of store.linked) physical(key, mat)
  for (const key of Object.keys(spec.standard) as StandardKey[]) {
    store.mats[key].setValues({ ...STANDARD_DEFAULTS, ...spec.standard[key] })
    store.mats[key].needsUpdate = true
  }
  for (const key of ['pieceLight', 'pieceDark'] as const) {
    const g = spec.grain[key]
    store.grain[key].uGrain.value = g.grain
    store.grain[key].uSparkle.value = g.sparkle
    store.grain[key].uGrainScale.value = g.scale
  }
}

function create(): Store {
  const mats: SceneMaterials = {
    squareLight: new THREE.MeshPhysicalMaterial(),
    squareDark: new THREE.MeshPhysicalMaterial(),
    frame: new THREE.MeshPhysicalMaterial(),
    brass: new THREE.MeshPhysicalMaterial(),
    pieceLight: new THREE.MeshPhysicalMaterial(),
    pieceDark: new THREE.MeshPhysicalMaterial(),
    felt: new THREE.MeshStandardMaterial(),
    slit: new THREE.MeshStandardMaterial(),
  }
  const store: Store = { mats, grain: { pieceLight: withGrain(mats.pieceLight), pieceDark: withGrain(mats.pieceDark) }, linked: [] }
  const current = () => {
    const s = useSettings.getState()
    apply(store, s.boardSet, TIERS[s.quality].transmission)
  }
  current()
  // Switch in place: every mesh, instanced shard and morph keeps its material reference.
  useSettings.subscribe((s, prev) => {
    if (s.boardSet !== prev.boardSet || TIERS[s.quality].transmission !== TIERS[prev.quality].transmission) current()
  })
  return store
}

let cached: Store | null = null

const store = (): Store => (cached ??= create())

/** Created on first use (needs a DOM for the canvas textures) and shared for the app's lifetime. */
export function materials(): SceneMaterials {
  return store().mats
}

/**
 * Registers a long-lived copy of a scene material so set switches update it too. Short-lived
 * clones (capture ghosts, promotion crossfades) copy the set at creation and need no link.
 */
export function linkMaterial<T extends THREE.MeshPhysicalMaterial>(key: PhysicalKey, mat: T): T {
  store().linked.push({ key, mat })
  return mat
}

export function pieceMaterial(color: Color): THREE.MeshPhysicalMaterial {
  const m = materials()
  return color === 'w' ? m.pieceLight : m.pieceDark
}
