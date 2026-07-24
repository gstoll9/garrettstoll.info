// Slater's rules: an approximate effective-nuclear-charge model for multi-electron atoms.
// This is what bridges the exact one-electron hydrogenic wavefunction math (already in
// hydrogenCloud.tsx, already Z-parameterized) to real multi-electron atoms — there's no
// closed-form exact solution once electron-electron repulsion enters, so each orbital is
// instead modeled as *a hydrogenic orbital with an effective charge Z_eff = Z − σ* felt by
// that electron, where σ (the "screening constant") comes from Slater's empirical rules.
//
// Reference: J. C. Slater (1930), "Atomic Shielding Constants", Phys. Rev. 36, 57.

import { Subshell } from '../data/elements';

// Slater's rules group orbitals as: (1s)(2s,2p)(3s,3p)(3d)(4s,4p)(4d)(4f)(5s,5p)(5d)(5f)(6s,6p)...
// Note this is NOT simply ordered by n — e.g. (3d) is its own group, separate from and
// "more inner" than (4s,4p), which matters for which electrons screen which.
function slaterGroupIndex(n: number, l: number): number {
  if (n === 1) return 0;
  if (n === 2) return 1;
  if (n === 3 && l <= 1) return 2;
  if (n === 3 && l === 2) return 3;
  if (n === 4 && l <= 1) return 4;
  if (n === 4 && l === 2) return 5;
  if (n === 4 && l === 3) return 6;
  if (n === 5 && l <= 1) return 7;
  if (n === 5 && l === 2) return 8;
  if (n === 5 && l === 3) return 9;
  if (n === 6 && l <= 1) return 10;
  return 11 + n; // beyond this app's Z<=36 range; kept for safety, not exercised
}

// Screening constant (σ) felt by one electron in subshell (targetN, targetL), given the
// full ground-state configuration it belongs to.
export function slaterScreeningConstant(configuration: Subshell[], targetN: number, targetL: number): number {
  const targetGroup = slaterGroupIndex(targetN, targetL);
  const targetIsSOrP = targetL === 0 || targetL === 1;

  let sigma = 0;
  for (const sub of configuration) {
    const isSameSubshell = sub.n === targetN && sub.l === targetL;
    const contributingElectrons = isSameSubshell ? sub.electrons - 1 : sub.electrons;
    if (contributingElectrons <= 0) continue;

    const group = slaterGroupIndex(sub.n, sub.l);
    if (group === targetGroup) {
      sigma += contributingElectrons * (targetN === 1 ? 0.30 : 0.35);
    } else if (group < targetGroup) {
      if (targetIsSOrP) {
        if (sub.n === targetN - 1) {
          sigma += contributingElectrons * 0.85;
        } else if (sub.n <= targetN - 2) {
          sigma += contributingElectrons * 1.00;
        }
      } else {
        // d/f electrons: every electron in a more-inner group screens fully, regardless
        // of shell number (this is why 4s doesn't screen 3d at all: 4s's group index is
        // higher, i.e. written to the right of 3d, even though n=4 > n=3).
        sigma += contributingElectrons * 1.00;
      }
    }
    // group > targetGroup: outer electrons don't screen inner ones — contributes 0.
  }
  return sigma;
}

// Effective nuclear charge felt by an electron in subshell (targetN, targetL).
export function effectiveNuclearCharge(Z: number, configuration: Subshell[], targetN: number, targetL: number): number {
  // A one-electron atom's single electron can't screen itself: whichever orbital it's
  // (hypothetically) in, it feels the full nuclear charge exactly, no Slater screening
  // applies. Without this, selecting e.g. hydrogen's 2p orbital would incorrectly compute
  // screening from "the electron left behind in 1s" — but there is no other electron.
  const totalElectrons = configuration.reduce((sum, sub) => sum + sub.electrons, 0);
  if (totalElectrons <= 1) return Z;

  const sigma = slaterScreeningConstant(configuration, targetN, targetL);
  // Clamp away from <=0: a real atom's electrons always feel *some* net positive charge;
  // Slater's rules can occasionally overshoot for the innermost shells of light atoms.
  return Math.max(Z - sigma, 0.15);
}

// Approximate orbital binding energy (eV, negative) for subshell (targetN, targetL), using
// the same hydrogenic formula E_n = -13.6 eV * Z_eff^2 / n^2 the rest of this page already
// uses for hydrogen — just with Z_eff instead of Z=1. This is the "approximation" side of
// the approximation-vs-real-measurement comparison.
export function approximateOrbitalEnergyEV(Z: number, configuration: Subshell[], targetN: number, targetL: number): number {
  const zEff = effectiveNuclearCharge(Z, configuration, targetN, targetL);
  return -13.6 * (zEff * zEff) / (targetN * targetN);
}

// The outermost (highest n, then highest l) occupied subshell — a reasonable proxy for
// "the valence electron" whose binding energy approximates the first ionization energy.
export function outermostSubshell(configuration: Subshell[]): Subshell {
  return configuration.reduce((outer, sub) => {
    if (sub.n > outer.n) return sub;
    if (sub.n === outer.n && sub.l > outer.l) return sub;
    return outer;
  }, configuration[0]);
}
