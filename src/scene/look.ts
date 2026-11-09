import { sceneSets, type SceneColors } from '../design/tokens'
import { useSettings } from '../store/settings'

/** Scene colors of the active board set. Read at use time (event spawn, material build), never at module load. */
export function look(): SceneColors {
  return sceneSets[useSettings.getState().boardSet]
}

/** Same as `look()`, but re-renders the component when the set changes. */
export function useLook(): SceneColors {
  return sceneSets[useSettings((s) => s.boardSet)]
}
