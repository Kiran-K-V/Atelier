import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

interface EffectsProps {
  readonly smaa: boolean
  readonly vignette: number
}

/** The composer disables renderer tone mapping, so ACES runs here, after bloom and before AA. */
export function Effects({ smaa, vignette }: EffectsProps) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.15} intensity={0.55} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={vignette} />
      {smaa ? <SMAA /> : <></>}
    </EffectComposer>
  )
}
