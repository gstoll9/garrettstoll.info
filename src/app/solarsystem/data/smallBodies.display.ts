// Turns the generated smallBodyRecords (data/smallBodies.ts) into the same body shape as
// data/asteroids.ts / data/dwarfPlanets.ts, so they render and focus through Planet.tsx.
//
// Real: orbits (JPL SBDB, epoch-anchored), diameters and albedos (Wikipedia infoboxes).
// Illustrative: the per-category tint (only brightness follows the real albedo) and the
// display `size` curve, which matches the existing bodies' (Ceres 0.2, Vesta ~0.15, Pluto ~0.3).

import { smallBodyRecords, SmallBodyCategory } from './smallBodies';

const distanceFactor = 12; // 1 AU = 12 units, matching data/planets.tsx
const yearInSeconds = 365.25 * 24 * 60 * 60;
const EARTH_DIAMETER_KM = 12742;

// "Simplified distance" mode: interpolate on the planets' (real a, evenly-spaced radius)
// pairs, continuing logarithmically past Neptune (Pluto/Eris sit at 80/88 there).
const SIMPLIFIED_KNOTS: [number, number][] = [
  [0, 0], [0.387, 8], [0.723, 16], [1, 24], [1.524, 32], [5.204, 48], [9.583, 56], [19.191, 64], [30.07, 72],
];
export function simplifiedRadius(aAU: number): number {
  for (let k = 1; k < SIMPLIFIED_KNOTS.length; k++) {
    const [a0, s0] = SIMPLIFIED_KNOTS[k - 1];
    const [a1, s1] = SIMPLIFIED_KNOTS[k];
    if (aAU <= a1) return s0 + ((aAU - a0) / (a1 - a0)) * (s1 - s0);
  }
  return 72 + 8 * Math.log2(aAU / 30.07);
}

const CATEGORY_TINT: Record<SmallBodyCategory, [number, number, number]> = {
  'near-earth': [0.66, 0.62, 0.56],
  trojan: [0.62, 0.47, 0.36],
  centaur: [0.66, 0.5, 0.4], // centaurs/TNOs are often distinctly red
  dwarf: [0.8, 0.68, 0.58],
  kuiper: [0.76, 0.62, 0.52],
  scattered: [0.72, 0.62, 0.55],
  detached: [0.8, 0.56, 0.44], // Sedna is one of the reddest objects known
};

function colorFor(category: SmallBodyCategory, albedo: number | null): string {
  const k = Math.min(1.3, Math.max(0.6, Math.sqrt((albedo ?? 0.1) / 0.15)));
  const hex = (v: number) => Math.round(Math.min(1, v * k) * 255).toString(16).padStart(2, '0');
  const [r, g, b] = CATEGORY_TINT[category];
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// Moons (data/moonElements.ts) of the dwarf planets that live in this list
const MOONS: Record<string, string[]> = { Quaoar: ['Weywot'], Orcus: ['Vanth'], Salacia: ['Actaea'] };

export const smallBodies = smallBodyRecords.map((b) => {
  const d = b.diameterKm ?? 1;
  return {
    name: b.name,
    category: b.category,
    moons: MOONS[b.name],
    color: colorFor(b.category, b.albedo),
    size: Math.min(0.3, Math.max(0.02, 0.0065 * Math.sqrt(d))),
    realDiameter: d / EARTH_DIAMETER_KM,
    orbitData: {
      semimajorAxis: b.a * distanceFactor,
      semimajorAxisSimplified: simplifiedRadius(b.a),
      eccentricity: b.e,
      inclination: b.i,
      longitudeOfAscendingNode: b.node,
      argumentOfPerihelion: b.peri,
      meanAnomaly: b.meanAnomaly,
      orbitalPeriod: Math.pow(b.a, 1.5) * yearInSeconds,
      epochMs: (b.epochJd - 2440587.5) * 86400000,
    },
  };
});

export const smallBodyNames = (category: SmallBodyCategory) =>
  smallBodies.filter((b) => b.category === category).map((b) => b.name);
