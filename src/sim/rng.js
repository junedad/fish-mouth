// Helpers aléatoires/maths — portés verbatim de l'index.html d'origine.
export const rnd = (a, b) => a + Math.random() * (b - a);
export const ri = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const blendHue = (a, b) => { const d = ((b - a + 540) % 360) - 180; return (a + d * rnd(0.35, 0.65) + rnd(-12, 12) + 360) % 360; };
export const blend = (a, b, m) => a + (b - a) * rnd(0.35, 0.65) + rnd(-m, m);
