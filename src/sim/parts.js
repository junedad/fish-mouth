import * as THREE from "three";
import { ri } from "./rng.js";
import { makeMaterials } from "./materials.js";

// proportions du corps : demi-longueur z, largeur x, hauteur y
const SH = {
  normal:   { len: 1.45, hx: 0.72, hy: 0.88 },
  long:     { len: 2.30, hx: 0.42, hy: 0.50 },
  round:    { len: 1.10, hx: 1.00, hy: 1.05 },
  flat:     { len: 1.25, hx: 0.40, hy: 1.30 },
  teardrop: { len: 1.55, hx: 0.74, hy: 0.80 },
  arrow:    { len: 1.85, hx: 0.52, hy: 0.62 },
};
const TAIL = { forked: [1.5, 1.5], fan: [1.95, 1.5], round: [1.5, 1.45], pointy: [1.5, 0.95], lunate: [2.25, 1.8], whip: [2.7, 0.55] };
// plus de segments en Z → l'onde d'épine (shader) se lit bien sur le corps
const SPHERE = new THREE.SphereGeometry(1, 28, 36);

function finGeo(w, h) {
  const s = new THREE.Shape();
  s.moveTo(0, -h * 0.28);
  s.quadraticCurveTo(w * 0.6, -h * 0.55, w, -h * 0.12);
  s.quadraticCurveTo(w * 0.82, 0, w, h * 0.12);
  s.quadraticCurveTo(w * 0.6, h * 0.55, 0, h * 0.28);
  s.lineTo(0, -h * 0.28);
  return new THREE.ShapeGeometry(s);
}

function partTail(group, g, D, M, anim) {
  const [tw, th] = TAIL[g.tail.type] || TAIL.forked, sz = g.tail.size;
  const pivot = new THREE.Group(); pivot.position.set(0, 0, -D.dz * 0.95); group.add(pivot);
  const tail = new THREE.Mesh(finGeo(D.S * tw * sz, D.S * th * sz), M.fin); tail.rotation.y = Math.PI / 2; pivot.add(tail);
  anim.tailPivot = pivot;
}
function partDorsal(group, g, D, M) {
  const t = g.dorsal.type, sz = g.dorsal.size;
  if (t === "sail") { const d = new THREE.Mesh(finGeo(D.dz * 1.1, D.dy * 1.4 * sz), M.fin); d.rotation.y = -Math.PI / 2; d.position.set(0, D.dy * 0.8, -D.dz * 0.05); group.add(d); }
  else if (t === "crest") { const d = new THREE.Mesh(finGeo(D.dz * 1.5, D.dy * 0.5 * sz), M.fin); d.rotation.y = -Math.PI / 2; d.position.set(0, D.dy * 0.85, -D.dz * 0.1); group.add(d); }
  else if (t === "spikes") {
    for (let i = 0; i < g.dorsal.n; i++) {
      const z = -D.dz * 0.35 + (i / Math.max(1, g.dorsal.n - 1)) * D.dz * 0.75;
      const yTop = D.dy * Math.sqrt(Math.max(0, 1 - (z / D.dz) ** 2));
      const sp = new THREE.Mesh(new THREE.ConeGeometry(D.S * 0.12, D.S * 0.6 * sz, 6), M.horn);
      sp.position.set(0, yTop * 0.95, z); group.add(sp);
    }
  }
}
function partPectorals(group, g, D, M, anim) {
  for (const side of [1, -1]) {
    const p = new THREE.Mesh(finGeo(D.S * 1.1 * g.pectoral, D.S * 0.7 * g.pectoral), M.fin);
    p.rotation.x = Math.PI / 2; p.rotation.y = side * 0.5;
    p.position.set(side * D.dx * 0.85, -D.dy * 0.1, D.dz * 0.25); p.scale.x = side;
    group.add(p); anim.pecs.push({ m: p, base: p.rotation.z, side });
  }
}
function partBellyFins(group, g, D, M) {
  for (let i = 0; i < g.bellyFins; i++) for (const side of [1, -1]) {
    const p = new THREE.Mesh(finGeo(D.S * 0.7, D.S * 0.5), M.fin);
    p.rotation.x = Math.PI / 2; p.position.set(side * D.dx * 0.5, -D.dy * 0.85, -D.dz * 0.1 - i * D.dz * 0.3); p.scale.x = side; group.add(p);
  }
}
function partSnout(group, g, D, M, anim) {
  const { S, dx, dy, dz } = D;
  if (g.snout === "jaws") {
    const jaw = new THREE.Group(); jaw.position.set(0, -dy * 0.15, dz * 0.8); group.add(jaw);
    const low = new THREE.Mesh(new THREE.ConeGeometry(S * 0.4, S * 0.8, 8), M.horn); low.rotation.x = Math.PI / 2; low.position.set(0, -dy * 0.05, S * 0.25); jaw.add(low);
    for (let i = 0; i < 6; i++) { const tooth = new THREE.Mesh(new THREE.ConeGeometry(S * 0.06, S * 0.22, 5), M.white); tooth.rotation.x = Math.PI / 2; tooth.position.set((-0.3 + i * 0.12) * S * 2, dy * 0.02, S * 0.45); jaw.add(tooth); }
    anim.jaw = jaw;
  } else if (g.snout === "beak") {
    const bk = new THREE.Mesh(new THREE.ConeGeometry(S * 0.32, S * 0.7, 8), M.horn); bk.rotation.x = Math.PI / 2; bk.position.set(0, -dy * 0.1, dz * 1.05); group.add(bk);
  } else if (g.snout === "whiskers") {
    for (const side of [1, -1]) { const wk = new THREE.Mesh(new THREE.CylinderGeometry(S * 0.03, S * 0.03, S * 1.1, 5), M.horn); wk.position.set(side * dx * 0.4, -dy * 0.3, dz * 0.9); wk.rotation.set(0.5, 0, side * 0.5); group.add(wk); }
  }
}
function partHorns(group, g, D, M) {
  for (let i = 0; i < g.horns; i++) {
    const z = D.dz * (0.4 - i * 0.25), yTop = D.dy * Math.sqrt(Math.max(0, 1 - (z / D.dz) ** 2));
    const hn = new THREE.Mesh(new THREE.ConeGeometry(D.S * 0.13, D.S * 0.7, 6), M.horn); hn.position.set(0, yTop * 0.95, z); hn.rotation.x = -0.4; group.add(hn);
  }
}
// NOUVELLE pièce : branchies (fentes derrière les yeux), suit la convention modulaire
function partGills(group, g, D, M) {
  for (const side of [1, -1]) for (let i = 0; i < 2; i++) {
    const gill = new THREE.Mesh(finGeo(D.S * 0.06, D.S * 0.5), M.horn);
    gill.rotation.set(0, side * Math.PI / 2.2, 0);
    gill.position.set(side * D.dx * 0.92, -D.dy * 0.05, D.dz * (0.35 - i * 0.12));
    group.add(gill);
  }
}
function partEyes(group, g, D, M) {
  const er = D.S * g.eyes.size;
  const mkEye = (x, y, z) => {
    const e = new THREE.Group();
    e.add(new THREE.Mesh(new THREE.SphereGeometry(er, 16, 16), M.white));
    const pup = new THREE.Mesh(new THREE.SphereGeometry(er * 0.5, 12, 12), M.dark); pup.position.set(0, 0, er * 0.7); e.add(pup);
    e.position.set(x, y, z); group.add(e);
  };
  if (g.eyes.stalk || g.eyes.count === 2) for (const side of [1, -1]) {
    const sx = side * D.dx * 0.45;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(er * 0.3, er * 0.3, D.dy * 0.9, 6), M.body); stalk.position.set(sx, D.dy * 0.9, D.dz * 0.3); group.add(stalk);
    mkEye(sx, D.dy * 1.35, D.dz * 0.3);
  } else for (const side of [1, -1]) mkEye(side * D.dx * 0.7, D.dy * 0.32, D.dz * 0.55);
}

export function buildCreature(g, S) {
  const sh = SH[g.bodyShape] || SH.normal;
  const D = { S, dx: S * sh.hx, dy: S * sh.hy * g.bodyH, dz: S * sh.len * (g.bodyLen || 1) };
  const group = new THREE.Group();
  const M = makeMaterials(g);
  const mats = Object.values(M);
  const anim = { tailPivot: null, pecs: [], jaw: null };

  const body = new THREE.Mesh(SPHERE, M.body); body.scale.set(D.dx, D.dy, D.dz); group.add(body);
  partTail(group, g, D, M, anim);
  partDorsal(group, g, D, M);
  partPectorals(group, g, D, M, anim);
  partBellyFins(group, g, D, M);
  partSnout(group, g, D, M, anim);
  partHorns(group, g, D, M);
  partGills(group, g, D, M);
  partEyes(group, g, D, M);

  return { group, M, mats, tailPivot: anim.tailPivot, pecs: anim.pecs, jaw: anim.jaw, dz: D.dz };
}
