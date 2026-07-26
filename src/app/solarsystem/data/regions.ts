// Solar-system body groupings by region, shared by orbit coloring and the
// object-visibility menu so both stay in sync with a single source of truth.
export const INNER_PLANETS = new Set(['Mercury', 'Venus', 'Earth', 'Mars']);
export const ASTEROID_BELT_BODIES = new Set(['Ceres']);
export const OUTER_PLANETS = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune']);
// Everything else in dwarfPlanets (Pluto, Eris, Haumea, Makemake) is trans-Neptunian.

// Orbit line color by solar-system region.
export const REGION_COLORS = {
  inner: '#e8935a',        // Mercury, Venus, Earth, Mars — rocky, close to the Sun
  asteroidBelt: '#9a8a7a', // Ceres — rocky debris between Mars and Jupiter
  outer: '#5fb8e8',        // Jupiter, Saturn, Uranus, Neptune — gas/ice giants
  transNeptunian: '#b39ddb', // Pluto, Eris, Haumea, Makemake — icy, beyond Neptune
} as const;
