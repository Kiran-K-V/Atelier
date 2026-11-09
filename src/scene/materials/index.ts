import * as THREE from 'three'
import { sceneSets, type BoardSet } from '../../design/tokens'
import type { Color } from '../../rules/types'
import { useSettings } from '../../store/settings'
import { TIERS } from '../quality'
import { frostTextures } from './frost'
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
 * Frosted ice and deep sapphire-teal glass, one hue family. Figure-ground rule: white pieces are
 * the brightest thing on the board, light squares are mid-light frosted grey, dark squares are
 * deep see-through glass, dark pieces are darker still with a cool rim so they read on dark tiles.
 * Transmission (a second render pass) only where the tier allows it; otherwise opaque or alpha
 * stand-ins in the same values.
 */
function glacier(transmission: boolean): SetSpec {
  const c = sceneSets.glacier
  const frost = frostTextures()
  return {
    physical: {
      // Frosted ice slab: fine low-contrast mottling in colour and roughness. Opaque, no extra pass.
      // Darkened from the token: the studio key lights it up to about the token value on screen.
      squareLight: {
        color: '#8799a6',
        map: frost.color,
        roughness: 1,
        roughnessMap: frost.roughness,
        clearcoat: 0.35,
        clearcoatRoughness: 0.35,
      },
      // Deep, low-saturation sapphire-teal glass blocks down to a dark tray floor.
      // Low tier: alpha transparency instead, so the trapped ice and floor still show through.
      squareDark: transmission
        ? {
            color: '#e4eff4',
            roughness: 0,
            transmission: 1,
            thickness: TRAY_DEPTH,
            ior: 1.5,
            attenuationColor: '#7a9eac',
            attenuationDistance: 0.8,
            clearcoat: 1,
            clearcoatRoughness: 0.01,
          }
        : {
            color: c.squareDark,
            roughness: 0.05,
            clearcoat: 1,
            clearcoatRoughness: 0.01,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
          },
      // Straight bevelled frame in thick deep-teal glass; a faint cool sheen picks out the edges.
      frame: transmission
        ? {
            color: '#d2ecf4',
            roughness: 0.04,
            transmission: 1,
            thickness: 0.8,
            ior: 1.5,
            attenuationColor: '#2f6f8c',
            attenuationDistance: 0.6,
            // Teal-tinted, softer coat: at grazing angles a white coat turns the near rail grey.
            specularColor: '#5f9fb5',
            specularIntensity: 0.7,
            clearcoat: 0.3,
            clearcoatRoughness: 0.02,
            sheen: 0.35,
            sheenRoughness: 0.35,
            sheenColor: '#7fb8cc',
          }
        : {
            color: '#082a3f',
            roughness: 0.08,
            clearcoat: 1,
            clearcoatRoughness: 0.02,
            sheen: 0.35,
            sheenRoughness: 0.35,
            sheenColor: '#7fb8cc',
          },
      // Muted silver-teal trim: thin and dim, never brighter than the pieces.
      brass: { color: '#4f7584', metalness: 0.6, roughness: 0.45, clearcoat: 0.2, clearcoatRoughness: 0.4 },
      // Frosted crystal, mostly opaque so it stays the brightest element; crisp coat on top.
      pieceLight: transmission
        ? {
            color: c.pieceLight,
            roughness: 0.32,
            transmission: 0.3,
            thickness: 0.35,
            ior: 1.45,
            attenuationColor: '#e8f1f5',
            attenuationDistance: 1,
            clearcoat: 1,
            clearcoatRoughness: 0.04,
            sheen: 0.5,
            sheenRoughness: 0.35,
            sheenColor: '#ffffff',
            emissive: '#ffffff',
            emissiveIntensity: 0.32,
          }
        : {
            color: c.pieceLight,
            roughness: 0.35,
            clearcoat: 1,
            clearcoatRoughness: 0.05,
            sheen: 0.6,
            sheenRoughness: 0.35,
            sheenColor: '#ffffff',
            emissive: '#ffffff',
            emissiveIntensity: 0.3,
          },
      // Near-black teal glass: thick parts absorb almost fully, a cool sheen rim draws the outline.
      pieceDark: transmission
        ? {
            color: '#c9e2ec',
            roughness: 0.02,
            transmission: 1,
            thickness: 0.4,
            ior: 1.5,
            attenuationColor: c.pieceDark,
            attenuationDistance: 0.12,
            clearcoat: 1,
            clearcoatRoughness: 0,
            sheen: 1,
            sheenRoughness: 0.22,
            sheenColor: '#6fc8de',
          }
        : {
            color: c.pieceDark,
            roughness: 0.06,
            clearcoat: 1,
            clearcoatRoughness: 0,
            sheen: 1,
            sheenRoughness: 0.22,
            sheenColor: '#6fc8de',
          },
    },
    standard: {
      felt: { color: '#b9cbd6', roughness: 1 },
      slit: { color: '#06161f', roughness: 0.5 },
    },
    grain: {
      pieceLight: { grain: 0.1, sparkle: 0, scale: 260 },
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
