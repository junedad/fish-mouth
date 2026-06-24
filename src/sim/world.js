import * as THREE from "three";
import { rnd, ri, clamp } from "./rng.js";
import { randomGenome, crossover } from "./genome.js";
import { buildCreature } from "./parts.js";
import { setUndulation } from "./materials.js";

export const MAX = 22;

// Crée toute la simulation. NE dépend PAS de React. R3F l'héberge sous un group via un seul useFrame.
export function createWorld({ camera }) {
  const root = new THREE.Group();
  const bounds = new THREE.Vector3();
  const creatures = [], plants = [], pellets = [], hearts = [];
  const world = { root, bounds, creatures, plants, pellets, hearts, faces: [], camera };

  function resize() {
    const w = innerWidth || 1, h = innerHeight || 1;
    const halfH = Math.tan(camera.fov * Math.PI / 360) * camera.position.z;
    bounds.set(halfH * (w / h) * 0.86, halfH * 0.86, 34);
  }
  resize();

  // écran (px) → plan z=0 du monde
  function screenToWorld(px, py) {
    const v = new THREE.Vector3((px / innerWidth) * 2 - 1, -(py / innerHeight) * 2 + 1, 0.5).unproject(camera);
    const dir = v.sub(camera.position).normalize();
    return camera.position.clone().add(dir.multiplyScalar(-camera.position.z / dir.z));
  }
  const toScreen = v => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * innerWidth, (-p.y * 0.5 + 0.5) * innerHeight]; };

  // ---- bulles ----
  const BN = 130, bgeo = new THREE.BufferGeometry(), bpos = new Float32Array(BN * 3);
  for (let i = 0; i < BN; i++) { bpos[i * 3] = rnd(-bounds.x, bounds.x); bpos[i * 3 + 1] = rnd(-bounds.y, bounds.y); bpos[i * 3 + 2] = rnd(-bounds.z, bounds.z); }
  bgeo.setAttribute("position", new THREE.BufferAttribute(bpos, 3));
  root.add(new THREE.Points(bgeo, new THREE.PointsMaterial({ color: 0xbfe6ff, size: 0.5, transparent: true, opacity: 0.45, depthWrite: false })));

  // ---- plantes ----
  function buildPlant(x, z) {
    const group = new THREE.Group(); const blades = [];
    const n = ri(4, 7);
    for (let i = 0; i < n; i++) {
      const h = rnd(9, 18), w = rnd(1.4, 2.6);
      const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.quadraticCurveTo(-w * 0.2, h * 0.6, 0, h); s.quadraticCurveTo(w * 0.2, h * 0.6, w / 2, 0);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rnd(0.28, 0.42), 0.6, rnd(0.32, 0.48)), roughness: 0.7, side: THREE.DoubleSide }));
      m.position.set(rnd(-3, 3), 0, rnd(-3, 3)); m.rotation.y = rnd(0, 6.28);
      group.add(m); blades.push({ m, base: m.rotation.z, ph: rnd(0, 6) });
    }
    group.position.set(x, -bounds.y, z); root.add(group);
    plants.push({ group, blades, health: 1 });
  }
  for (let i = 0; i < 12; i++) buildPlant(rnd(-bounds.x * 0.88, bounds.x * 0.88), rnd(-bounds.z * 0.8, bounds.z * 0.8));

  // ---- pellets ----
  const PELLET_GEO = new THREE.SphereGeometry(0.5, 8, 8);
  const PELLET_MAT = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x553300, roughness: 0.4 });
  function dropFood(x, y) {
    const m = new THREE.Mesh(PELLET_GEO, PELLET_MAT);
    m.position.copy(screenToWorld(x, y)); root.add(m);
    pellets.push({ mesh: m, vy: -2, eaten: false });
  }

  const effLen = o => o.S * o.dz * (o.fullScale || 1) * clamp(o.grow, 0.05, 1);

  function spawnAt(pos, opts = {}) {
    const g = opts.genome || randomGenome();
    const px = opts.size ?? rnd(26, 52);
    const S = px * 0.05;
    const baby = !!opts.baby;
    const built = buildCreature(g, S);
    built.group.position.copy(pos);
    built.group.scale.setScalar(0.1);
    root.add(built.group);
    creatures.push({
      ...built, g, S, baby, fullScale: 1, dead: false, hunting: false, hunger: rnd(0, 0.4),
      health: 1, panic: 0, strikeCd: 0, chase: 0, giveUp: 0, roll: 0, prevDir: null,
      grow: 0.1,
      vel: new THREE.Vector3(rnd(-4, 4), rnd(-4, 4), rnd(-2, 2)),
      wander: new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(),
      nextTurn: 0, speed: (g.diet === "predator" ? rnd(8, 12) : rnd(7, 13)) + (baby ? 4 : 0),
      mode: "swim", age: 0, life: rnd(48, 95), mateCd: baby ? 11 : 3.5,
      phase: rnd(0, 10), wig: rnd(0.9, 1.6), alpha: 1,
    });
    if (creatures.length > MAX) { const o = creatures.shift(); root.remove(o.group); }
  }

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), nose = new THREE.Vector3(), dir = new THREE.Vector3();
  function stepCreature(c, t, dt) {
    c.grow += (1 - c.grow) * (c.baby ? 0.12 : 0.16) * dt;
    c.group.scale.setScalar(clamp(c.grow, 0.05, 1) * c.fullScale * (c.mode === "held" ? 1.15 : 1));
    c.age += dt; c.mateCd -= dt;
    const left = c.life - c.age;
    c.alpha = left < 5 ? clamp(left / 5, 0, 1) : 1;
    if (c.alpha < 1) for (const m of c.mats) { m.transparent = true; m.opacity = c.alpha; }
    const old = left < 5, pred = c.g.diet === "predator", myLen = effLen(c);
    c.strikeCd -= dt;
    const starving = pred && c.hunger > 0.92;
    if (c.health < 1 && !starving) c.health = Math.min(1, c.health + dt * 0.12);
    if (starving) c.health -= dt * 0.08;
    if (c.health <= 0) c.dead = true;

    // animations : onde d'épine (shader) + queue + nageoires + mâchoire
    setUndulation(c.M, t, c.vel.length());
    c.tailPivot.rotation.y = Math.sin(t * 7 + c.phase) * 0.5 * c.wig;
    for (const p of c.pecs) p.m.rotation.z = p.base + Math.sin(t * 6 + c.phase) * 0.4 * p.side;
    if (c.jaw) c.jaw.rotation.x = THREE.MathUtils.lerp(c.jaw.rotation.x, c.hunting ? 0.5 : 0.05, dt * 8);

    const pos = c.group.position, b = bounds;
    if (c.mode === "held") return;

    if (c.mode === "thrown") {
      pos.addScaledVector(c.vel, dt); c.vel.multiplyScalar(Math.pow(0.12, dt));
    } else {
      c.hunger = Math.min(1, c.hunger + dt * 0.05);
      let target = false, fleeing = false; c.hunting = false;

      if (!pred) {
        let pr = null, pd = 1e9;
        for (const o of creatures) { if (o === c || o.dead || o.g.diet !== "predator" || effLen(o) < myLen * 1.1) continue; const dd = pos.distanceToSquared(o.group.position); if (dd < pd) { pd = dd; pr = o; } }
        if (pr && pd < 40 * 40) {
          tmp.copy(pos).sub(pr.group.position).normalize();
          tmp.x += Math.sin(t * 5 + c.phase) * 0.45; tmp.y += Math.cos(t * 4 + c.phase) * 0.3; tmp.normalize();
          c.wander.copy(tmp); target = fleeing = true;
        }
      }
      if (!target && pred && c.hunger > 0.5 && t > c.giveUp) {
        let prey = null, nd = 1e9;
        for (const o of creatures) { if (o === c || o.dead || o.grow < 0.55 || effLen(o) > myLen * 0.82) continue; const dd = pos.distanceToSquared(o.group.position); if (dd < nd) { nd = dd; prey = o; } }
        if (prey && nd < 48 * 48) {
          tmp.copy(prey.group.position).sub(pos); c.hunting = true; target = true;
          c.chase += dt;
          if (c.chase > 5.0) { c.giveUp = t + 3.0; c.chase = 0; c.hunting = false; target = false; }
          else {
            c.wander.copy(tmp).normalize();
            nose.copy(c.vel).normalize().multiplyScalar(myLen * 0.7).add(pos);
            const reach = effLen(prey) * 0.5 + myLen * 0.35 + 3.0;
            if (c.strikeCd <= 0 && nose.distanceTo(prey.group.position) < reach) {
              c.strikeCd = 0.7; prey.health -= 0.5; prey.panic = t + 2.4;
              if (prey.health <= 0) { prey.dead = true; c.hunger = 0; c.chase = 0; c.fullScale = Math.min(2.5, c.fullScale * 1.08); hearts.push({ pos: prey.group.position.clone(), age: 0, emoji: "💥" }); }
              else hearts.push({ pos: prey.group.position.clone(), age: 0, emoji: "💢" });
            }
          }
        } else c.chase = Math.max(0, c.chase - dt * 2);
      } else if (pred) c.chase = Math.max(0, c.chase - dt * 2);
      if (!target && !pred && c.hunger > 0.35 && plants.length) {
        let pl = null, nd = 1e9;
        for (const p of plants) { if (p.health < 0.2) continue; const dd = pos.distanceToSquared(p.group.position); if (dd < nd) { nd = dd; pl = p; } }
        if (pl && nd < 64 * 64) { tmp.copy(pl.group.position).sub(pos); target = true; if (tmp.length() < myLen * 0.6 + 7) { pl.health = Math.max(0, pl.health - dt * 0.5); c.hunger = Math.max(0, c.hunger - dt * 0.6); c.grow = Math.min(1, c.grow + dt * 0.06); } else c.wander.copy(tmp).normalize(); }
      }
      if (!target && !pred && c.hunger > 0.35 && pellets.length) {
        let near = null, nd = 1e9;
        for (const pl of pellets) { const dd = pos.distanceToSquared(pl.mesh.position); if (dd < nd) { nd = dd; near = pl; } }
        if (near && nd < 44 * 44) { tmp.copy(near.mesh.position).sub(pos); target = true; if (tmp.length() < myLen * 0.6 + 2) { near.eaten = true; c.hunger = Math.max(0, c.hunger - 0.5); c.grow = Math.min(1, c.grow + 0.04); } else c.wander.copy(tmp).normalize(); }
      }
      if (!target && t > c.nextTurn) { c.wander.set(rnd(-1, 1), rnd(-1, 1), rnd(-0.9, 0.9)).normalize(); c.nextTurn = t + rnd(1.2, 3.5); }

      const panicking = c.panic > t;
      const sp = c.speed * (old ? 1.7 : 1) * (panicking ? 2.0 : fleeing ? 1.8 : c.hunting ? 1.45 : 1);
      tmp.copy(c.wander).multiplyScalar(sp);
      c.vel.lerp(tmp, clamp(dt * 1.5, 0, 1));
      for (const o of creatures) {
        if (o === c || o.dead) continue;
        if ((pred && effLen(o) <= myLen * 0.82) || (o.g.diet === "predator" && myLen <= effLen(o) * 0.82)) continue;
        tmp2.subVectors(pos, o.group.position);
        const rr = (myLen + effLen(o)) * 0.5, d2 = tmp2.lengthSq();
        if (d2 > 1e-4 && d2 < rr * rr) c.vel.addScaledVector(tmp2.normalize(), (rr - Math.sqrt(d2)) * 4 * dt);
      }
      pos.addScaledVector(c.vel, dt);
    }

    for (const ax of ["x", "y", "z"]) {
      const lim = b[ax];
      if (pos[ax] > lim) { pos[ax] = lim; if (c.vel[ax] > 0) c.vel[ax] *= -0.7; c.wander[ax] *= -1; }
      if (pos[ax] < -lim) { pos[ax] = -lim; if (c.vel[ax] < 0) c.vel[ax] *= -0.7; c.wander[ax] *= -1; }
    }
    // orientation vers la vitesse + inclinaison (banking) dans les virages
    if (c.vel.lengthSq() > 0.5) {
      tmp.copy(pos).add(c.vel); c.group.lookAt(tmp);
      dir.copy(c.vel).normalize();
      let roll = 0;
      if (c.prevDir) { const crossY = c.prevDir.x * dir.z - c.prevDir.z * dir.x; roll = clamp(crossY * 6, -0.6, 0.6); }
      (c.prevDir = c.prevDir || new THREE.Vector3()).copy(dir);
      c.roll = THREE.MathUtils.lerp(c.roll, roll, 0.1);
      c.group.rotateZ(c.roll);
    }
    if (c.mode === "thrown" && c.vel.length() < c.speed * 0.5) c.mode = "swim";
  }

  function fertile(c) { return !c.dead && c.mode === "swim" && c.grow > 0.96 && c.mateCd <= 0 && c.age < c.life - 8; }
  function breeding() {
    if (creatures.length >= MAX) return;
    for (let i = 0; i < creatures.length; i++) {
      const a = creatures[i]; if (!fertile(a)) continue;
      for (let j = i + 1; j < creatures.length; j++) {
        const b = creatures[j]; if (!fertile(b) || b.g.diet !== a.g.diet) continue;
        const reach = (effLen(a) + effLen(b)) * 0.6 + 4;
        if (a.group.position.distanceTo(b.group.position) > reach) continue;
        const mid = a.group.position.clone().lerp(b.group.position, 0.5);
        spawnAt(mid, { genome: crossover(a.g, b.g), size: clamp((a.S + b.S) / 2 / 0.05 * rnd(0.85, 1.05), 18, 70), baby: true });
        a.mateCd = b.mateCd = 13;
        hearts.push({ pos: mid.clone(), age: 0 });
        return;
      }
    }
  }

  function tick(t, dt) {
    for (let i = creatures.length - 1; i >= 0; i--) {
      const c = creatures[i]; stepCreature(c, t, dt);
      if (c.dead || c.age > c.life) { root.remove(c.group); creatures.splice(i, 1); }
    }
    breeding();
    for (const p of plants) {
      p.health = Math.min(1, p.health + dt * 0.04);
      p.group.scale.set(1, 0.25 + 0.75 * p.health, 1);
      for (const bl of p.blades) bl.m.rotation.z = bl.base + Math.sin(t * 1.5 + bl.ph) * 0.15;
    }
    const a = bgeo.attributes.position.array;
    for (let i = 0; i < BN; i++) {
      a[i * 3 + 1] += dt * (2 + (i % 5)); a[i * 3] += Math.sin(t + i) * dt * 0.4;
      if (a[i * 3 + 1] > bounds.y) { a[i * 3 + 1] = -bounds.y; a[i * 3] = rnd(-bounds.x, bounds.x); }
    }
    bgeo.attributes.position.needsUpdate = true;
    for (let i = pellets.length - 1; i >= 0; i--) {
      const pl = pellets[i]; pl.mesh.position.y += pl.vy * dt; pl.vy = Math.max(-6, pl.vy - dt * 2);
      if (pl.eaten || pl.mesh.position.y < -bounds.y) { root.remove(pl.mesh); pellets.splice(i, 1); }
    }
  }

  Object.assign(world, { resize, screenToWorld, toScreen, spawnAt, dropFood, effLen, tick });
  return world;
}
