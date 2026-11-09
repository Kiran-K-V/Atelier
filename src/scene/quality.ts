import type { QualityTier } from '../store/types'

export interface TierConfig {
  readonly dpr: readonly [min: number, max: number]
  /** 0 disables directional shadows. */
  readonly shadowMapSize: number
  readonly post: boolean
  readonly smaa: boolean
  readonly envResolution: number
  /** Live contact shadows; low tier uses per-piece blob shadows instead. */
  readonly contactShadows: boolean
}

export const TIERS: Record<QualityTier, TierConfig> = {
  high: { dpr: [1, 2], shadowMapSize: 2048, post: true, smaa: true, envResolution: 256, contactShadows: true },
  medium: { dpr: [1, 1.5], shadowMapSize: 1024, post: true, smaa: false, envResolution: 128, contactShadows: true },
  low: { dpr: [1, 1], shadowMapSize: 0, post: false, smaa: false, envResolution: 64, contactShadows: false },
}

const ORDER: readonly QualityTier[] = ['low', 'medium', 'high']

export function stepTier(tier: QualityTier, dir: 1 | -1): QualityTier {
  const i = Math.min(ORDER.length - 1, Math.max(0, ORDER.indexOf(tier) + dir))
  return ORDER[i]
}
