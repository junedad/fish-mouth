// Génome héritable (système de pièces modulaire façon Spore) — porté verbatim.
import { rnd, ri, pick, clamp, blendHue, blend } from "./rng.js";

export function randomGenome(baseHue, diet) {
  diet = diet || (Math.random() < 0.62 ? "herbivore" : "predator"); // plus de proies que de prédateurs
  const pred = diet === "predator";
  const hue = baseHue == null ? rnd(0, 360) : (baseHue + rnd(-22, 22) + 360) % 360;
  return {
    diet, hue, finHue: (hue + ri(20, 80)) % 360, markHue: (hue + ri(140, 200)) % 360,
    bodyShape: pred ? pick(["arrow", "long", "teardrop"]) : pick(["round", "flat", "normal", "teardrop"]),
    bodyH: pred ? rnd(0.68, 0.95) : rnd(0.92, 1.2),
    bodyLen: pred ? rnd(1.0, 1.3) : rnd(0.85, 1.05),
    tail: { type: pred ? pick(["forked", "lunate", "pointy"]) : pick(["fan", "round", "forked"]), size: rnd(0.85, 1.35) },
    dorsal: { type: pick(pred ? ["spikes", "crest", "none"] : ["sail", "crest", "none"]), size: rnd(0.8, 1.5), n: ri(3, 6) },
    pectoral: rnd(0.85, 1.25),
    eyes: { count: Math.random() < 0.35 ? 2 : 1, size: rnd(0.18, 0.32) * (pred ? 0.85 : 1.1), stalk: Math.random() < 0.3 },
    snout: pred ? "jaws" : pick(["none", "none", "beak", "whiskers"]),
    horns: pred ? ri(0, 1) : ri(0, 2), bellyFins: ri(0, 2),
    pattern: pick(["stripes", "spots", "plain", "reticulated"]), spotN: ri(5, 12),
  };
}

export function crossover(A, B) {
  const g = {};
  for (const k of ["bodyShape", "tail", "dorsal", "eyes", "pattern", "diet"]) g[k] = Math.random() < 0.5 ? A[k] : B[k];
  for (const k of ["horns", "bellyFins", "spotN"]) g[k] = Math.max(0, (Math.random() < 0.5 ? A[k] : B[k]) + (Math.random() < 0.18 ? ri(-1, 1) : 0));
  g.hue = blendHue(A.hue, B.hue);
  g.finHue = (g.hue + ri(20, 80)) % 360; g.markHue = (g.hue + ri(140, 200)) % 360;
  g.bodyH = clamp(blend(A.bodyH, B.bodyH, 0.05), 0.65, 1.2);
  g.bodyLen = clamp(blend(A.bodyLen, B.bodyLen, 0.05), 0.8, 1.35);
  g.pectoral = clamp(blend(A.pectoral, B.pectoral, 0.05), 0.8, 1.3);
  g.snout = g.diet === "predator" ? "jaws" : (A.snout === "jaws" ? "none" : pick([A.snout, B.snout]));
  return g;
}
