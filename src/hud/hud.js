// HUD 2D dessiné sur un canvas DOM brut (pas React). Lit l'état depuis le world.
export function drawHUD(world, hctx, hud, t, dt) {
  const { faces, hearts, creatures, toScreen } = world;
  hctx.clearRect(0, 0, hud.width, hud.height);

  for (const fc of faces) {
    const H = fc.hue;
    hctx.strokeStyle = `hsl(${H} 85% 60% / ${fc.open ? 0.85 : 0.4})`;
    hctx.lineWidth = fc.open ? 3 : 2; hctx.beginPath();
    if (hctx.roundRect) hctx.roundRect(fc.x, fc.y, fc.w, fc.h, 16); else hctx.rect(fc.x, fc.y, fc.w, fc.h);
    hctx.stroke();
    hctx.fillStyle = `hsl(${H} 85% 65%)`; hctx.font = "13px sans-serif";
    hctx.fillText("Humain " + fc.num, fc.x + 6, fc.y - 6);
    if (fc.egg) {
      const r = fc.egg.r * (1 + Math.sin(t * 12) * 0.06);
      hctx.fillStyle = `hsl(${H} 85% 70% / .28)`; hctx.beginPath(); hctx.arc(fc.egg.x, fc.egg.y, r, 0, 7); hctx.fill();
      hctx.strokeStyle = `hsl(${H} 90% 65%)`; hctx.lineWidth = 2; hctx.beginPath(); hctx.arc(fc.egg.x, fc.egg.y, r, 0, 7); hctx.stroke();
    }
  }

  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i]; h.age += dt; h.pos.y += dt * 3;
    if (h.age > 1.6) { hearts.splice(i, 1); continue; }
    const [sx, sy] = toScreen(h.pos);
    hctx.globalAlpha = 1 - h.age / 1.6; hctx.font = "28px sans-serif"; hctx.fillText(h.emoji || "💞", sx - 14, sy); hctx.globalAlpha = 1;
  }

  let herb = 0, pred = 0; for (const c of creatures) { if (c.g.diet === "predator") pred++; else herb++; }
  hctx.font = "15px sans-serif"; hctx.textAlign = "right";
  hctx.fillStyle = "#bfe6c0"; hctx.fillText("🌿 " + herb, hud.width - 60, 26);
  hctx.fillStyle = "#ffb0a0"; hctx.fillText("🦈 " + pred, hud.width - 14, 26);
  hctx.textAlign = "left";
}
