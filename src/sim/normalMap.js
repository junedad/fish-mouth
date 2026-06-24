import * as THREE from "three";

// Carte de normales d'écailles, générée UNE fois sur un canvas (hauteur → normales via Sobel),
// partagée par tous les poissons (détail tangent, indépendant du génome).
let cached = null;

export function scaleNormalMap() {
  if (cached) return cached;
  const N = 256, c = document.createElement("canvas"); c.width = c.height = N;
  const x = c.getContext("2d");

  // 1) champ de hauteur : rangées d'écailles en arcs qui se chevauchent
  x.fillStyle = "#808080"; x.fillRect(0, 0, N, N);
  const cols = 14, rows = 10, sw = N / cols, sh = N / rows;
  for (let r = 0; r < rows; r++) {
    for (let i = -1; i < cols; i++) {
      const cx = i * sw + (r % 2 ? sw / 2 : 0) + sw / 2;
      const cy = r * sh + sh * 0.5;
      const g = x.createRadialGradient(cx, cy - sh * 0.2, 1, cx, cy, sw * 0.75);
      g.addColorStop(0, "#f2f2f2"); g.addColorStop(0.7, "#9a9a9a"); g.addColorStop(1, "#5a5a5a");
      x.fillStyle = g;
      x.beginPath(); x.ellipse(cx, cy, sw * 0.62, sh * 0.7, 0, Math.PI, 2 * Math.PI); x.fill();
    }
  }

  // 2) hauteur (canal) → normales (Sobel), avec wrap horizontal/vertical pour le tuilage
  const src = x.getImageData(0, 0, N, N).data;
  const out = x.createImageData(N, N), d = out.data;
  const H = (px, py) => src[(((py + N) % N) * N + ((px + N) % N)) * 4] / 255;
  const strength = 2.2;
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const dx = (H(px - 1, py) - H(px + 1, py)) * strength;
    const dy = (H(px, py - 1) - H(px, py + 1)) * strength;
    const len = Math.hypot(dx, dy, 1);
    const o = (py * N + px) * 4;
    d[o] = (dx / len * 0.5 + 0.5) * 255;
    d[o + 1] = (dy / len * 0.5 + 0.5) * 255;
    d[o + 2] = (1 / len * 0.5 + 0.5) * 255;
    d[o + 3] = 255;
  }
  x.putImageData(out, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 3);
  cached = tex;
  return tex;
}
