import { asteroids } from './asteroids';

// Solar-system body groupings by region, shared by orbit coloring and the
// object-visibility menu so both stay in sync with a single source of truth.
export const INNER_PLANETS = new Set(['Mercury', 'Venus', 'Earth', 'Mars']);
// Ceres lives in data/dwarfPlanets.ts (it's IAU-classified as a dwarf planet); everything
// else here comes straight from data/asteroids.ts so this set can't drift out of sync as
// more asteroids are added.
export const ASTEROID_BELT_BODIES = new Set(['Ceres', ...asteroids.map(a => a.name)]);
export const OUTER_PLANETS = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune']);
// Everything else in dwarfPlanets (Pluto, Eris, Haumea, Makemake) is trans-Neptunian.

// Orbit line color by solar-system region.
export const REGION_COLORS = {
  inner: '#e8935a',        // Mercury, Venus, Earth, Mars — rocky, close to the Sun
  asteroidBelt: '#9a8a7a', // Ceres — rocky debris between Mars and Jupiter
  outer: '#5fb8e8',        // Jupiter, Saturn, Uranus, Neptune — gas/ice giants
  transNeptunian: '#b39ddb', // Pluto, Eris, Haumea, Makemake — icy, beyond Neptune
} as const;
