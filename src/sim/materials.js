import * as THREE from "three";
import { rnd } from "./rng.js";
import { scaleNormalMap } from "./normalMap.js";

// Albédo par génome (couleur/motifs) — porté de bodyTexture() d'origine.
function bodyTexture(g) {
  const c = document.createElement("canvas"); c.width = 128; c.height = 64;
  const x = c.getContext("2d");
  x.fillStyle = `hsl(${g.hue} 72% 52%)`; x.fillRect(0, 0, 128, 64);
  const grad = x.createLinearGradient(0, 0, 0, 64); // contre-ombrage ventre
  grad.addColorStop(0, `hsl(${g.hue} 75% 40%)`); grad.addColorStop(1, `hsl(${g.hue} 65% 82%)`);
  x.fillStyle = grad; x.globalAlpha = 0.55; x.fillRect(0, 0, 128, 64); x.globalAlpha = 1;
  x.fillStyle = `hsl(${g.markHue} 70% 50%)`; x.strokeStyle = `hsl(${g.markHue} 70% 45%)`;
  if (g.pattern === "stripes") { for (let i = 0; i < 7; i++) x.fillRect(8 + i * 18, 0, 7, 64); }
  else if (g.pattern === "spots") { for (let i = 0; i < g.spotN; i++) { x.beginPath(); x.arc(rnd(0, 128), rnd(0, 64), rnd(3, 6), 0, 7); x.fill(); } }
  else if (g.pattern === "reticulated") { x.lineWidth = 2; for (let i = -64; i < 128; i += 14) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, 64); x.stroke(); x.beginPath(); x.moveTo(i + 64, 0); x.lineTo(i, 64); x.stroke(); } }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

// Injecte une onde d'épine : déplacement latéral (X) en fonction de l'axe corps (Z local, tête +1 → queue -1).
// L'amplitude croît vers la queue (la tête reste quasi fixe). Capture le shader pour piloter uTime/uSpeed.
function addUndulation(mat, phase, amp) {
  mat.onBeforeCompile = shader => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uSpeed = { value: 4 };
    shader.uniforms.uPhase = { value: phase };
    shader.uniforms.uAmp = { value: amp };
    shader.uniforms.uK = { value: 3.4 };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
        uniform float uTime, uSpeed, uPhase, uAmp, uK;
        float undW(float z){ float t = clamp((1.0 - z) * 0.5, 0.0, 1.0); return t * t; }`)
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
        { float w = undW(position.z);
          float slope = cos(uTime * uSpeed + uPhase + position.z * uK) * uAmp * uK * w;
          objectNormal = normalize(objectNormal - vec3(slope, 0.0, 0.0)); }`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        transformed.x += sin(uTime * uSpeed + uPhase + position.z * uK) * uAmp * undW(position.z);`);
    mat.userData.shader = shader;
  };
}

// Matériaux PBR "poisson mouillé" pour un génome.
export function makeMaterials(g) {
  const normalMap = scaleNormalMap();
  const phase = rnd(0, 10);
  const sheenColor = new THREE.Color(`hsl(${(g.hue + 160) % 360}, 60%, 70%)`);

  const body = new THREE.MeshPhysicalMaterial({
    map: bodyTexture(g),
    normalMap, normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.35, metalness: 0.0,
    clearcoat: 1.0, clearcoatRoughness: 0.12,
    sheen: 0.5, sheenRoughness: 0.5, sheenColor,
    envMapIntensity: 1.0,
  });
  addUndulation(body, phase, 0.45);

  const fin = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(`hsl(${g.finHue}, 80%, 56%)`),
    roughness: 0.4, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.3,
    transmission: 0.4, thickness: 0.6, ior: 1.33,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    envMapIntensity: 1.0,
  });
  const horn = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(`hsl(${g.finHue}, 80%, 44%)`), roughness: 0.45, clearcoat: 0.5 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.12, clearcoat: 1.0, clearcoatRoughness: 0.05 });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x0a0a14, roughness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.05 });

  return { body, fin, horn, white, dark };
}

// Appelé par frame depuis stepCreature : avance l'onde, fréquence/ampleur liées à la vitesse de nage.
export function setUndulation(M, t, speed) {
  const sh = M.body.userData.shader;
  if (!sh) return; // shader pas encore compilé (1ère frame)
  sh.uniforms.uTime.value = t;
  sh.uniforms.uSpeed.value = 3 + Math.min(12, speed) * 0.5;
}
