"""
Converts nistLines.json (produced by nistScraper.py) into
src/app/hydrogen/data/nistSpectralLines.ts. Kept as a separate step from the scraper so the
scraper can be re-run against live NIST pages independently of regenerating the TS file.

Run: python3 generateTs.py
"""
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data", "nistSpectralLines.ts"))

NAMES = {
    2: "Helium", 3: "Lithium", 4: "Beryllium", 5: "Boron", 6: "Carbon", 7: "Nitrogen",
    8: "Oxygen", 9: "Fluorine", 10: "Neon", 11: "Sodium", 12: "Magnesium", 13: "Aluminium",
    14: "Silicon", 15: "Phosphorus", 16: "Sulfur", 17: "Chlorine", 18: "Argon",
    19: "Potassium", 20: "Calcium", 21: "Scandium", 22: "Titanium", 23: "Vanadium",
    24: "Chromium", 25: "Manganese", 26: "Iron", 27: "Cobalt", 28: "Nickel", 29: "Copper",
    30: "Zinc", 31: "Gallium", 32: "Germanium", 33: "Arsenic", 34: "Selenium",
    35: "Bromine", 36: "Krypton",
}


def js_str(s: str) -> str:
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


def js_num_or_null(v):
    if v is None:
        return "null"
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return repr(v)


def term_expr(t: dict) -> str:
    return f"t({js_num_or_null(t['energyCm1'])}, {js_str(t['configuration'])}, {js_str(t['term'])}, {js_str(t['j'])})"


def line_expr(l: dict) -> str:
    return (
        f"      ln({l['wavelengthNm']}, {js_num_or_null(l['intensity'])}, {js_num_or_null(l['aki'])}, "
        f"{term_expr(l['lower'])}, {term_expr(l['upper'])}, {js_str(l['ref'])}),"
    )


HEADER = '''// Real, measured spectral emission lines for elements Z=2-36 (He-Kr) -- everything the
// hydrogen page's periodic table lets you select except hydrogen itself, which keeps using
// the exact Rydberg-formula-derived series in HydrogenSpectrum.tsx (that formula IS exact for
// a genuine one-electron/hydrogenic system, so it needs no replacing; it's only wrong when
// applied to every other, multi-electron element, which is what this file replaces).
//
// Source: NIST's Handbook of Basic Atomic Spectroscopic Data
// (https://physics.nist.gov/PhysRefData/Handbook/element_name.htm), specifically each
// element's "Persistent Lines" tables -- Tables/<name>table3.htm for the neutral atom
// (stage I) and Tables/<name>table4.htm for the singly-ionized atom (stage II), where NIST
// provides one. These are NIST's own curated subset of "most readily observed" lines used
// for identification (a few dozen per element/stage), not the much larger "Strong Lines"
// table (Tables/<name>table2.htm), which runs into the hundreds of lines for elements like
// iron and includes far more faint/UV lines than this UI can usefully show.
//
// Scraped and parsed by ./nist/nistScraper.py (saves each element's raw table3.htm/table4.htm
// under ./nist/<Element>/ for provenance) and converted to this file by
// ./nist/generateTs.py -- regenerate both if the source data changes, rather than hand-editing
// entries below.
//
// Each row is one observed transition, carrying real term-symbol data for both levels (not
// just a wavelength) -- e.g. iron's strongest persistent line is 3d⁶6s² (a⁵D₄) →
// 3d⁶(⁵D)4s4p(¹P) (x⁵F°₅) at 248.33 nm. `configuration`/`term` strings are transcribed
// exactly as NIST renders them (e.g. "3d6(5D)4s4p(1P)", plain digits, matching the
// configurationLabel() convention in data/elements.ts) rather than converted to unicode
// superscripts.
//
// Units: wavelengthNm is nanometers (NIST publishes Å, vacuum below 200nm / air above,
// per standard spectroscopy convention -- converted here, no other correction applied).
// energyCm1 is wavenumber (cm⁻¹) as published. aki is the Einstein A coefficient
// (10⁸ s⁻¹, spontaneous emission rate) where NIST gives one, else null.
//
// `intensity` is NIST's own qualitative/relative scale -- it is NOT standardized across
// elements or across the different reference sources NIST draws each element's table from.
// Only use it as an intra-element visual weight (e.g. line opacity); never compare it across
// elements. It's null for the handful of rows where NIST didn't tabulate one.
//
// A few source rows list an extra fine-structure level sharing a neighboring line's
// wavelength/intensity, with no independently tabulated wavelength of their own (e.g. one row
// in Beryllium II, four in Nitrogen II) -- skipped by the scraper since there's nothing to
// plot on a wavelength axis, not fabricated.

export type IonStage = 'I' | 'II';

export type NistTerm = {
  energyCm1: number;
  configuration: string;
  term: string;
  j: string;
};

export type NistLine = {
  wavelengthNm: number;
  intensity: number | null;
  aki: number | null;
  lower: NistTerm;
  upper: NistTerm;
  ref: string;
};

const t = (energyCm1: number, configuration: string, term: string, j: string): NistTerm =>
  ({ energyCm1, configuration, term, j });

const ln = (
  wavelengthNm: number, intensity: number | null, aki: number | null,
  lower: NistTerm, upper: NistTerm, ref: string
): NistLine => ({ wavelengthNm, intensity, aki, lower, upper, ref });

export const nistLines: Partial<Record<number, Partial<Record<IonStage, NistLine[]>>>> = {
'''

FOOTER = '''};

export function getNistLines(Z: number): Partial<Record<IonStage, NistLine[]>> | undefined {
  return nistLines[Z];
}
'''


def main():
    with open(os.path.join(SCRIPT_DIR, "nistLines.json"), encoding="utf-8") as f:
        data = json.load(f)

    out = [HEADER]
    for z in sorted(data.keys(), key=int):
        name = NAMES[int(z)]
        stages = data[z]
        out.append(f"  {z}: {{ // {name}\n")
        for stage in ("I", "II"):
            if stage not in stages:
                continue
            out.append(f"    {stage}: [\n")
            for line in stages[stage]:
                out.append(line_expr(line) + "\n")
            out.append("    ],\n")
        out.append("  },\n")
    out.append(FOOTER)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("".join(out))
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
