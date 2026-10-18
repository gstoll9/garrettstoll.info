// Local Group galaxies, real data sourced from Wikipedia (Local Group + each galaxy's own
// article — see the planning appendix for exact citations). This is intentionally limited to
// the Local Group: superclusters/filaments are deferred until a real (not illustrative)
// large-scale-structure dataset is identified, per the approved plan.
//
// Position is derived from real RA/Dec + distance via the standard equatorial-to-Cartesian
// conversion, with the Milky Way at the origin — no source gave galactic longitude/latitude
// directly, so this (not a literal read-off-the-page value) is the one derived figure here.

export type GalaxyData = {
  name: string;
  distanceKpc: number;
  type: string;
  raHours: number; // right ascension, hours
  decDegrees: number; // declination, degrees
  color: string;
  size: number; // display radius
};

export const galaxies: GalaxyData[] = [
  { name: 'Milky Way', distanceKpc: 0, type: 'SBbc spiral (us)', raHours: 0, decDegrees: 0, color: '#fff6d8', size: 3 },
  { name: 'Andromeda (M31)', distanceKpc: 765, type: 'SA(s)b barred spiral', raHours: 0 + 42 / 60 + 44.3 / 3600, decDegrees: 41 + 16 / 60 + 9 / 3600, color: '#cfe0ff', size: 2.6 },
  { name: 'Triangulum (M33)', distanceKpc: 883, type: 'SA(s)cd spiral', raHours: 1 + 33 / 60 + 50.02 / 3600, decDegrees: 30 + 39 / 60 + 36.7 / 3600, color: '#cfe0ff', size: 1.8 },
  { name: 'Large Magellanic Cloud', distanceKpc: 50, type: 'SB(s)m dwarf spiral', raHours: 5 + 23 / 60 + 34 / 3600, decDegrees: -(69 + 45.4 / 60), color: '#ffe6cf', size: 1.2 },
  { name: 'Small Magellanic Cloud', distanceKpc: 62.44, type: 'SB(s)m pec dwarf irregular', raHours: 0 + 52 / 60 + 44.8 / 3600, decDegrees: -(72 + 49 / 60 + 43 / 3600), color: '#ffe6cf', size: 0.9 },
  { name: 'Sagittarius Dwarf Spheroidal', distanceKpc: 24.645, type: 'dSph', raHours: 18 + 55 / 60 + 19.5 / 3600, decDegrees: -(30 + 32 / 60 + 43 / 3600), color: '#e8d8ff', size: 0.6 },
  { name: 'Draco Dwarf', distanceKpc: 75.4, type: 'dSph', raHours: 17 + 20 / 60 + 12.4 / 3600, decDegrees: 57 + 54 / 60 + 55 / 3600, color: '#e8d8ff', size: 0.4 },
  { name: 'Sculptor Dwarf', distanceKpc: 85.8, type: 'dSph', raHours: 1 + 0 / 60 + 9.3 / 3600, decDegrees: -(33 + 42 / 60 + 33 / 3600), color: '#e8d8ff', size: 0.4 },
  { name: 'IC 10', distanceKpc: 750, type: 'dIrr starburst', raHours: 0 + 20 / 60 + 17.29 / 3600, decDegrees: 59 + 18 / 60 + 13.9 / 3600, color: '#ffd8d8', size: 0.7 },
  { name: 'NGC 6822', distanceKpc: 500, type: 'IB(s)m barred irregular', raHours: 19 + 44 / 60 + 57.70 / 3600, decDegrees: -(14 + 48 / 60 + 12 / 3600), color: '#ffd8d8', size: 0.8 },
  { name: 'Leo I', distanceKpc: 250, type: 'dSph', raHours: 10 + 8 / 60 + 27.4 / 3600, decDegrees: 12 + 18 / 60 + 27 / 3600, color: '#e8d8ff', size: 0.5 },
];

// Scene scale: kpc -> scene units. Chosen so the Local Group spans a comfortable camera
// range (Andromeda/Triangulum/IC10 land around 75-90 units out) without needing the
// planetary scene's AU-based units, which would be meaningless at this scale.
export const SCENE_UNITS_PER_KPC = 0.1;

export function galaxyPosition(g: GalaxyData): [number, number, number] {
  if (g.distanceKpc === 0) return [0, 0, 0];
  const raRad = (g.raHours * 15) * (Math.PI / 180);
  const decRad = g.decDegrees * (Math.PI / 180);
  const d = g.distanceKpc * SCENE_UNITS_PER_KPC;
  const x = d * Math.cos(decRad) * Math.cos(raRad);
  const z = d * Math.cos(decRad) * Math.sin(raRad);
  const y = d * Math.sin(decRad);
  return [x, y, z];
}
