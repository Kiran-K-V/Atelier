import { useFrame } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode, type DepthOfFieldEffect, type VignetteEffect } from 'postprocessing'
import { useMemo, useRef, useState } from 'react'
import { squareToPosition } from './coords'
import { moodWeights, useMood } from './fx/mood'

interface EffectsProps {
  readonly smaa: boolean
  /** Depth of field on the mated king (high tier). */
  readonly dof: boolean
  readonly vignette: number
  /** HDR level above which pixels glow. Bright board surfaces must stay below it; effects sit well above. */
  readonly bloomThreshold: number
}

const MATE_VIGNETTE = 0.35
const MATE_BOKEH = 3.5

/** Post chain. Vignette deepens and, when allowed, depth of field settles on the king as the mate mood blends in. */
export function Effects({ smaa, dof, vignette, bloomThreshold }: EffectsProps) {
  const mood = useMood((s) => s.mood)
  const square = useMood((s) => s.square)
  const vignetteRef = useRef<VignetteEffect>(null)
  const dofRef = useRef<DepthOfFieldEffect>(null)
  // Stays mounted after the mate mood ends until its blend has faded, so the blur never pops off.
  const [dofOn, setDofOn] = useState(false)
  if (dof && mood === 'mate' && !dofOn) setDofOn(true)
  const focus = useMemo((): [number, number, number] | null => {
    if (!square) return null
    const [x, , z] = squareToPosition(square)
    return [x, 0.35, z]
  }, [square])

  useFrame(() => {
    if (vignetteRef.current) vignetteRef.current.darkness = vignette + MATE_VIGNETTE * moodWeights.mate
    if (dofRef.current) dofRef.current.bokehScale = MATE_BOKEH * moodWeights.mate
    if (dofOn && mood !== 'mate' && moodWeights.mate < 0.01) setDofOn(false)
  })

  return (
    <EffectComposer multisampling={0}>
      {dof && dofOn && focus ? <DepthOfField ref={dofRef} target={focus} worldFocusRange={2.4} bokehScale={0} /> : <></>}
      <Bloom mipmapBlur luminanceThreshold={bloomThreshold} luminanceSmoothing={0.2} intensity={0.6} />
      {/* The composer bypasses renderer tone mapping; without this, post tiers would not match the low tier. */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette ref={vignetteRef} offset={0.3} darkness={vignette} />
      {smaa ? <SMAA /> : <></>}
    </EffectComposer>
  )
}
