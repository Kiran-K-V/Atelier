import type { CameraAction, FxEvent } from './types'

type Listener<T> = (event: T) => void

function channel<T>() {
  const listeners = new Set<Listener<T>>()
  return {
    emit: (event: T) => listeners.forEach((l) => l(event)),
    on: (l: Listener<T>) => {
      listeners.add(l)
      return () => void listeners.delete(l)
    },
  }
}

/** The performer emits; FxLayer, Board ripple and the lighting rig listen. */
export const fxBus = channel<FxEvent>()
/** The performer emits; CameraRig listens. */
export const cameraBus = channel<CameraAction>()
