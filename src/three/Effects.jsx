import { EffectComposer, Bloom, DepthOfField, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { Vector2 } from "three";

// Post-traitement cinématique. (SSAO/GodRays volontairement omis ici → coût + risque ; bloom/DoF portent déjà l'ambiance.)
export default function Effects() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <DepthOfField focusDistance={0.012} focalLength={0.04} bokehScale={2.2} />
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.75} luminanceSmoothing={0.2} />
      <ChromaticAberration offset={new Vector2(0.0006, 0.0006)} radialModulation={false} modulationOffset={0} />
      <Vignette darkness={0.5} offset={0.3} />
    </EffectComposer>
  );
}
