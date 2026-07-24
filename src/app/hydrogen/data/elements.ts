// Elements Z=1-36 (Hydrogen through Krypton), sourced from Wikipedia's consolidated data
// pages (see the planning appendix for exact citations):
// - Electron configurations of the elements (data page)
// - Ionization energies of the elements (data page)
// - Atomic radii of the elements (data page) — "calculated" (Clementi et al. SCF) radius,
//   chosen because it's the only radius definition with no gaps across this range.
//
// `configuration` is the ground-state electron configuration in filling order, as
// {n, l, electrons} subshells (l: 0=s, 1=p, 2=d, 3=f) — used by utils/slater.ts to compute
// each subshell's Slater screening constant. Only Cr (Z=24) and Cu (Z=29) deviate from
// straightforward Aufbau filling in this range (confirmed from source, not assumed).

export type Subshell = { n: number; l: number; electrons: number };

export type ElementData = {
  Z: number;
  symbol: string;
  name: string;
  configuration: Subshell[];
  ionizationEnergyEV: number;
  atomicRadiusPm: number;
};

const s = (n: number, l: number, electrons: number): Subshell => ({ n, l, electrons });

export const elements: ElementData[] = [
  { Z: 1, symbol: 'H', name: 'Hydrogen', configuration: [s(1, 0, 1)], ionizationEnergyEV: 13.598, atomicRadiusPm: 53 },
  { Z: 2, symbol: 'He', name: 'Helium', configuration: [s(1, 0, 2)], ionizationEnergyEV: 24.587, atomicRadiusPm: 31 },
  { Z: 3, symbol: 'Li', name: 'Lithium', configuration: [s(1, 0, 2), s(2, 0, 1)], ionizationEnergyEV: 5.392, atomicRadiusPm: 167 },
  { Z: 4, symbol: 'Be', name: 'Beryllium', configuration: [s(1, 0, 2), s(2, 0, 2)], ionizationEnergyEV: 9.323, atomicRadiusPm: 112 },
  { Z: 5, symbol: 'B', name: 'Boron', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 1)], ionizationEnergyEV: 8.298, atomicRadiusPm: 87 },
  { Z: 6, symbol: 'C', name: 'Carbon', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 2)], ionizationEnergyEV: 11.260, atomicRadiusPm: 67 },
  { Z: 7, symbol: 'N', name: 'Nitrogen', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 3)], ionizationEnergyEV: 14.534, atomicRadiusPm: 56 },
  { Z: 8, symbol: 'O', name: 'Oxygen', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 4)], ionizationEnergyEV: 13.618, atomicRadiusPm: 48 },
  { Z: 9, symbol: 'F', name: 'Fluorine', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 5)], ionizationEnergyEV: 17.423, atomicRadiusPm: 42 },
  { Z: 10, symbol: 'Ne', name: 'Neon', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6)], ionizationEnergyEV: 21.565, atomicRadiusPm: 38 },
  { Z: 11, symbol: 'Na', name: 'Sodium', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 1)], ionizationEnergyEV: 5.139, atomicRadiusPm: 190 },
  { Z: 12, symbol: 'Mg', name: 'Magnesium', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2)], ionizationEnergyEV: 7.646, atomicRadiusPm: 145 },
  { Z: 13, symbol: 'Al', name: 'Aluminium', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 1)], ionizationEnergyEV: 5.986, atomicRadiusPm: 118 },
  { Z: 14, symbol: 'Si', name: 'Silicon', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 2)], ionizationEnergyEV: 8.152, atomicRadiusPm: 111 },
  { Z: 15, symbol: 'P', name: 'Phosphorus', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 3)], ionizationEnergyEV: 10.487, atomicRadiusPm: 98 },
  { Z: 16, symbol: 'S', name: 'Sulfur', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 4)], ionizationEnergyEV: 10.360, atomicRadiusPm: 88 },
  { Z: 17, symbol: 'Cl', name: 'Chlorine', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 5)], ionizationEnergyEV: 12.968, atomicRadiusPm: 79 },
  { Z: 18, symbol: 'Ar', name: 'Argon', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6)], ionizationEnergyEV: 15.760, atomicRadiusPm: 71 },
  { Z: 19, symbol: 'K', name: 'Potassium', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(4, 0, 1)], ionizationEnergyEV: 4.341, atomicRadiusPm: 243 },
  { Z: 20, symbol: 'Ca', name: 'Calcium', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(4, 0, 2)], ionizationEnergyEV: 6.113, atomicRadiusPm: 194 },
  { Z: 21, symbol: 'Sc', name: 'Scandium', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 1), s(4, 0, 2)], ionizationEnergyEV: 6.562, atomicRadiusPm: 184 },
  { Z: 22, symbol: 'Ti', name: 'Titanium', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 2), s(4, 0, 2)], ionizationEnergyEV: 6.828, atomicRadiusPm: 176 },
  { Z: 23, symbol: 'V', name: 'Vanadium', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 3), s(4, 0, 2)], ionizationEnergyEV: 6.746, atomicRadiusPm: 171 },
  { Z: 24, symbol: 'Cr', name: 'Chromium', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 5), s(4, 0, 1)], ionizationEnergyEV: 6.767, atomicRadiusPm: 166 }, // exception: 3d5 4s1
  { Z: 25, symbol: 'Mn', name: 'Manganese', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 5), s(4, 0, 2)], ionizationEnergyEV: 7.434, atomicRadiusPm: 161 },
  { Z: 26, symbol: 'Fe', name: 'Iron', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 6), s(4, 0, 2)], ionizationEnergyEV: 7.902, atomicRadiusPm: 156 },
  { Z: 27, symbol: 'Co', name: 'Cobalt', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 7), s(4, 0, 2)], ionizationEnergyEV: 7.881, atomicRadiusPm: 152 },
  { Z: 28, symbol: 'Ni', name: 'Nickel', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 8), s(4, 0, 2)], ionizationEnergyEV: 7.640, atomicRadiusPm: 149 },
  { Z: 29, symbol: 'Cu', name: 'Copper', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 10), s(4, 0, 1)], ionizationEnergyEV: 7.726, atomicRadiusPm: 145 }, // exception: 3d10 4s1
  { Z: 30, symbol: 'Zn', name: 'Zinc', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 10), s(4, 0, 2)], ionizationEnergyEV: 9.394, atomicRadiusPm: 142 },
  { Z: 31, symbol: 'Ga', name: 'Gallium', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 10), s(4, 0, 2), s(4, 1, 1)], ionizationEnergyEV: 5.999, atomicRadiusPm: 136 },
  { Z: 32, symbol: 'Ge', name: 'Germanium', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 10), s(4, 0, 2), s(4, 1, 2)], ionizationEnergyEV: 7.899, atomicRadiusPm: 125 },
  { Z: 33, symbol: 'As', name: 'Arsenic', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 10), s(4, 0, 2), s(4, 1, 3)], ionizationEnergyEV: 9.789, atomicRadiusPm: 114 },
  { Z: 34, symbol: 'Se', name: 'Selenium', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 10), s(4, 0, 2), s(4, 1, 4)], ionizationEnergyEV: 9.752, atomicRadiusPm: 103 },
  { Z: 35, symbol: 'Br', name: 'Bromine', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 10), s(4, 0, 2), s(4, 1, 5)], ionizationEnergyEV: 11.814, atomicRadiusPm: 94 },
  { Z: 36, symbol: 'Kr', name: 'Krypton', configuration: [s(1, 0, 2), s(2, 0, 2), s(2, 1, 6), s(3, 0, 2), s(3, 1, 6), s(3, 2, 10), s(4, 0, 2), s(4, 1, 6)], ionizationEnergyEV: 13.999, atomicRadiusPm: 88 },
];

export function getElement(Z: number): ElementData | undefined {
  return elements.find(e => e.Z === Z);
}

// Human-readable configuration string, e.g. "1s2 2s2 2p6" — for display alongside the
// structured `configuration` data used by slater.ts.
export function configurationLabel(configuration: Subshell[]): string {
  const orbitalLetters = ['s', 'p', 'd', 'f'];
  return configuration.map(sub => `${sub.n}${orbitalLetters[sub.l]}${sub.electrons}`).join(' ');
}
