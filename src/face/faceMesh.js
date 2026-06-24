import { randomGenome } from "../sim/genome.js";
import { clamp } from "../sim/rng.js";

// Détection bouche (≤4 visages, identité + couleur). FaceMesh = global UMD (window.FaceMesh).
// Met à jour world.faces (pour le HUD) et appelle world.spawnAt à l'éclosion.
export function setupFaceMesh(world) {
  const FaceMesh = window.FaceMesh;
  const vid = document.getElementById("vid");
  const msg = document.getElementById("msg");
  if (!FaceMesh) { console.warn("FaceMesh global absent"); return () => {}; }

  const humans = []; let nextId = 0;
  const PALETTE = [8, 45, 130, 200, 280, 330, 95, 250];
  const GROW = 8, MAXR = 120, MATCH = 0.22, FORGET = 30;

  const mesh = new FaceMesh({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
  mesh.setOptions({ maxNumFaces: 4, refineLandmarks: false, minDetectionConfidence: .5, minTrackingConfidence: .5 });

  mesh.onResults(r => {
    try {
      const list = r.multiFaceLandmarks || [];
      if (msg) msg.style.display = list.length ? "none" : "block";
      const dets = list.map(lm => {
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        for (const p of lm) { const sx = 1 - p.x; if (sx < minX) minX = sx; if (sx > maxX) maxX = sx; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }
        const a = lm[13], b = lm[14], top = lm[10], bot = lm[152], valid = a && b && top && bot;
        const ratio = valid ? Math.abs(a.y - b.y) / Math.abs(top.y - bot.y) : 0;
        return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, ratio, isOpen: valid && ratio > 0.12,
          mx: valid ? (1 - (a.x + b.x) / 2) * innerWidth : 0, my: valid ? (a.y + b.y) / 2 * innerHeight : 0 };
      });
      for (const h of humans) h.seen = false;
      for (const d of dets) {
        let best = null, bd = MATCH;
        for (const h of humans) { if (h.seen) continue; const dist = Math.hypot(h.cx - d.cx, h.cy - d.cy); if (dist < bd) { bd = dist; best = h; } }
        if (!best) { const id = nextId++; best = { id, hue: PALETTE[id % PALETTE.length], wasOpen: false, egg: null }; humans.push(best); }
        best.seen = true; best.miss = 0; best.cx = d.cx; best.cy = d.cy; d.h = best;
        best.sm = best.sm == null ? d.ratio : best.sm * 0.5 + d.ratio * 0.5;
        const open = best.wasOpen ? best.sm > 0.09 : best.sm > 0.15;
        d.open = open;
        if (open) { if (!best.egg) best.egg = { x: d.mx, y: d.my, growth: 0 }; best.egg.growth += d.ratio; best.egg.x = d.mx; best.egg.y = d.my; }
        else if (best.wasOpen && best.egg) {
          const size = clamp(16 + best.egg.growth * GROW, 16, MAXR);
          world.spawnAt(world.screenToWorld(best.egg.x, best.egg.y), { size, genome: randomGenome(best.hue) });
          best.egg = null;
        }
        best.wasOpen = open;
      }
      for (let i = humans.length - 1; i >= 0; i--) { if (humans[i].seen) continue; if ((humans[i].miss = (humans[i].miss || 0) + 1) > FORGET) humans.splice(i, 1); }
      world.faces = dets.map(d => {
        const er = d.h.egg ? Math.min(MAXR, 16 + d.h.egg.growth * GROW) : 0;
        return { x: d.minX * innerWidth, y: d.minY * innerHeight, w: (d.maxX - d.minX) * innerWidth, h: (d.maxY - d.minY) * innerHeight,
          open: d.open, hue: d.h.hue, num: humans.indexOf(d.h) + 1, egg: d.h.egg ? { x: d.h.egg.x, y: d.h.egg.y, r: er } : null };
      });
    } catch (e) { console.warn("onResults", e); }
  });

  let stopped = false;
  (async () => {
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      vid.srcObject = cam; await vid.play();
      (function pump() { if (stopped) return; mesh.send({ image: vid }).catch(() => {}).then(() => requestAnimationFrame(pump)); })();
    } catch (e) { console.warn("webcam", e); if (msg) msg.textContent = "Autorise la webcam pour faire éclore des poissons 🐟"; }
  })();

  return () => { stopped = true; };
}
