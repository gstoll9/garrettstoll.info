"use client";
import { elements } from '../data/elements';

// Standard periodic table positions (period = row, group = column 1-18) for Z=1-36 —
// the functional/selectable range this page models. Z=37-118 are rendered as greyed,
// non-interactive placeholders in their real standard positions so the table communicates
// its actual scope honestly rather than looking cut off; lanthanides (57-71) and
// actinides (89-103) are folded into a single placeholder cell rather than drawn as a
// separate f-block row, a common simplification for compact table displays.
const POSITIONS: Record<number, { row: number; col: number }> = {
  1: { row: 1, col: 1 }, 2: { row: 1, col: 18 },
  3: { row: 2, col: 1 }, 4: { row: 2, col: 2 }, 5: { row: 2, col: 13 }, 6: { row: 2, col: 14 },
  7: { row: 2, col: 15 }, 8: { row: 2, col: 16 }, 9: { row: 2, col: 17 }, 10: { row: 2, col: 18 },
  11: { row: 3, col: 1 }, 12: { row: 3, col: 2 }, 13: { row: 3, col: 13 }, 14: { row: 3, col: 14 },
  15: { row: 3, col: 15 }, 16: { row: 3, col: 16 }, 17: { row: 3, col: 17 }, 18: { row: 3, col: 18 },
  19: { row: 4, col: 1 }, 20: { row: 4, col: 2 }, 21: { row: 4, col: 3 }, 22: { row: 4, col: 4 },
  23: { row: 4, col: 5 }, 24: { row: 4, col: 6 }, 25: { row: 4, col: 7 }, 26: { row: 4, col: 8 },
  27: { row: 4, col: 9 }, 28: { row: 4, col: 10 }, 29: { row: 4, col: 11 }, 30: { row: 4, col: 12 },
  31: { row: 4, col: 13 }, 32: { row: 4, col: 14 }, 33: { row: 4, col: 15 }, 34: { row: 4, col: 16 },
  35: { row: 4, col: 17 }, 36: { row: 4, col: 18 },
};

// Disabled placeholders: [Z-or-label, row, col]. Periods 5-7 in their standard positions.
const DISABLED_CELLS: { label: string; row: number; col: number }[] = [
  ...[37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54].map((z, i) => ({ label: String(z), row: 5, col: i + 1 })),
  { label: '55', row: 6, col: 1 }, { label: '56', row: 6, col: 2 }, { label: '57-71', row: 6, col: 3 },
  ...[72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86].map((z, i) => ({ label: String(z), row: 6, col: i + 4 })),
  { label: '87', row: 7, col: 1 }, { label: '88', row: 7, col: 2 }, { label: '89-103', row: 7, col: 3 },
  ...[104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118].map((z, i) => ({ label: String(z), row: 7, col: i + 4 })),
];

type PeriodicTableProps = {
  selectedZ: number;
  onSelect: (Z: number) => void;
};

export default function PeriodicTable({ selectedZ, onSelect }: PeriodicTableProps) {
  return (
    <div className="periodicTableRoot">
      <div className="periodicTableGrid">
        {elements.map(el => {
          const pos = POSITIONS[el.Z];
          if (!pos) return null;
          const active = el.Z === selectedZ;
          return (
            <button
              key={el.Z}
              className={`periodicCell${active ? ' active' : ''}`}
              style={{ gridRow: pos.row, gridColumn: pos.col }}
              onClick={() => onSelect(el.Z)}
              title={`${el.name} (Z=${el.Z})`}
            >
              <span className="periodicCellZ">{el.Z}</span>
              <span className="periodicCellSymbol">{el.symbol}</span>
            </button>
          );
        })}
        {DISABLED_CELLS.map(cell => (
          <div
            key={`disabled-${cell.row}-${cell.col}`}
            className="periodicCell periodicCellDisabled"
            style={{ gridRow: cell.row, gridColumn: cell.col }}
            title="Not modeled — this page covers periods 1-4 (Z=1-36)"
          >
            <span className="periodicCellZ">{cell.label}</span>
          </div>
        ))}
      </div>
      <p className="periodicTableNote">
        Periods 1-4 (H-Kr) are modeled here via Slater&rsquo;s rules; periods 5-7 (greyed out) aren&rsquo;t yet.
      </p>
    </div>
  );
}
