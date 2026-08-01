"""
One-time authoring script for src/app/hydrogen/data/nistSpectralLines.ts.

Fetches NIST's "Persistent Lines" tables (Tables/<name>table3.htm = neutral atom / stage I,
Tables/<name>table4.htm = singly ionized / stage II) for elements Z=2-36 from the NIST
Handbook of Basic Atomic Spectroscopic Data (https://physics.nist.gov/PhysRefData/Handbook/),
saves the raw HTML for provenance (matching the ../../solarsystem/wikipedia/ convention of
keeping saved source pages), and emits the finished nistSpectralLines.ts data file directly
from the parsed tables -- no manual re-typing of the numbers, since this is fully structured
tabular data (unlike the Wikipedia prose extraction used for planetStructure.ts, which needs
human judgment calls).

Table layout (confirmed by inspecting the raw HTML of irontable3.htm): each spectral line is
two consecutive non-empty <tr> rows inside the one <table> under <thead> --
  row 1 (lower level): Intensity | Wavelength(A) | Aki | LowerEnergy | LowerConfig | LowerTerm | LowerJ | LineRef | AkiRef
  row 2 (upper level): (blank)   | (blank)       | (blank) | UpperEnergy | UpperConfig | UpperTerm | UpperJ | (blank) | (blank)
followed by a blank spacer <tr>. Filtering to only rows with any non-whitespace text collapses
the header/spacer noise down to a clean alternating lower/upper sequence.

Run: python3 nistScraper.py
"""
import json
import os
import re
import time

import requests
from bs4 import BeautifulSoup

BASE = "https://physics.nist.gov/PhysRefData/Handbook/Tables/"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Z -> (Display name matching elements.ts, NIST URL slug)
ELEMENTS = [
    (2, "Helium", "helium"), (3, "Lithium", "lithium"), (4, "Beryllium", "beryllium"),
    (5, "Boron", "boron"), (6, "Carbon", "carbon"), (7, "Nitrogen", "nitrogen"),
    (8, "Oxygen", "oxygen"), (9, "Fluorine", "fluorine"), (10, "Neon", "neon"),
    (11, "Sodium", "sodium"), (12, "Magnesium", "magnesium"),
    (13, "Aluminium", "aluminum"),  # NIST uses American spelling
    (14, "Silicon", "silicon"), (15, "Phosphorus", "phosphorus"), (16, "Sulfur", "sulfur"),
    (17, "Chlorine", "chlorine"), (18, "Argon", "argon"), (19, "Potassium", "potassium"),
    (20, "Calcium", "calcium"), (21, "Scandium", "scandium"), (22, "Titanium", "titanium"),
    (23, "Vanadium", "vanadium"), (24, "Chromium", "chromium"), (25, "Manganese", "manganese"),
    (26, "Iron", "iron"), (27, "Cobalt", "cobalt"), (28, "Nickel", "nickel"),
    (29, "Copper", "copper"), (30, "Zinc", "zinc"), (31, "Gallium", "gallium"),
    (32, "Germanium", "germanium"), (33, "Arsenic", "arsenic"), (34, "Selenium", "selenium"),
    (35, "Bromine", "bromine"), (36, "Krypton", "krypton"),
]


def fetch(url: str) -> str | None:
    resp = requests.get(url, headers={"User-Agent": UA}, timeout=20)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.text


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\xa0", " ")).strip()


NUM_RE = re.compile(r"[-+]?\d*\.?\d+")


def parse_num(raw: str):
    """Extract the leading numeric value, dropping footnote markers like the
    trailing '*' NIST uses to flag uncertain Aki/intensity values (e.g. '4.24*',
    '200*'). Returns None for blank cells."""
    m = NUM_RE.match(raw)
    return float(m.group()) if m else None


def parse_table(html: str, symbol: str, stage_roman: str):
    soup = BeautifulSoup(html, "html.parser")
    thead = soup.find("thead")
    if not thead:
        raise ValueError(f"no <thead> found for {symbol} {stage_roman}")
    table = thead.find_parent("table")
    all_rows = table.find_all("tr")
    data_rows = [r for r in all_rows if r.find_parent("thead") is None and clean(r.get_text()) != ""]

    if len(data_rows) % 2 != 0:
        raise ValueError(f"odd number of data rows ({len(data_rows)}) for {symbol} {stage_roman} -- layout assumption broke")

    lines = []
    skipped = 0
    for i in range(0, len(data_rows), 2):
        lo_cells = [clean(td.get_text()) for td in data_rows[i].find_all("td")]
        hi_cells = [clean(td.get_text()) for td in data_rows[i + 1].find_all("td")]
        if len(lo_cells) != 9 or len(hi_cells) != 9:
            raise ValueError(f"unexpected cell count for {symbol} {stage_roman} at pair {i}: {len(lo_cells)}/{len(hi_cells)}")

        intensity_raw, wavelength_a, aki_raw, lo_e, lo_cfg, lo_term, lo_j, line_ref, aki_ref = lo_cells
        _, _, _, hi_e, hi_cfg, hi_term, hi_j, _, _ = hi_cells

        # Some elements list an extra fine-structure level tied to a neighboring line
        # (a shared/blended component) with no independently tabulated wavelength of its
        # own -- nothing to plot on a wavelength axis, so skip rather than fabricate one.
        wl = parse_num(wavelength_a)
        if wl is None:
            skipped += 1
            continue

        lines.append({
            "wavelengthNm": round(wl / 10, 5),
            "intensity": parse_num(intensity_raw),
            "aki": parse_num(aki_raw),
            "lower": {
                "energyCm1": parse_num(lo_e.replace(",", "")) or 0.0,
                "configuration": lo_cfg, "term": lo_term, "j": lo_j,
            },
            "upper": {
                "energyCm1": parse_num(hi_e.replace(",", "")) or 0.0,
                "configuration": hi_cfg, "term": hi_term, "j": hi_j,
            },
            "ref": line_ref,
        })
    if skipped:
        print(f"  ({symbol} {stage_roman}: skipped {skipped} level-only row(s) with no tabulated wavelength)")
    return lines


def main():
    result = {}
    for z, name, slug in ELEMENTS:
        elem_dir = os.path.join(SCRIPT_DIR, name)
        os.makedirs(elem_dir, exist_ok=True)
        stages = {}
        for table_num, stage_roman in ((3, "I"), (4, "II")):
            url = f"{BASE}{slug}table{table_num}.htm"
            html = fetch(url)
            time.sleep(0.25)
            if html is None:
                print(f"Z={z:>2} {name:<12} {stage_roman:<3} -- no table{table_num} page (404), skipping")
                continue
            path = os.path.join(elem_dir, f"table{table_num}.htm")
            with open(path, "w", encoding="utf-8") as f:
                f.write(html)
            try:
                lines = parse_table(html, name, stage_roman)
            except ValueError as e:
                print(f"Z={z:>2} {name:<12} {stage_roman:<3} -- PARSE ERROR: {e}")
                continue
            stages[stage_roman] = lines
            print(f"Z={z:>2} {name:<12} {stage_roman:<3} -- {len(lines)} lines")
        if stages:
            result[z] = stages

    out_path = os.path.join(SCRIPT_DIR, "nistLines.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {out_path}")

    all_wl = [l["wavelengthNm"] for stages in result.values() for lines in stages.values() for l in lines]
    print(f"Wavelength range across all elements: {min(all_wl):.2f} - {max(all_wl):.2f} nm")


if __name__ == "__main__":
    main()
