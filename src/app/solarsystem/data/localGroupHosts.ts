// Hand-curated companions to the generated data/localGroup.ts catalog.
//
// McConnachie's catalog is a census of the Local Group's *satellites*: it has no row for
// the Milky Way (the reference frame) or Andromeda, and it gives no half-light radius /
// orientation for the three large disky members it does list (M33, LMC, SMC). Those come
// from here instead, each value with its source:
//
//   Milky Way  disk diameter 87,400 ly = 26.8 kpc (Wikipedia, "Milky Way"); Sun 8.178 kpc
//              from the Galactic Centre and 20.8 pc above the plane (GRAVITY Collaboration
//              2019; Bennett & Bovy 2019); central bar ~27° from the Sun–centre line
//              (Wegg, Gerhard & Portail 2015); M_V ≈ -20.9 (Bland-Hawthorn & Gerhard 2016).
//   Andromeda  RA 00h42m44.3s, Dec +41°16'09", 765 kpc, diameter 152,000 ly = 46.6 kpc,
//              M_V = -21.5 (Wikipedia, "Andromeda Galaxy"); disk inclination 77°, major-axis
//              PA 38° (de Vaucouleurs 1958, as quoted there).
//   M33        diameter 61,100 ly = 18.7 kpc (Wikipedia, "Triangulum Galaxy"); inclination
//              ~54°, PA ~23° (Corbelli & Salucci 2000).
//   LMC        diameter 32,200 ly = 9.9 kpc (Wikipedia, "Large Magellanic Cloud"); disk
//              inclination 34.7°, line-of-nodes PA 129.9° (van der Marel & Cioni 2001).
//   SMC        diameter 18,900 ly = 5.8 kpc (Wikipedia, "Small Magellanic Cloud"); no
//              well-defined disk, so it's drawn as a spheroid.
//
// LMC/SMC absolute magnitudes (-18.1 / -16.8) are McConnachie 2012's own Table values: the
// generator's Schlegel-map extinction correction is unreliable toward the Clouds themselves
// (the maps saturate there) and over-brightens them by ~2-3 mag.
//
// Spiral-arm patterns are NOT measured data — arm count/pitch only make the disks read as
// spirals. Everything that sets where and how big things are (position, distance, disk
// extent, inclination, orientation, luminosity) is from the sources above.

export type DiskSpec = {
  diameterKpc: number;
  inclinationDeg: number; // 0 = face-on as seen from the Sun
  positionAngleDeg: number; // major axis on the sky, deg east of north
  absMagV: number;
  arms: number; // illustrative
  pitchDeg: number; // illustrative
  bulgeFraction: number; // share of particles in the central bulge/bar
  barLengthKpc?: number;
};

export const MILKY_WAY = {
  name: 'Milky Way',
  diameterKpc: 26.8,
  sunGalactocentricKpc: 8.178,
  sunHeightKpc: 0.0208,
  barAngleDeg: 27,
  barLengthKpc: 5,
  absMagV: -20.9,
  arms: 4,
  pitchDeg: 12,
  bulgeFraction: 0.18,
};

export const ANDROMEDA = {
  name: 'Andromeda (M31)',
  raDeg: (0 + 42 / 60 + 44.3 / 3600) * 15,
  decDeg: 41 + 16 / 60 + 9 / 3600,
  distanceKpc: 765,
  disk: {
    diameterKpc: 46.6,
    inclinationDeg: 77,
    positionAngleDeg: 38,
    absMagV: -21.5,
    arms: 2,
    pitchDeg: 8,
    bulgeFraction: 0.3,
  } as DiskSpec,
};

// Keyed by the generated catalog's `catalogName`.
export const DISK_OVERRIDES: Record<string, DiskSpec> = {
  Triangulum: {
    diameterKpc: 18.7,
    inclinationDeg: 54,
    positionAngleDeg: 23,
    absMagV: -18.97,
    arms: 2,
    pitchDeg: 20,
    bulgeFraction: 0.06,
  },
  LMC: {
    diameterKpc: 9.9,
    inclinationDeg: 34.7,
    positionAngleDeg: 129.9,
    absMagV: -18.1,
    arms: 1,
    pitchDeg: 25,
    bulgeFraction: 0.22,
    barLengthKpc: 3,
  },
};

// Spheroids the catalog lists without a half-light radius / with an unreliable magnitude.
// A quarter of the quoted diameter stands in for the half-light radius (an approximation,
// not a fitted value).
export const SPHEROID_OVERRIDES: Record<string, { halfLightKpc: number; absMagV?: number }> = {
  SMC: { halfLightKpc: 5.8 / 4, absMagV: -16.8 },
};
