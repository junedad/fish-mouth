import * as THREE from "three";

// Attrape / déplace / lance les créatures. Clic dans l'eau = nourriture. Porté.
export function setupDragThrow(world, camera, domEl) {
  const root = document.getElementById("root");
  const raycaster = new THREE.Raycaster();
  const dragPlane = new THREE.Plane();
  let grabbed = null, lastDrag = new THREE.Vector3(), lastT = 0;
  const now = () => performance.now() / 1000;
  const ndc = e => new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  const creatureOf = obj => { while (obj) { const c = world.creatures.find(c => c.group === obj); if (c) return c; obj = obj.parent; } return null; };

  const onDown = e => {
    raycaster.setFromCamera(ndc(e), camera);
    const hit = raycaster.intersectObjects(world.creatures.map(c => c.group), true)[0];
    if (!hit) { world.dropFood(e.clientX, e.clientY); return; }
    const c = creatureOf(hit.object); if (!c) return;
    grabbed = c; c.mode = "held"; c.vel.set(0, 0, 0); root.classList.add("grabbing");
    camera.getWorldDirection(dragPlane.normal); dragPlane.setFromNormalAndCoplanarPoint(dragPlane.normal, c.group.position);
    lastDrag.copy(c.group.position); lastT = now();
  };
  const onMove = e => {
    if (!grabbed) return;
    raycaster.setFromCamera(ndc(e), camera);
    const p = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(dragPlane, p)) return;
    const t = now(), d = Math.max(0.001, t - lastT);
    grabbed.vel.copy(p).sub(lastDrag).divideScalar(d).clampLength(0, 60);
    grabbed.group.position.copy(p); lastDrag.copy(p); lastT = t;
  };
  const onUp = () => { if (grabbed) { grabbed.mode = "thrown"; grabbed = null; root.classList.remove("grabbing"); } };

  domEl.addEventListener("pointerdown", onDown);
  domEl.addEventListener("pointermove", onMove);
  domEl.addEventListener("pointerup", onUp);
  domEl.addEventListener("pointercancel", onUp);
  return () => {
    domEl.removeEventListener("pointerdown", onDown); domEl.removeEventListener("pointermove", onMove);
    domEl.removeEventListener("pointerup", onUp); domEl.removeEventListener("pointercancel", onUp);
  };
}
