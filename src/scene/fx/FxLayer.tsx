import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { useGame } from '../../store/game'
import { useSettings } from '../../store/settings'
import { fxBus } from '../choreo/bus'
import type { FxEvent } from '../choreo/types'
import { TIERS } from '../quality'
import { GhostTrail, LightColumn, Motes, Shards } from './Bursts'
import { Aura, DustRing, ImpactFlash, RippleRing } from './Decals'
import { particleScale } from './shaders'
import { Slash, ThreatLine, Trail } from './Trails'

interface Live {
  readonly key: number
  readonly event: Exclude<FxEvent, { type: 'mood' }>
  readonly startedAt: number
  readonly ending: boolean
}

const MAX_LIVE = 48

/**
 * Effects render on their own layer: the main camera sees it, but the contact-shadow camera and
 * the pointer raycaster (layer 0 only) do not, so light never casts shadows or blocks clicks.
 */
const FX_LAYER = 1

type ThreatEvent = Extract<FxEvent, { type: 'threatLine' }>

/** A threat line is valid only while the store still shows that exact check. */
function threatHolds(e: ThreatEvent): boolean {
  const { checkSquare, checkers } = useGame.getState()
  return checkSquare === e.to && checkers.includes(e.from)
}

/**
 * Renders what the performer's fx events mean. Each event becomes a short-lived instance that
 * animates itself and asks to be removed when done. Mood and the board wave are handled by
 * MoodRig and Board, which listen to the same bus.
 */
export function FxLayer() {
  const [live, setLive] = useState<readonly Live[]>([])
  const clock = useThree((s) => s.clock)
  const camera = useThree((s) => s.camera)
  const quality = useSettings((s) => s.quality)
  const density = TIERS[quality].fxDensity
  const nextKey = useRef(0)

  useEffect(
    () =>
      fxBus.on((event) => {
        if (event.type === 'mood') return
        if (useSettings.getState().reducedMotion && event.type !== 'threatLine') return
        if (event.type === 'threatLine' && !threatHolds(event)) return
        const item: Live = { key: nextKey.current++, event, startedAt: clock.elapsedTime, ending: false }
        setLive((list) => [...(list.length >= MAX_LIVE ? list.slice(1) : list), item])
      }),
    [clock],
  )

  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        const moved = s.history.length !== prev.history.length
        setLive((list) =>
          list.some((l) => l.event.type === 'threatLine' && !l.ending && (moved || !threatHolds(l.event)))
            ? list.map((l) => (l.event.type === 'threatLine' && (moved || !threatHolds(l.event)) ? { ...l, ending: true } : l))
            : list,
        )
      }),
    [],
  )

  const remove = useCallback((key: number) => setLive((list) => list.filter((l) => l.key !== key)), [])

  useEffect(() => {
    camera.layers.enable(FX_LAYER)
  }, [camera])

  useFrame(({ size, viewport, camera }) => {
    if (camera instanceof THREE.PerspectiveCamera) {
      particleScale.value = (size.height * viewport.dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
    }
  })

  return (
    <group>
      {live.map((l) => (
        <Effect key={l.key} item={l} density={density} onDone={remove} />
      ))}
    </group>
  )
}

function Effect({ item, density, onDone }: { item: Live; density: number; onDone: (key: number) => void }) {
  const root = useRef<THREE.Group>(null)
  const done = useCallback(() => onDone(item.key), [onDone, item.key])
  useLayoutEffect(() => {
    root.current?.traverse((o) => o.layers.set(FX_LAYER))
  }, [])
  return <group ref={root}>{content(item, density, item.ending, done)}</group>
}

function content(item: Live, density: number, ending: boolean, done: () => void): ReactNode {
  const common = { startedAt: item.startedAt, density, ending, onDone: done }
  const e = item.event
  switch (e.type) {
    case 'dustRing':
      return <DustRing event={e} {...common} />
    case 'ripple':
      return <RippleRing event={e} {...common} />
    case 'aura':
      return <Aura event={e} {...common} />
    case 'impactFlash':
      return <ImpactFlash event={e} {...common} />
    case 'trail':
      return <Trail event={e} {...common} />
    case 'threatLine':
      return <ThreatLine event={e} {...common} />
    case 'slash':
      return <Slash event={e} {...common} />
    case 'lightColumn':
      return <LightColumn event={e} {...common} />
    case 'shards':
      return <Shards event={e} {...common} />
    case 'motes':
      return <Motes event={e} {...common} />
    case 'ghostTrail':
      return <GhostTrail event={e} {...common} />
  }
}
