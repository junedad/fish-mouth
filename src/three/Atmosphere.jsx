import { Sparkles } from "@react-three/drei";

// Fond marin + neige marine + voile de surface lumineux. Volume ~ ±57 x ±29 y ±34 z (cf. world.resize).
export default function Atmosphere() {
  return (
    <>
      {/* sol */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -30, 0]} receiveShadow={false}>
        <planeGeometry args={[400, 220]} />
        <meshStandardMaterial color="#0c2630" roughness={1} metalness={0} />
      </mesh>

      {/* surface de l'eau vue d'en dessous (voile lumineux additif) */}
      <mesh rotation-x={Math.PI / 2} position={[0, 30, 0]}>
        <planeGeometry args={[400, 220]} />
        <meshBasicMaterial color="#1a6f8c" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      {/* neige marine / particules en suspension */}
      <Sparkles count={220} scale={[120, 60, 70]} size={2.2} speed={0.25} opacity={0.5} color="#bfe6ff" />
      <Sparkles count={80} scale={[120, 60, 70]} size={4} speed={0.15} opacity={0.3} color="#ffffff" />
    </>
  );
}
