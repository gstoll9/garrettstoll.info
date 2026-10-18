// Every asteroid from the "Largest by diameter" table in
// ./wikipedia/List_of_exceptional_asteroids.html (down to 163km), sourced from the
// {{Infobox planet}} template parameters embedded in the Wikipedia pages saved under
// ./wikipedia/. Ceres is the one exception — it's classified as a dwarf planet and
// lives in data/dwarfPlanets.ts instead. Added across three passes matching the table's
// diameter order: >300km, then 200-300km, then this 100-200km batch (which also picked
// up 52 Europa at 319km, missed from the first pass). No astronomy-engine ephemeris
// exists for any of these, so they use the same epoch-anchored Kepler branch in
// orbitalPosition() (see `epochMs` below) as Ceres/Eris/Haumea/Makemake for
// real-time-accurate position.
//
// Vesta, Pallas, Juno, Iris, and Hebe's source infoboxes give inconsistent epoch data —
// the human-readable epoch text reads "13 September 2023" but the accompanying JD
// (2453300.5) actually converts to 2004-10-22. Since all five pages share the identical
// text/JD pair (a synced data pull) and 13 September 2023 matches JPL's typical rolling
// "current epoch" convention — confirmed by 9 Metis's infobox, which independently
// gives JD 2460200.5 for the same date, the JD that 2453300.5 should have been — that
// reading was used here rather than the stale-looking JD.
//
// Hektor is a Jupiter Trojan (semimajor axis ~5.26 AU, near Jupiter's orbit, not the
// main belt) — grouped here with the asteroid-belt bodies anyway for simplicity rather
// than adding a one-off category.

const distanceFactor = 12; // 1 AU = 12 units, matching data/planets.tsx
const dayInSeconds = 24 * 60 * 60;

export const asteroids = [
  {
    name: 'Vesta',
    color: '#c7c0ab',
    size: 0.16,
    realDiameter: 0.0412, // 525.4 km / Earth diameter (12,742 km)
    orbitData: {
      semimajorAxis: 2.36 * distanceFactor,
      semimajorAxisSimplified: 4.3 * 8,
      eccentricity: 0.0894,
      inclination: 7.1422,
      longitudeOfAscendingNode: 103.71,
      argumentOfPerihelion: 151.66,
      meanAnomaly: 169.4,
      orbitalPeriod: 1325.86 * dayInSeconds,
      epochMs: Date.UTC(2023, 8, 13), // JPL current epoch, 13 Sep 2023 (see note above)
    },
  },
  {
    name: 'Pallas',
    color: '#8f97a3',
    size: 0.155,
    realDiameter: 0.0401, // 511 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.77 * distanceFactor,
      semimajorAxisSimplified: 4.6 * 8,
      eccentricity: 0.2302,
      inclination: 34.93,
      longitudeOfAscendingNode: 172.9,
      argumentOfPerihelion: 310.9,
      meanAnomaly: 40.6,
      orbitalPeriod: 1684.0 * dayInSeconds,
      epochMs: Date.UTC(2023, 8, 13), // JPL current epoch, 13 Sep 2023 (see note above)
    },
  },
  {
    name: 'Hygiea',
    color: '#6b655c',
    size: 0.14,
    realDiameter: 0.0340, // 433 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.144 * distanceFactor,
      semimajorAxisSimplified: 4.7 * 8,
      eccentricity: 0.1096,
      inclination: 3.832,
      longitudeOfAscendingNode: 283.13,
      argumentOfPerihelion: 312.71,
      meanAnomaly: 181.38,
      orbitalPeriod: 2036 * dayInSeconds,
      epochMs: Date.UTC(2025, 4, 5), // JD 2460800.5
    },
  },
  {
    name: 'Interamnia',
    color: '#726a5e',
    size: 0.13,
    realDiameter: 0.0261, // 332 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.056 * distanceFactor,
      semimajorAxisSimplified: 4.2 * 8,
      eccentricity: 0.155,
      inclination: 17.31,
      longitudeOfAscendingNode: 280.3,
      argumentOfPerihelion: 94.8,
      meanAnomaly: 248,
      orbitalPeriod: 1951 * dayInSeconds,
      epochMs: Date.UTC(2021, 6, 1), // JD 2459396.5
    },
  },
  // --- 200-300km batch ---
  {
    name: 'Davida',
    color: '#5f5b52',
    size: 0.12,
    realDiameter: 0.0234, // 298 km / Earth diameter (12,742 km)
    orbitData: {
      semimajorAxis: 3.163 * distanceFactor,
      semimajorAxisSimplified: 4.3 * 8,
      eccentricity: 0.188,
      inclination: 15.94,
      longitudeOfAscendingNode: 107.6,
      argumentOfPerihelion: 337.2,
      meanAnomaly: 113,
      orbitalPeriod: 2055 * dayInSeconds,
      epochMs: Date.UTC(2021, 6, 1), // JD 2459396.5
    },
  },
  {
    name: 'Sylvia',
    color: '#6e5f52',
    size: 0.11,
    realDiameter: 0.0213, // 271 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.48 * distanceFactor,
      semimajorAxisSimplified: 4.7 * 8,
      eccentricity: 0.094,
      inclination: 10.9,
      longitudeOfAscendingNode: 73,
      argumentOfPerihelion: 263,
      meanAnomaly: 213,
      orbitalPeriod: 2372 * dayInSeconds,
      epochMs: Date.UTC(2021, 6, 1), // JD 2459396.5
    },
  },
  {
    name: 'Eunomia',
    color: '#a08662',
    size: 0.11,
    realDiameter: 0.0212, // 270 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.64219 * distanceFactor,
      semimajorAxisSimplified: 4.0 * 8,
      eccentricity: 0.187781,
      inclination: 11.7614,
      longitudeOfAscendingNode: 292.881,
      argumentOfPerihelion: 98.5072,
      meanAnomaly: 113.726,
      orbitalPeriod: 1568.71 * dayInSeconds,
      epochMs: Date.UTC(2025, 10, 21), // JD 2461000.5
    },
  },
  {
    name: 'Euphrosyne',
    color: '#57534a',
    size: 0.108,
    realDiameter: 0.021, // 268 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.1554 * distanceFactor,
      semimajorAxisSimplified: 4.4 * 8,
      eccentricity: 0.2209,
      inclination: 26.3033,
      longitudeOfAscendingNode: 31.1186,
      argumentOfPerihelion: 61.4704,
      meanAnomaly: 87.1671,
      orbitalPeriod: 2041.585 * dayInSeconds,
      epochMs: Date.UTC(2019, 3, 27), // JD 2458600.5
    },
  },
  {
    name: 'Cybele',
    color: '#5c4f45',
    size: 0.106,
    realDiameter: 0.0206, // 263 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.4283 * distanceFactor,
      semimajorAxisSimplified: 4.6 * 8,
      eccentricity: 0.1114,
      inclination: 3.5627,
      longitudeOfAscendingNode: 155.63,
      argumentOfPerihelion: 102.37,
      meanAnomaly: 168.06,
      orbitalPeriod: 2319 * dayInSeconds,
      epochMs: Date.UTC(2017, 8, 4), // JD 2458000.5
    },
  },
  {
    // Jupiter Trojan, not main-belt — see file header note.
    name: 'Hektor',
    color: '#4a3f38',
    size: 0.103,
    realDiameter: 0.0201, // 256 km (bilobe estimate) / 12,742 km
    orbitData: {
      semimajorAxis: 5.2571 * distanceFactor,
      semimajorAxisSimplified: 6.2 * 8,
      eccentricity: 0.0238,
      inclination: 18.166,
      longitudeOfAscendingNode: 342.79,
      argumentOfPerihelion: 185.22,
      meanAnomaly: 136.09,
      orbitalPeriod: 4403 * dayInSeconds,
      epochMs: Date.UTC(2018, 2, 23), // JD 2458200.5
    },
  },
  {
    name: 'Juno',
    color: '#a9895f',
    size: 0.102,
    realDiameter: 0.0199, // 254 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.67 * distanceFactor,
      semimajorAxisSimplified: 4.1 * 8,
      eccentricity: 0.2562,
      inclination: 12.991,
      longitudeOfAscendingNode: 169.84,
      argumentOfPerihelion: 247.74,
      meanAnomaly: 37.02,
      orbitalPeriod: 1592.855 * dayInSeconds,
      epochMs: Date.UTC(2023, 8, 13), // JPL current epoch, 13 Sep 2023 (see note above)
    },
  },
  {
    name: 'Patientia',
    color: '#5a564d',
    size: 0.102,
    realDiameter: 0.0199, // 254 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.0616 * distanceFactor,
      semimajorAxisSimplified: 4.55 * 8,
      eccentricity: 0.075545,
      inclination: 15.236,
      longitudeOfAscendingNode: 89.252,
      argumentOfPerihelion: 337.06,
      meanAnomaly: 279.3,
      orbitalPeriod: 1956.7 * dayInSeconds,
      epochMs: Date.UTC(2016, 6, 31), // JD 2457600.5
    },
  },
  {
    name: 'Camilla',
    color: '#6b6259',
    size: 0.102,
    realDiameter: 0.0199, // 254 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.4912 * distanceFactor,
      semimajorAxisSimplified: 4.65 * 8,
      eccentricity: 0.0656,
      inclination: 10.001,
      longitudeOfAscendingNode: 172.61,
      argumentOfPerihelion: 306.77,
      meanAnomaly: 265.91,
      orbitalPeriod: 2383 * dayInSeconds,
      epochMs: Date.UTC(2018, 2, 23), // JD 2458200.5
    },
  },
  {
    name: 'Bamberga',
    color: '#59564d',
    size: 0.092,
    realDiameter: 0.0178, // 227 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.68232 * distanceFactor,
      semimajorAxisSimplified: 4.15 * 8,
      eccentricity: 0.34004,
      inclination: 11.1011,
      longitudeOfAscendingNode: 327.883,
      argumentOfPerihelion: 44.2409,
      meanAnomaly: 225.419,
      orbitalPeriod: 1604.6 * dayInSeconds,
      epochMs: Date.UTC(2016, 6, 31), // JD 2457600.5
    },
  },
  {
    name: 'Psyche',
    color: '#9a978f',
    size: 0.09,
    realDiameter: 0.0174, // 222 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.92 * distanceFactor,
      semimajorAxisSimplified: 4.2 * 8,
      eccentricity: 0.1343,
      inclination: 3.097,
      longitudeOfAscendingNode: 150.0,
      argumentOfPerihelion: 229.8,
      meanAnomaly: 40.6,
      orbitalPeriod: 1825.6 * dayInSeconds,
      epochMs: Date.UTC(2025, 10, 21), // JD 2461000.5
    },
  },
  {
    name: 'Thisbe',
    color: '#6f7680',
    size: 0.088,
    realDiameter: 0.0171, // 218 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.76759 * distanceFactor,
      semimajorAxisSimplified: 4.35 * 8,
      eccentricity: 0.165,
      inclination: 5.219,
      longitudeOfAscendingNode: 276.765,
      argumentOfPerihelion: 36.591,
      meanAnomaly: 165.454,
      orbitalPeriod: 1681.709 * dayInSeconds,
      epochMs: Date.UTC(2006, 11, 31), // JD 2454100.5
    },
  },
  {
    name: 'Doris',
    color: '#585349',
    size: 0.087,
    realDiameter: 0.0169, // 215 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.11 * distanceFactor,
      semimajorAxisSimplified: 4.5 * 8,
      eccentricity: 0.075,
      inclination: 6.554,
      longitudeOfAscendingNode: 183.754,
      argumentOfPerihelion: 257.583,
      meanAnomaly: 336.191,
      orbitalPeriod: 2003.453 * dayInSeconds,
      epochMs: Date.UTC(2006, 11, 31), // JD 2454100.5
    },
  },
  {
    name: 'Fortuna',
    color: '#5f5a4e',
    size: 0.085,
    realDiameter: 0.0166, // 211 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.442 * distanceFactor,
      semimajorAxisSimplified: 4.05 * 8,
      eccentricity: 0.159,
      inclination: 1.573,
      longitudeOfAscendingNode: 211.001,
      argumentOfPerihelion: 182.515,
      meanAnomaly: 96.5,
      orbitalPeriod: 1393.907 * dayInSeconds,
      epochMs: Date.UTC(2025, 10, 21), // JD 2461000.5
    },
  },
  {
    name: 'Hermione',
    color: '#5a564c',
    size: 0.084,
    realDiameter: 0.0164, // 209 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.4478 * distanceFactor,
      semimajorAxisSimplified: 4.6 * 8,
      eccentricity: 0.1331,
      inclination: 7.5975,
      longitudeOfAscendingNode: 73.127,
      argumentOfPerihelion: 298.18,
      meanAnomaly: 157.08,
      orbitalPeriod: 2338 * dayInSeconds,
      epochMs: Date.UTC(2018, 2, 23), // JD 2458200.5
    },
  },
  {
    name: 'Themis',
    color: '#6a7178',
    size: 0.084,
    realDiameter: 0.0163, // 208 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.143 * distanceFactor,
      semimajorAxisSimplified: 4.45 * 8,
      eccentricity: 0.1153,
      inclination: 0.7368,
      longitudeOfAscendingNode: 36.39,
      argumentOfPerihelion: 109.0,
      meanAnomaly: 346.1,
      orbitalPeriod: 2035 * dayInSeconds,
      epochMs: Date.UTC(2024, 9, 17), // JD 2460600.5
    },
  },
  {
    name: 'Aurora',
    color: '#58554c',
    size: 0.083,
    realDiameter: 0.0161, // 205 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.15906 * distanceFactor,
      semimajorAxisSimplified: 4.5 * 8,
      eccentricity: 0.097277,
      inclination: 7.97093,
      longitudeOfAscendingNode: 2.45293,
      argumentOfPerihelion: 60.6118,
      meanAnomaly: 45.7061,
      orbitalPeriod: 2050.85 * dayInSeconds,
      epochMs: Date.UTC(2026, 5, 9), // JD 2461200.5
    },
  },
  {
    name: 'Amphitrite',
    color: '#a3855f',
    size: 0.082,
    realDiameter: 0.016, // 204 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.5544 * distanceFactor,
      semimajorAxisSimplified: 4.1 * 8,
      eccentricity: 0.0736,
      inclination: 6.0772,
      longitudeOfAscendingNode: 356.26,
      argumentOfPerihelion: 62.01,
      meanAnomaly: 48.4,
      orbitalPeriod: 1491 * dayInSeconds,
      epochMs: Date.UTC(2024, 9, 17), // JD 2460600.5
    },
  },
  {
    name: 'Egeria',
    color: '#57544b',
    size: 0.082,
    realDiameter: 0.0159, // 202 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.57774 * distanceFactor,
      semimajorAxisSimplified: 4.05 * 8,
      eccentricity: 0.085403,
      inclination: 16.532,
      longitudeOfAscendingNode: 43.208,
      argumentOfPerihelion: 79.222,
      meanAnomaly: 305.547,
      orbitalPeriod: 1511.7 * dayInSeconds,
      epochMs: Date.UTC(2024, 9, 17), // JD 2460600.5
    },
  },
  // --- 100-200km batch (also includes 52 Europa, >300km, missed from the first pass) ---
  {
    name: 'Europa',
    color: '#726c62',
    size: 0.128,
    realDiameter: 0.025, // 319 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.094 * distanceFactor,
      semimajorAxisSimplified: 4.35 * 8,
      eccentricity: 0.1125,
      inclination: 7.48,
      longitudeOfAscendingNode: 128.57,
      argumentOfPerihelion: 342.8,
      meanAnomaly: 21,
      orbitalPeriod: 1989 * dayInSeconds,
      epochMs: Date.UTC(2021, 6, 1), // JD 2459396.5
    },
  },
  {
    name: 'Elektra',
    color: '#5e5a51',
    size: 0.081,
    realDiameter: 0.0156, // 199 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.1266 * distanceFactor,
      semimajorAxisSimplified: 4.4 * 8,
      eccentricity: 0.20923,
      inclination: 22.782,
      longitudeOfAscendingNode: 145.009,
      argumentOfPerihelion: 237.588,
      meanAnomaly: 87.758,
      orbitalPeriod: 2019 * dayInSeconds,
      epochMs: Date.UTC(2021, 6, 1), // JD 2459396.5
    },
  },
  {
    name: 'Iris',
    color: '#a4936f',
    size: 0.081,
    realDiameter: 0.0156, // 199 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.387 * distanceFactor,
      semimajorAxisSimplified: 3.95 * 8,
      eccentricity: 0.22977,
      inclination: 5.519,
      longitudeOfAscendingNode: 259.5,
      argumentOfPerihelion: 145.4,
      meanAnomaly: 207.9,
      orbitalPeriod: 1346.8 * dayInSeconds,
      epochMs: Date.UTC(2023, 8, 13), // JPL current epoch, 13 Sep 2023 (see note above)
    },
  },
  {
    name: 'Hebe',
    color: '#a9926a',
    size: 0.079,
    realDiameter: 0.0153, // 195 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.43 * distanceFactor,
      semimajorAxisSimplified: 4.0 * 8,
      eccentricity: 0.2027,
      inclination: 14.736,
      longitudeOfAscendingNode: 138.63,
      argumentOfPerihelion: 239.59,
      meanAnomaly: 144.0,
      orbitalPeriod: 1379.85 * dayInSeconds,
      epochMs: Date.UTC(2023, 8, 13), // JPL current epoch, 13 Sep 2023 (see note above)
    },
  },
  {
    name: 'Ursula',
    color: '#5b5750',
    size: 0.078,
    realDiameter: 0.0151, // 192 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.1236 * distanceFactor,
      semimajorAxisSimplified: 4.45 * 8,
      eccentricity: 0.1059,
      inclination: 15.943,
      longitudeOfAscendingNode: 336.57,
      argumentOfPerihelion: 342.15,
      meanAnomaly: 189.03,
      orbitalPeriod: 2016 * dayInSeconds,
      epochMs: Date.UTC(2017, 8, 4), // JD 2458000.5
    },
  },
  {
    name: 'Alauda',
    color: '#59564f',
    size: 0.078,
    realDiameter: 0.015, // 191 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.1953 * distanceFactor,
      semimajorAxisSimplified: 4.55 * 8,
      eccentricity: 0.0182,
      inclination: 20.589,
      longitudeOfAscendingNode: 289.77,
      argumentOfPerihelion: 349.49,
      meanAnomaly: 311.58,
      orbitalPeriod: 2086 * dayInSeconds,
      epochMs: Date.UTC(2017, 8, 4), // JD 2458000.5
    },
  },
  {
    name: 'Eugenia',
    color: '#57534b',
    size: 0.077,
    realDiameter: 0.0148, // 188 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.72 * distanceFactor,
      semimajorAxisSimplified: 4.15 * 8,
      eccentricity: 0.082,
      inclination: 6.61,
      longitudeOfAscendingNode: 147.939,
      argumentOfPerihelion: 85.137,
      meanAnomaly: 45.254,
      orbitalPeriod: 1638.462 * dayInSeconds,
      epochMs: Date.UTC(2005, 10, 26), // JD 2453701.5
    },
  },
  {
    name: 'Daphne',
    color: '#5f5851',
    size: 0.076,
    realDiameter: 0.0147, // 187 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.765 * distanceFactor,
      semimajorAxisSimplified: 4.2 * 8,
      eccentricity: 0.272,
      inclination: 15.765,
      longitudeOfAscendingNode: 178.159,
      argumentOfPerihelion: 46.239,
      meanAnomaly: 247.5,
      orbitalPeriod: 1679.618 * dayInSeconds,
      epochMs: Date.UTC(2006, 11, 31), // JD 2454100.5
    },
  },
  {
    name: 'Bertha',
    color: '#615c53',
    size: 0.076,
    realDiameter: 0.0146, // 186 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.19694 * distanceFactor,
      semimajorAxisSimplified: 4.6 * 8,
      eccentricity: 0.077261,
      inclination: 20.9724,
      longitudeOfAscendingNode: 36.7441,
      argumentOfPerihelion: 159.722,
      meanAnomaly: 125.046,
      orbitalPeriod: 2087.9 * dayInSeconds,
      epochMs: Date.UTC(2016, 6, 31), // JD 2457600.5
    },
  },
  {
    name: 'Diotima',
    color: '#5a564e',
    size: 0.074,
    realDiameter: 0.0138, // 176 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.06774 * distanceFactor,
      semimajorAxisSimplified: 4.3 * 8,
      eccentricity: 0.038297,
      inclination: 11.2304,
      longitudeOfAscendingNode: 69.471,
      argumentOfPerihelion: 200.103,
      meanAnomaly: 237.495,
      orbitalPeriod: 1962.6 * dayInSeconds,
      epochMs: Date.UTC(2016, 6, 31), // JD 2457600.5
    },
  },
  {
    name: 'Aletheia',
    color: '#615d54',
    size: 0.073,
    realDiameter: 0.0137, // 174 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.135 * distanceFactor,
      semimajorAxisSimplified: 4.5 * 8,
      eccentricity: 0.1276,
      inclination: 10.813,
      longitudeOfAscendingNode: 86.864,
      argumentOfPerihelion: 168.07,
      meanAnomaly: 71.26,
      orbitalPeriod: 2027.5 * dayInSeconds,
      epochMs: Date.UTC(2015, 5, 27), // JD 2457200.5
    },
  },
  {
    name: 'Palma',
    color: '#58524a',
    size: 0.073,
    realDiameter: 0.0137, // 174 km / 12,742 km
    orbitData: {
      semimajorAxis: 3.15125 * distanceFactor,
      semimajorAxisSimplified: 4.65 * 8,
      eccentricity: 0.25958,
      inclination: 23.828,
      longitudeOfAscendingNode: 327.37,
      argumentOfPerihelion: 115.582,
      meanAnomaly: 275.769,
      orbitalPeriod: 2043.3 * dayInSeconds,
      epochMs: Date.UTC(2016, 6, 31), // JD 2457600.5
    },
  },
  {
    name: 'Metis',
    color: '#9c9184',
    size: 0.073,
    realDiameter: 0.0136, // 173 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.387 * distanceFactor,
      semimajorAxisSimplified: 4.05 * 8,
      eccentricity: 0.1231,
      inclination: 5.577,
      longitudeOfAscendingNode: 68.87,
      argumentOfPerihelion: 5.75,
      meanAnomaly: 345.43,
      orbitalPeriod: 1346.74 * dayInSeconds,
      epochMs: Date.UTC(2023, 8, 13), // matches JD 2460200.5, no mismatch (see note above)
    },
  },
  {
    name: 'Herculina',
    color: '#8f8375',
    size: 0.071,
    realDiameter: 0.0132, // 168 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.7732838 * distanceFactor,
      semimajorAxisSimplified: 4.25 * 8,
      eccentricity: 0.1757028,
      inclination: 16.31351,
      longitudeOfAscendingNode: 107.55583,
      argumentOfPerihelion: 76.09745,
      meanAnomaly: 131.03906,
      orbitalPeriod: 1684.34607 * dayInSeconds,
      epochMs: Date.UTC(2016, 6, 31), // JD 2457600.5
    },
  },
  {
    name: 'Eleonora',
    color: '#575349',
    size: 0.07,
    realDiameter: 0.0129, // 165 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.79777 * distanceFactor,
      semimajorAxisSimplified: 4.1 * 8,
      eccentricity: 0.11474,
      inclination: 18.403,
      longitudeOfAscendingNode: 140.37,
      argumentOfPerihelion: 5.5215,
      meanAnomaly: 123.762,
      orbitalPeriod: 1709.3 * dayInSeconds,
      epochMs: Date.UTC(2016, 6, 31), // JD 2457600.5
    },
  },
  {
    name: 'Nemesis',
    color: '#5c5850',
    size: 0.069,
    realDiameter: 0.0128, // 163 km / 12,742 km
    orbitData: {
      semimajorAxis: 2.7497 * distanceFactor,
      semimajorAxisSimplified: 4.7 * 8,
      eccentricity: 0.1272,
      inclination: 6.2453,
      longitudeOfAscendingNode: 76.243,
      argumentOfPerihelion: 303.82,
      meanAnomaly: 345.49,
      orbitalPeriod: 1665 * dayInSeconds,
      epochMs: Date.UTC(2018, 2, 23), // JD 2458200.5
    },
  },
];
