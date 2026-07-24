// Real ring-system data for the four giant planets, sourced from Wikipedia
// (Rings of Jupiter / Rings of Saturn / Rings of Uranus / Rings of Neptune).
// Radii are stored as a multiple of the planet's own real equatorial radius, not km —
// this lets them scale with whichever display size the planet is currently rendered at
// (the "Visible" vs "Realistic" size toggle), the same convention data/planets.tsx
// already uses for structure.mantleRadius/atmosphereRadius.
//
// Real planet radii used for the km -> planet-radii conversion:
// Jupiter 71,398 km, Saturn 60,268 km, Uranus 25,556.6 km, Neptune 24,760.6 km.
//
// This covers each planet's most visually significant named rings/bands, not every
// named gap and ringlet (e.g. Saturn's Cassini Division subdivisions, or the individual
// Adams ring arcs) — those are documented in the planning appendix if finer subdivision
// is wanted later.

export type RingData = {
  name: string;
  innerRadius: number; // multiple of the planet's real radius
  outerRadius: number; // multiple of the planet's real radius
  color: string;
  opacity: number;
};

export const RINGS_BY_PLANET: Record<string, RingData[]> = {
  Jupiter: [
    { name: 'Halo', innerRadius: 1.288, outerRadius: 1.716, color: '#8a7864', opacity: 0.08 },
    { name: 'Main', innerRadius: 1.716, outerRadius: 1.807, color: '#a8967d', opacity: 0.22 },
    { name: 'Amalthea Gossamer', innerRadius: 1.807, outerRadius: 2.549, color: '#7a6a58', opacity: 0.05 },
    { name: 'Thebe Gossamer', innerRadius: 1.807, outerRadius: 3.165, color: '#6a5c4c', opacity: 0.03 },
  ],
  Saturn: [
    { name: 'D Ring', innerRadius: 1.110, outerRadius: 1.270, color: '#b8ab84', opacity: 0.10 },
    { name: 'C Ring', innerRadius: 1.239, outerRadius: 1.527, color: '#c2b491', opacity: 0.20 },
    { name: 'B Ring', innerRadius: 1.527, outerRadius: 1.951, color: '#e8dcb8', opacity: 0.55 },
    // Cassini Division (1.951-2.027) is a real gap — intentionally not filled.
    { name: 'A Ring', innerRadius: 2.027, outerRadius: 2.269, color: '#d9cca3', opacity: 0.45 },
    { name: 'F Ring', innerRadius: 2.323, outerRadius: 2.329, color: '#efe6cc', opacity: 0.35 },
    { name: 'G Ring', innerRadius: 2.754, outerRadius: 2.904, color: '#9a8f74', opacity: 0.06 },
    { name: 'E Ring', innerRadius: 2.987, outerRadius: 7.964, color: '#bcd6e6', opacity: 0.03 },
  ],
  Uranus: [
    { name: 'Zeta', innerRadius: 1.448, outerRadius: 1.546, color: '#5c6470', opacity: 0.05 },
    { name: '6', innerRadius: 1.6370, outerRadius: 1.6371, color: '#7a828c', opacity: 0.3 },
    { name: '5', innerRadius: 1.6529, outerRadius: 1.6530, color: '#7a828c', opacity: 0.3 },
    { name: '4', innerRadius: 1.6657, outerRadius: 1.6658, color: '#7a828c', opacity: 0.3 },
    { name: 'Alpha', innerRadius: 1.7499, outerRadius: 1.7502, color: '#828a94', opacity: 0.35 },
    { name: 'Beta', innerRadius: 1.7868, outerRadius: 1.7871, color: '#828a94', opacity: 0.35 },
    { name: 'Eta', innerRadius: 1.8458, outerRadius: 1.8459, color: '#7a828c', opacity: 0.3 },
    { name: 'Gamma', innerRadius: 1.8636, outerRadius: 1.8637, color: '#828a94', opacity: 0.35 },
    { name: 'Delta', innerRadius: 1.8899, outerRadius: 1.8901, color: '#828a94', opacity: 0.35 },
    { name: 'Lambda', innerRadius: 1.9575, outerRadius: 1.9576, color: '#7a828c', opacity: 0.25 },
    { name: 'Epsilon', innerRadius: 2.0002, outerRadius: 2.0025, color: '#8a929c', opacity: 0.45 },
    { name: 'Nu', innerRadius: 2.587, outerRadius: 2.735, color: '#5c6470', opacity: 0.04 },
    { name: 'Mu', innerRadius: 3.365, outerRadius: 4.031, color: '#5c6470', opacity: 0.04 },
  ],
  Neptune: [
    { name: 'Galle', innerRadius: 1.652, outerRadius: 1.733, color: '#5a6e8c', opacity: 0.06 },
    { name: 'Le Verrier', innerRadius: 2.1465, outerRadius: 2.1510, color: '#6a7e9c', opacity: 0.25 },
    { name: 'Lassell', innerRadius: 2.149, outerRadius: 2.310, color: '#5a6e8c', opacity: 0.05 },
    { name: 'Arago', innerRadius: 2.3095, outerRadius: 2.3105, color: '#6a7e9c', opacity: 0.2 },
    { name: 'Adams', innerRadius: 2.5410, outerRadius: 2.5423, color: '#7a8eac', opacity: 0.3 },
  ],
};

// Some real rings (Uranus's narrow ringlets, Neptune's Le Verrier/Arago/Adams) are only a
// few km wide in reality — a few ten-thousandths of the planet's radius. Rendered at true
// scale that's sub-pixel, so give every ring a minimum visible thickness at render time
// (see Rings.tsx) rather than inflating the source data itself.
export const MIN_RING_THICKNESS = 0.006;
