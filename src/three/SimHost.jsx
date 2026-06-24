import { useThree, useFrame } from "@react-three/fiber";
import { useRef, useEffect, useMemo } from "react";
import { createWorld } from "../sim/world.js";
import { drawHUD } from "../hud/hud.js";
import { setupFaceMesh } from "../face/faceMesh.js";
import { setupDragThrow } from "../interaction/dragThrow.js";

// L'UNIQUE pont React ↔ simulation : un <group> hôte + un seul useFrame qui fait avancer tout le monde.
export default function SimHost() {
  const { camera, gl } = useThree();
  const groupRef = useRef();
  const tRef = useRef(0);
  const worldRef = useRef();
  if (!worldRef.current) worldRef.current = createWorld({ camera }); // créé une seule fois
  const world = worldRef.current;

  const hud = useMemo(() => document.getElementById("hud"), []);
  const hctx = useMemo(() => hud.getContext("2d"), [hud]);

  useEffect(() => {
    groupRef.current.add(world.root);
    const sizeHud = () => { hud.width = innerWidth; hud.height = innerHeight; world.resize(); };
    sizeHud(); addEventListener("resize", sizeHud);

    // hooks de debug (sim gelée en preview headless car rAF throttlé) — voir plan §Vérification
    window.__sim = world;
    window.__tick = (steps = 1, dt = 1 / 60) => { for (let i = 0; i < steps; i++) { tRef.current += dt; world.tick(tRef.current, dt); } };

    const stopFace = setupFaceMesh(world);
    const stopDrag = setupDragThrow(world, camera, gl.domElement);
    return () => { removeEventListener("resize", sizeHud); stopFace?.(); stopDrag?.(); groupRef.current?.remove(world.root); };
  }, [world, camera, gl, hud]);

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    tRef.current += dt;
    world.tick(tRef.current, dt);
    drawHUD(world, hctx, hud, tRef.current, dt);
  });

  return <group ref={groupRef} />;
}
