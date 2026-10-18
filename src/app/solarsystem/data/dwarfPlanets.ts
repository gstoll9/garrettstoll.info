// The 5 IAU-recognized dwarf planets, real orbital elements sourced from Wikipedia
// (see the planning appendix for exact citations). Pluto has real ephemeris via
// astronomy-engine (Body.Pluto, see REAL_LIVE_BODIES in utils.tsx) so its orbitData
// below is only used for the "simplified/evenly-spaced" distance mode and the static
// orbit-path line, not its real-time position. Ceres/Eris/Haumea/Makemake have no
// library support, so they use the epoch-anchored Kepler branch in orbitalPosition()
// (see `epochMs` below) for real-time-accurate position.

const distanceFactor = 12; // 1 AU = 12 units, matching data/planets.tsx
const yearInSeconds = 365.25 * 24 * 60 * 60; // Julian year, for orbitalPeriod (real seconds)

export const dwarfPlanets = [
  {
    name: 'Pluto',
    color: '#c9b29b',
    size: 0.3,
    realDiameter: 0.1865, // 2 * 1,188.3 km / Earth diameter (12,742 km)
    orbitData: {
      semimajorAxis: 39.482 * distanceFactor,
      semimajorAxisSimplified: 10 * 8,
      eccentricity: 0.2488,
      inclination: 17.16,
      longitudeOfAscendingNode: 110.299,
      argumentOfPerihelion: 113.834,
      meanAnomaly: 14.53,
      orbitalPeriod: 247.94 * yearInSeconds,
      epochMs: Date.UTC(2000, 0, 1, 12), // J2000
    },
  },
  {
    name: 'Ceres',
    color: '#9c9c9c',
    size: 0.2,
    realDiameter: 0.0737, // 2 * 469.7 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.77 * distanceFactor,
      semimajorAxisSimplified: 4.5 * 8,
      eccentricity: 0.0785,
      inclination: 10.6,
      longitudeOfAscendingNode: 80.3,
      argumentOfPerihelion: 73.6,
      meanAnomaly: 291.4,
      orbitalPeriod: 4.60 * yearInSeconds,
      epochMs: Date.UTC(2022, 0, 21), // JD 2459600.5
    },
  },
  {
    name: 'Eris',
    color: '#d8d8d8',
    size: 0.3,
    realDiameter: 0.1825, // 2 * 1,163 km / 12,742 km
    orbitData: {
      semimajorAxis: 67.69 * distanceFactor,
      semimajorAxisSimplified: 11 * 8,
      eccentricity: 0.44,
      inclination: 44.18,
      longitudeOfAscendingNode: 36.02,
      argumentOfPerihelion: 151.66,
      meanAnomaly: 205.11,
      orbitalPeriod: 560.7 * yearInSeconds,
      epochMs: Date.UTC(2025, 10, 21), // JD 2461000.5
    },
  },
  {
    name: 'Haumea',
    color: '#e6e6e6',
    size: 0.3,
    realDiameter: 0.2423, // 2 * 1,544 km (mean/equivalent radius; Haumea is triaxial) / 12,742 km
    orbitData: {
      semimajorAxis: 43.116 * distanceFactor,
      semimajorAxisSimplified: 10.5 * 8,
      eccentricity: 0.19642,
      inclination: 28.2137,
      longitudeOfAscendingNode: 122.167,
      argumentOfPerihelion: 239.041,
      meanAnomaly: 218.205,
      orbitalPeriod: 283.12 * yearInSeconds,
      epochMs: Date.UTC(2020, 11, 17), // JD 2459200.5
    },
  },
  {
    name: 'Makemake',
    color: '#a8593c',
    size: 0.25,
    realDiameter: 0.1122, // 2 * 715 km / 12,742 km
    orbitData: {
      semimajorAxis: 45.499 * distanceFactor,
      semimajorAxisSimplified: 10.8 * 8,
      eccentricity: 0.1604,
      inclination: 29.002,
      longitudeOfAscendingNode: 79.441,
      argumentOfPerihelion: 296.065,
      meanAnomaly: 170.497,
      orbitalPeriod: 306.70 * yearInSeconds,
      epochMs: Date.UTC(2025, 10, 21), // JD 2461000.5
    },
  },
];
