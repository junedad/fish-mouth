import { Environment, Lightformer } from "@react-three/drei";
import SimHost from "./SimHost.jsx";
import Atmosphere from "./Atmosphere.jsx";
import Effects from "./Effects.jsx";

export default function Scene() {
  return (
    <>
      {/* brouillard exponentiel = absorption de profondeur (la webcam reste visible derrière via alpha) */}
      <fogExp2 attach="fog" args={[0x02141f, 0.013]} />

      {/* lumières directes en complément de l'IBL */}
      <hemisphereLight args={[0x9cc6ff, 0x0c1a22, 0.55]} />
      <ambientLight args={[0x556677, 0.2]} />
      <directionalLight position={[-30, 60, 40]} intensity={0.9} color={0xffffff} />
      <directionalLight position={[40, -20, -30]} intensity={0.5} color={0x66ccff} />

      {/* IBL procédural (pas de HDRI réseau) → reflets/clearcoat corrects sur les poissons mouillés */}
      <Environment resolution={256}>
        <Lightformer intensity={3} color="#cde8ff" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} />
        <Lightformer intensity={1.2} color="#3aa0c8" position={[0, 0, -16]} scale={[30, 18, 1]} />
        <Lightformer intensity={0.6} color="#0a2a3a" position={[0, -12, 0]} rotation-x={-Math.PI / 2} scale={[30, 30, 1]} />
        <Lightformer intensity={0.8} color="#8fdcff" position={[-16, 4, 6]} rotation-y={Math.PI / 2} scale={[20, 14, 1]} />
        <Lightformer intensity={0.8} color="#6fc8ff" position={[16, 4, 6]} rotation-y={-Math.PI / 2} scale={[20, 14, 1]} />
      </Environment>

      <Atmosphere />
      <SimHost />
      <Effects />
    </>
  );
}
