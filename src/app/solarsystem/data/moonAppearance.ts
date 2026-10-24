// Hand-curated look of each moon, paired with the generated data/moonElements.ts (orbits +
// mean radii from JPL).
//
//   triaxialRadiiKm  Best-fit ellipsoid (a ≥ b ≥ c; a points at the planet, c along the spin
//                    axis) from the IAU WGCCRE 2015 report (Archinal et al. 2018), given only
//                    for the visibly non-spherical moons; others are drawn as spheres at JPL's
//                    mean radius.
//   geometricAlbedo  Wikipedia infobox values. Drives how bright the surface is drawn.
//   color            Approximate true-colour tint (NOT measured data) — Io's sulphur yellow,
//                    Titan's orange haze, Callisto's dark grey, etc.
//   leadingColor     Iapetus only: its leading hemisphere (Cassini Regio) is coal-dark
//                    (albedo ~0.03-0.05) while the trailing side is bright (~0.5-0.6).
//   tidallyLocked    Same face always toward the planet — true of every moon here except
//                    Hyperion (chaotic tumbling, Cassini; ~13 days is only an average) and
//                    Nereid (11.6 h, Kiss et al. 2016), which just spin at those periods.
//
// Planet equatorial radii (IAU 2015) set the km → scene scale, so every moon's size and
// distance are true to its own planet's scale.

export type MoonAppearance = {
  geometricAlbedo: number;
  color: string;
  mottle: number; // 0-1 surface variation (illustrative)
  triaxialRadiiKm?: [number, number, number];
  leadingColor?: string;
  tidallyLocked: boolean;
  rotationPeriodHours?: number; // only for non-synchronous rotators
};

export const PLANET_EQUATORIAL_RADIUS_KM: Record<string, number> = {
  Earth: 6378.1366,
  Mars: 3396.19,
  Jupiter: 71492,
  Saturn: 60268,
  Uranus: 25559,
  Neptune: 24764,
  // Dwarf planets: mean radius (their display spheres are sized from the same diameter)
  Pluto: 1188.3,
  Eris: 1163,
  Haumea: 780,
  Quaoar: 1115.7 / 2,
  Orcus: 910 / 2,
  Salacia: 838 / 2,
};

export const moonAppearance: Record<string, MoonAppearance> = {
  Moon: { geometricAlbedo: 0.12, color: '#b9b4ab', mottle: 0.35, tidallyLocked: true },

  Phobos: { geometricAlbedo: 0.071, color: '#8a7d70', mottle: 0.3, triaxialRadiiKm: [13.0, 11.4, 9.1], tidallyLocked: true },
  Deimos: { geometricAlbedo: 0.068, color: '#9a8b7a', mottle: 0.2, triaxialRadiiKm: [7.8, 6.0, 5.1], tidallyLocked: true },

  Io: { geometricAlbedo: 0.63, color: '#e8d36a', mottle: 0.45, tidallyLocked: true },
  Europa: { geometricAlbedo: 0.67, color: '#e2d6c2', mottle: 0.25, tidallyLocked: true },
  Ganymede: { geometricAlbedo: 0.43, color: '#a59683', mottle: 0.4, tidallyLocked: true },
  Callisto: { geometricAlbedo: 0.22, color: '#7a6d5e', mottle: 0.35, tidallyLocked: true },
  Amalthea: { geometricAlbedo: 0.09, color: '#a3553c', mottle: 0.25, triaxialRadiiKm: [125, 73, 64], tidallyLocked: true },

  Mimas: { geometricAlbedo: 0.962, color: '#d8d6d2', mottle: 0.2, triaxialRadiiKm: [207.8, 196.7, 190.6], tidallyLocked: true },
  Enceladus: { geometricAlbedo: 1.375, color: '#f6f8fb', mottle: 0.1, tidallyLocked: true },
  Tethys: { geometricAlbedo: 1.229, color: '#ecebe8', mottle: 0.15, tidallyLocked: true },
  Dione: { geometricAlbedo: 0.998, color: '#dcdad5', mottle: 0.2, tidallyLocked: true },
  Rhea: { geometricAlbedo: 0.949, color: '#d6d2cb', mottle: 0.2, tidallyLocked: true },
  Titan: { geometricAlbedo: 0.22, color: '#e0a64b', mottle: 0.05, tidallyLocked: true },
  Hyperion: { geometricAlbedo: 0.3, color: '#b9a88f', mottle: 0.35, triaxialRadiiKm: [180.1, 133.0, 102.7], tidallyLocked: false, rotationPeriodHours: 13 * 24 },
  Iapetus: { geometricAlbedo: 0.5, color: '#ddd8cc', leadingColor: '#2e241b', mottle: 0.15, tidallyLocked: true },

  Miranda: { geometricAlbedo: 0.32, color: '#bdbab4', mottle: 0.35, tidallyLocked: true },
  Ariel: { geometricAlbedo: 0.53, color: '#cfcbc4', mottle: 0.25, tidallyLocked: true },
  Umbriel: { geometricAlbedo: 0.26, color: '#8e8a84', mottle: 0.2, tidallyLocked: true },
  Titania: { geometricAlbedo: 0.35, color: '#c2b8ad', mottle: 0.25, tidallyLocked: true },
  Oberon: { geometricAlbedo: 0.31, color: '#b3a597', mottle: 0.3, tidallyLocked: true },

  Proteus: { geometricAlbedo: 0.096, color: '#8b857e', mottle: 0.3, triaxialRadiiKm: [218, 208, 201], tidallyLocked: true },
  Triton: { geometricAlbedo: 0.76, color: '#e3d3cf', mottle: 0.25, tidallyLocked: true },
  Nereid: { geometricAlbedo: 0.155, color: '#9d9890', mottle: 0.2, tidallyLocked: false, rotationPeriodHours: 11.594 },

  // Added from Wikipedia's List of Solar System objects — albedo, triaxial dimensions and
  // rotation from each moon's Wikipedia infobox (saved under wikipedia/SmallBodies/).
  Phoebe: { geometricAlbedo: 0.0856, color: '#57524b', mottle: 0.35, triaxialRadiiKm: [109.7, 109.7, 101.2], tidallyLocked: false, rotationPeriodHours: 9.27365 },
  Telesto: { geometricAlbedo: 0.97, color: '#eeece8', mottle: 0.1, triaxialRadiiKm: [16.6, 11.7, 9.6], tidallyLocked: true },
  Calypso: { geometricAlbedo: 1.34, color: '#f4f3f0', mottle: 0.1, triaxialRadiiKm: [14.7, 9.3, 6.4], tidallyLocked: true },
  Helene: { geometricAlbedo: 1.67, color: '#f2f1ee', mottle: 0.1, triaxialRadiiKm: [22.6, 19.6, 13.3], tidallyLocked: true },
  Polydeuces: { geometricAlbedo: 1.24, color: '#efeeea', mottle: 0.1, triaxialRadiiKm: [1.75, 1.55, 1.31], tidallyLocked: true },
  Charon: { geometricAlbedo: 0.38, color: '#a39b92', mottle: 0.3, tidallyLocked: true },
  Styx: { geometricAlbedo: 0.65, color: '#cfcbc4', mottle: 0.15, triaxialRadiiKm: [8, 4.5, 4], tidallyLocked: false, rotationPeriodHours: 3.24 * 24 },
  Nix: { geometricAlbedo: 0.56, color: '#cac5bd', mottle: 0.15, triaxialRadiiKm: [24.9, 16.6, 15.55], tidallyLocked: false, rotationPeriodHours: 1.829 * 24 },
  Kerberos: { geometricAlbedo: 0.56, color: '#c7c2ba', mottle: 0.15, triaxialRadiiKm: [9.5, 5, 4.5], tidallyLocked: false, rotationPeriodHours: 5.31 * 24 },
  Hydra: { geometricAlbedo: 0.83, color: '#dcd8d1', mottle: 0.15, triaxialRadiiKm: [25.45, 18.05, 15.45], tidallyLocked: false, rotationPeriodHours: 10.31 },
  Dysnomia: { geometricAlbedo: 0.05, color: '#4d4842', mottle: 0.2, tidallyLocked: true },
  Hiʻiaka: { geometricAlbedo: 0.74, color: '#dcdad4', mottle: 0.15, triaxialRadiiKm: [240, 180, 143], tidallyLocked: false, rotationPeriodHours: 9.68 },
  Namaka: { geometricAlbedo: 0.65, color: '#d4d1ca', mottle: 0.15, tidallyLocked: false },
  Weywot: { geometricAlbedo: 0.036, color: '#4a4540', mottle: 0.2, triaxialRadiiKm: [82, 73, 65], tidallyLocked: true },
  Vanth: { geometricAlbedo: 0.08, color: '#6a645d', mottle: 0.2, tidallyLocked: true },
  Actaea: { geometricAlbedo: 0.021, color: '#3f3b37', mottle: 0.2, tidallyLocked: true },
};
