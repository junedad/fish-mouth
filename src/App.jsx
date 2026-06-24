import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import Scene from "./three/Scene.jsx";

// Le <video>, le canvas #hud et #msg sont dans index.html (DOM bruts). React ne gère que le <Canvas>.
export default function App() {
  return (
    <Canvas
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 2]}
      camera={{ fov: 50, near: 8, far: 220, position: [0, 0, 72] }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
      }}
    >
      <Scene />
    </Canvas>
  );
}
