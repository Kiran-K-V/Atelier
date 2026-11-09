import * as THREE from 'three'
import { profileToPoints } from './geometry'
import { FOOT_COMMANDS, type Profile } from './profiles'

/** Resamples a polyline to `count` points evenly spaced by arc length; keeps both endpoints. */
export function resampleByArcLength(points: readonly THREE.Vector2[], count: number): THREE.Vector2[] {
  const lengths = [0]
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]))
  const total = lengths[lengths.length - 1]
  const out: THREE.Vector2[] = []
  let seg = 1
  for (let i = 0; i < count; i++) {
    const target = (total * i) / (count - 1)
    while (seg < points.length - 1 && lengths[seg] < target) seg++
    const span = lengths[seg] - lengths[seg - 1]
    const t = span > 0 ? Math.min(1, (target - lengths[seg - 1]) / span) : 1
    out.push(new THREE.Vector2().lerpVectors(points[seg - 1], points[seg], t))
  }
  out[count - 1] = points[points.length - 1].clone()
  return out
}

/** Splits a profile into its shared foot and the body above it, as dense polylines. */
function parts(profile: Profile): [THREE.Vector2[], THREE.Vector2[]] {
  const foot = profileToPoints(profile.slice(0, FOOT_COMMANDS), 24)
  const end = foot[foot.length - 1]
  const body = profileToPoints([['M', end.x, end.y], ...profile.slice(FOOT_COMMANDS)], 24)
  return [foot, body]
}

/**
 * Two profiles resampled to the same point count, foot mapped to foot and body to body,
 * so lathes built from them have matching vertices and one can be a morph target of the other.
 */
export function matchedProfiles(a: Profile, b: Profile, count: number): [THREE.Vector2[], THREE.Vector2[]] {
  const footCount = Math.round(count * 0.3)
  const bodyCount = count - footCount + 1
  const resample = (p: Profile) => {
    const [foot, body] = parts(p)
    return [...resampleByArcLength(foot, footCount), ...resampleByArcLength(body, bodyCount).slice(1)]
  }
  return [resample(a), resample(b)]
}
