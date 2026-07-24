"use client"
import { useEffect, useRef, useState, useMemo, useCallback, Fragment } from 'react';
import { wavefunction } from '../utils/hydrogenCloud';

// ── Physical constants ─────────────────────────────────────────────────────────
const C_NM_S   = 2.998e17;   // speed of light in nm/s
const HC_EV_NM = 1239.8;     // hc in eV·nm
const RH       = 1.097373e-2; // Rydberg constant in nm⁻¹

// Z^2-scaled Rydberg formula: exact for a hydrogen-like (single-electron) ion of nuclear
// charge Z, only an approximation for a real multi-electron atom's outermost electron
// (real multi-electron spectra depend on l too, via shielding — this reuses the same
// closed-form the rest of this page uses for hydrogen, with Z_eff standing in for Z).
function rydbergWl(n1: number, n2: number, Z: number = 1): number {
  return 1 / (RH * Z * Z * (1 / (n1 * n1) - 1 / (n2 * n2)));
}

function emRegion(nm: number): string {
  if (nm < 380)   return 'Ultraviolet (UV)';
  if (nm <= 750)  return 'Visible light';
  if (nm <= 1400) return 'Near-IR (NIR)';
  if (nm <= 3000) return 'Mid-IR (MIR)';
  return 'Far-IR (FIR)';
}

function wavelengthToHex(wavelength: number): string {
  let r = 0, g = 0, b = 0;
  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380); g = 0; b = 1;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0; g = (wavelength - 440) / (490 - 440); b = 1;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0; g = 1; b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510); g = 1; b = 0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1; g = -(wavelength - 645) / (645 - 580); b = 0;
  } else if (wavelength >= 645 && wavelength <= 780) {
    r = 1; g = 0; b = 0;
  }
  
  let factor = 1.0;
  if (wavelength >= 380 && wavelength < 420) {
    factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
  } else if (wavelength >= 701 && wavelength <= 780) {
    factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
  }

  const toHex = (c: number) => {
    // using a standard gamma correction of 0.8
    const val = c === 0 ? 0 : Math.max(0, Math.min(255, Math.round(Math.pow(c * factor, 0.8) * 255)));
    return val.toString(16).padStart(2, '0').toUpperCase();
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ── Hydrogen series ────────────────────────────────────────────────────────────
const SERIES_DEFS = [
  { n1: 1, name: 'Lyman',     labelColor: '#CC88FF' },
  { n1: 2, name: 'Balmer',    labelColor: '#66AAFF' },
  { n1: 3, name: 'Paschen',   labelColor: '#44DDAA' },
  { n1: 4, name: 'Brackett',  labelColor: '#E8C84A' },
  { n1: 5, name: 'Pfund',     labelColor: '#FF4D9E' },
  { n1: 6, name: 'Humphreys', labelColor: '#FF6040' },
];

interface SpectralLine {
  n1: number; n2: number;
  series: string;
  wavelength: number;  // nm
  frequency: number;   // Hz
  energy: number;      // eV
  emRegion: string;
  labelColor: string;
}

function buildLines(Z: number): SpectralLine[] {
  return SERIES_DEFS.flatMap(s =>
    Array.from({ length: 8 }, (_, i) => {
      const n2 = s.n1 + 1 + i;
      const wl = rydbergWl(s.n1, n2, Z);
      return {
        n1: s.n1, n2,
        series: s.name,
        wavelength: wl,
        frequency: C_NM_S / wl,
        energy: HC_EV_NM / wl,
        emRegion: emRegion(wl),
        labelColor: s.labelColor,
      };
    })
  );
}

// ── Canvas layout ───────────────────────────────────────────────────────────────
const CW        = 1000;
const CH        = 210;
const MARGIN_L  = 8;
const MARGIN_R  = 8;
const PLOT_W    = CW - MARGIN_L - MARGIN_R;
const STRIP_TOP = 28;
const STRIP_H   = 120;

const NM_MIN = 80;
const NM_MAX = 20000;

const SLICE_SIZE = 184;

function nmToX(nm: number): number {
  const t = (Math.log(nm) - Math.log(NM_MIN)) / (Math.log(NM_MAX) - Math.log(NM_MIN));
  return MARGIN_L + t * PLOT_W;
}

function orbitalLetter(l: number): string {
  return ['s', 'p', 'd', 'f', 'g'][l] ?? `l${l}`;
}

function phaseToRgb(phase: number): [number, number, number] {
  const stops: [number, number, number][] = [
    [0.106, 0.165, 0.541],
    [0.533, 0.800, 0.933],
    [0.902, 0.478, 0.000],
    [0.988, 0.800, 0.604],
    [0.106, 0.165, 0.541],
  ];
  if (!Number.isFinite(phase)) {
    return stops[0];
  }

  const t = Math.max(0, Math.min(1, phase / (2 * Math.PI) + 0.5));
  const scaled = t * (stops.length - 1);
  const lo = Math.floor(scaled);
  const hi = Math.min(lo + 1, stops.length - 1);
  const frac = scaled - lo;
  const a = stops[lo];
  const b = stops[hi];
  return [
    a[0] + (b[0] - a[0]) * frac,
    a[1] + (b[1] - a[1]) * frac,
    a[2] + (b[2] - a[2]) * frac,
  ];
}

function buildCrossSectionDataUrl(n: number, l: number, m: number, Z: number = 1, size = SLICE_SIZE): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const image = ctx.createImageData(size, size);
  const maxRadius = (n * n * 5) / Z;
  const step = (2 * maxRadius) / (size - 1);

  const probs = new Float32Array(size * size);
  const phases = new Float32Array(size * size);
  let maxProb = 1e-12;

  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = -maxRadius + i * step;
      const z = maxRadius - j * step;
      const r = Math.sqrt(x * x + z * z);
      const idx = j * size + i;

      if (r > maxRadius) {
        probs[idx] = 0;
        phases[idx] = 0;
        continue;
      }

      const theta = r > 0 ? Math.acos(Math.max(-1, Math.min(1, z / r))) : 0;
      const phi = Math.atan2(0, x);
      const psi = wavefunction(r, theta, phi, n, l, m, Z);
      const probRaw = psi.real * psi.real + psi.imag * psi.imag;
      const prob = Number.isFinite(probRaw) ? probRaw : 0;
      const phaseRaw = Math.atan2(psi.imag, psi.real);
      const phase = Number.isFinite(phaseRaw) ? phaseRaw : 0;

      probs[idx] = prob;
      phases[idx] = phase;
      if (prob > maxProb) maxProb = prob;
    }
  }

  for (let idx = 0; idx < probs.length; idx++) {
    const p = probs[idx];
    const norm = Math.min(1, p / maxProb);
    const intensity = Math.pow(norm, 0.34);
    const [rC, gC, bC] = phaseToRgb(phases[idx]);

    const px = idx * 4;
    const alpha = intensity < 0.03 ? 0 : Math.round(intensity * 255);
    image.data[px] = Math.round(rC * 255);
    image.data[px + 1] = Math.round(gC * 255);
    image.data[px + 2] = Math.round(bC * 255);
    image.data[px + 3] = alpha;
  }

  ctx.fillStyle = '#06090f';
  ctx.fillRect(0, 0, size, size);
  ctx.putImageData(image, 0, 0);

  // Nucleus marker
  const c = size / 2;
  ctx.beginPath();
  ctx.arc(c, c, Math.max(2, size * 0.018), 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255, 84, 84, 0.9)';
  ctx.fill();

  return canvas.toDataURL('image/png');
}

// ── Canvas drawing (pure function, no hooks) ────────────────────────────────────
function drawCanvas(
  canvas: HTMLCanvasElement,
  visible: SpectralLine[],
  hov: SpectralLine | null
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, CW, CH);

  // ── EM gradient strip ─────────────────────────────────────────────────────
  const grad = ctx.createLinearGradient(MARGIN_L, 0, MARGIN_L + PLOT_W, 0);
  const gradStops: [number, string][] = [
    [80,    '#110022'], [200,   '#440088'], [350,  '#7700CC'],
    [380,   '#8800FF'], [440,   '#0000FF'], [490,  '#0088FF'],
    [520,   '#00EE44'], [575,   '#FFFF00'], [620,  '#FF4400'],
    [750,   '#AA0000'], [1200,  '#550000'], [5000, '#220000'],
    [20000, '#0D0000'],
  ];
  gradStops.forEach(([nm, color]) => {
    const t = (Math.log(nm) - Math.log(NM_MIN)) / (Math.log(NM_MAX) - Math.log(NM_MIN));
    grad.addColorStop(Math.max(0, Math.min(1, t)), color);
  });
  ctx.fillStyle = grad;
  ctx.fillRect(MARGIN_L, STRIP_TOP, PLOT_W, STRIP_H);

  // ── Region boundary lines ─────────────────────────────────────────────────
  [380, 750, 1400, 3000].forEach(nm => {
    const x = nmToX(nm);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.7;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, STRIP_TOP);
    ctx.lineTo(x, STRIP_TOP + STRIP_H + 32);
    ctx.stroke();
  });

  // ── EM region labels ──────────────────────────────────────────────────────
  const regionRanges: [number, number, string][] = [
    [80,   380,   'UV'],
    [380,  750,   'Visible'],
    [750,  1400,  'Near-IR'],
    [1400, 3000,  'Mid-IR'],
    [3000, 20000, 'Far-IR'],
  ];
  ctx.font = '9px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  regionRanges.forEach(([nm0, nm1, label]) => {
    ctx.fillText(label, (nmToX(nm0) + nmToX(nm1)) / 2, STRIP_TOP + STRIP_H + 40);
  });

  // ── Series endpoint wavelength labels (collision-aware 2-row) ─────────────
  const seriesGroups = new Map<string, SpectralLine[]>();
  visible.forEach(l => {
    if (!seriesGroups.has(l.series)) seriesGroups.set(l.series, []);
    seriesGroups.get(l.series)!.push(l);
  });
  const endpointLabels: { x: number; label: string; color: string }[] = [];
  seriesGroups.forEach(lines => {
    const sorted = [...lines].sort((a, b) => a.wavelength - b.wavelength);
    const endpoints = sorted.length === 1 ? [sorted[0]] : [sorted[0], sorted[sorted.length - 1]];
    endpoints.forEach(line => {
      endpointLabels.push({
        x: nmToX(line.wavelength),
        label: line.wavelength < 1000
          ? `${line.wavelength.toFixed(0)}nm`
          : `${(line.wavelength / 1000).toFixed(2)}µm`,
        color: line.labelColor,
      });
    });
  });
  endpointLabels.sort((a, b) => a.x - b.x);
  const tickY = STRIP_TOP + STRIP_H;
  const labelY = tickY + 14;
  const MIN_GAP = 30;
  endpointLabels.forEach(({ x, label, color }, i) => {
    const hasCloseLeft  = i > 0 && x - endpointLabels[i - 1].x < MIN_GAP;
    const hasCloseRight = i < endpointLabels.length - 1 && endpointLabels[i + 1].x - x < MIN_GAP;
    const align: CanvasTextAlign = hasCloseRight ? 'right' : hasCloseLeft ? 'left' : 'center';
    ctx.strokeStyle = color + '88';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, tickY);
    ctx.lineTo(x, tickY + 5);
    ctx.stroke();
    ctx.fillStyle = color + 'BB';
    ctx.font = '8px Arial';
    ctx.textAlign = align;
    ctx.fillText(label, x, labelY);
  });

  // ── Spectral emission lines ───────────────────────────────────────────────
  visible.forEach(line => {
    const x    = nmToX(line.wavelength);
    const yTop = STRIP_TOP;
    const yBot = STRIP_TOP + STRIP_H;
    const isHov = hov === line;

    ctx.shadowColor = isHov ? '#ffffff' : line.labelColor;
    ctx.shadowBlur  = isHov ? 14 : 7;
    ctx.strokeStyle = isHov ? 'rgba(255,255,255,0.95)' : line.labelColor + 'DD';
    ctx.lineWidth   = isHov ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x, yBot);
    ctx.lineTo(x, yTop);
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // ── Baseline ─────────────────────────────────────────────────────────────

}

// ── Component ─────────────────────────────────────────────────────────────────
interface HydrogenSpectrumProps {
  Z?: number;
}

export default function HydrogenSpectrum({ Z = 1 }: HydrogenSpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const allLines = useMemo(() => buildLines(Z), [Z]);

  const [activeSeries, setActiveSeries] = useState<Set<string>>(
    () => new Set(SERIES_DEFS.map(s => s.name))
  );
  const [n2Min, setN2Min] = useState(2);
  const [n2Max, setN2Max] = useState(9);
  const [hovered, setHovered] = useState<SpectralLine | null>(null);
  const [selectedLine, setSelectedLine] = useState<SpectralLine | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const visibleLines = useMemo(
    () => allLines.filter(l =>
      activeSeries.has(l.series) && l.n2 >= n2Min && l.n2 <= n2Max
    ),
    [allLines, activeSeries, n2Min, n2Max]
  );

  useEffect(() => {
    if (canvasRef.current) drawCanvas(canvasRef.current, visibleLines, hovered);
  }, [visibleLines, hovered]);

  useEffect(() => {
    if (!visibleLines.length) {
      setSelectedLine(null);
      return;
    }
    if (!selectedLine || !visibleLines.includes(selectedLine)) {
      setSelectedLine(visibleLines[0]);
    }
  }, [visibleLines, selectedLine]);

  const getClosestLine = useCallback((logicalX: number): SpectralLine | null => {
    let closest: SpectralLine | null = null;
    let minDist = 10;
    visibleLines.forEach(line => {
      const dist = Math.abs(nmToX(line.wavelength) - logicalX);
      if (dist < minDist) {
        minDist = dist;
        closest = line;
      }
    });
    return closest;
  }, [visibleLines]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const logicalX = (e.clientX - rect.left) * (CW / rect.width);

    const closest = getClosestLine(logicalX);

    setHovered(closest);
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [getClosestLine]);

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const logicalX = (e.clientX - rect.left) * (CW / rect.width);
    const closest = getClosestLine(logicalX);
    if (closest) setSelectedLine(closest);
  }, [getClosestLine]);

  const activeTransition = hovered ?? selectedLine;

  const upperState = useMemo(() => {
    if (!activeTransition) return null;
    const n = activeTransition.n2;
    return { n, l: Math.min(1, n - 1), m: 0 };
  }, [activeTransition]);

  const lowerState = useMemo(() => {
    if (!activeTransition) return null;
    const n = activeTransition.n1;
    return { n, l: 0, m: 0 };
  }, [activeTransition]);

  const upperSliceUrl = useMemo(() => {
    if (!upperState) return '';
    return buildCrossSectionDataUrl(upperState.n, upperState.l, upperState.m, Z);
  }, [upperState, Z]);

  const lowerSliceUrl = useMemo(() => {
    if (!lowerState) return '';
    return buildCrossSectionDataUrl(lowerState.n, lowerState.l, lowerState.m, Z);
  }, [lowerState, Z]);

  const toggleSeries = (name: string) => {
    setActiveSeries(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  return (
    <div style={{ width: '100%', background: '#080808', borderRadius: '8px', padding: '12px 12px 8px' }}>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#444', marginRight: '2px' }}>Series:</span>
        {SERIES_DEFS.map(s => (
          <button
            key={s.name}
            onClick={() => toggleSeries(s.name)}
            style={{
              padding: '2px 10px',
              fontSize: '11px',
              border: `1px solid ${activeSeries.has(s.name) ? s.labelColor : '#2a2a2a'}`,
              borderRadius: '4px',
              background: activeSeries.has(s.name) ? `${s.labelColor}20` : 'transparent',
              color: activeSeries.has(s.name) ? s.labelColor : '#3a3a3a',
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
          >
            {s.name}
          </button>
        ))}

        <div style={{ marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#444' }}>n₂ range:</span>
          <span style={{ fontSize: '11px', color: '#666', minWidth: '10px' }}>{n2Min}</span>
          <input
            type="range" min={2} max={9} value={n2Min}
            onChange={e => setN2Min(Math.min(parseInt(e.target.value), n2Max))}
            style={{ width: '70px', accentColor: '#666' }}
          />
          <span style={{ fontSize: '11px', color: '#555' }}>–</span>
          <input
            type="range" min={2} max={9} value={n2Max}
            onChange={e => setN2Max(Math.max(parseInt(e.target.value), n2Min))}
            style={{ width: '70px', accentColor: '#666' }}
          />
          <span style={{ fontSize: '11px', color: '#666', minWidth: '10px' }}>{n2Max}</span>
        </div>
      </div>

      {/* ── Canvas + tooltip overlay ── */}
      <div style={{ position: 'relative', width: '100%' }}>
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        {/* transparent hit overlay */}
        <div
          onMouseMove={handleMouseMove}
          onClick={handleOverlayClick}
          onMouseLeave={() => setHovered(null)}
          style={{ position: 'absolute', inset: 0, cursor: hovered ? 'crosshair' : 'default' }}
        />

        {/* Info tooltip */}
        {hovered && (() => {
          const rect = canvasRef.current?.getBoundingClientRect();
          const containerW = rect?.width ?? CW;
          const tooltipW = 210;
          const left = tooltipPos.x + 16 + tooltipW > containerW
            ? tooltipPos.x - tooltipW - 12
            : tooltipPos.x + 16;
          const rows: [string, React.ReactNode][] = [
            ['Region',     hovered.emRegion],
            ['Wavelength', hovered.wavelength < 1000
              ? `${hovered.wavelength.toFixed(1)} nm`
              : `${(hovered.wavelength / 1000).toFixed(3)} μm`],
            ['Frequency',  `${(hovered.frequency / 1e12).toFixed(2)} THz`],
            ['Energy',     `${hovered.energy.toFixed(3)} eV`],
          ];

          if (hovered.wavelength >= 380 && hovered.wavelength <= 750) {
            let colorName = '';
            const wl = hovered.wavelength;
            if (wl < 400) { colorName = 'Deep Violet'; }
            else if (wl < 425) { colorName = 'Violet'; }
            else if (wl < 450) { colorName = 'Indigo'; }
            else if (wl < 480) { colorName = 'Blue'; }
            else if (wl < 495) { colorName = 'Cyan'; }
            else if (wl < 550) { colorName = 'Green'; }
            else if (wl < 570) { colorName = 'Yellow-Green'; }
            else if (wl < 590) { colorName = 'Yellow'; }
            else if (wl < 620) { colorName = 'Orange'; }
            else if (wl < 650) { colorName = 'Red'; }
            else { colorName = 'Deep Red'; }

            const colorHex = wavelengthToHex(hovered.wavelength);

            rows.push(['Color', (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                {colorName} 
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>({colorHex})</span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colorHex, display: 'inline-block' }} />
              </span>
            )]);
          }

          return (
            <div style={{
              position: 'absolute',
              left,
              top: Math.max(4, tooltipPos.y - 100),
              background: 'rgba(18,18,22,0.96)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderTop: `2px solid ${hovered.labelColor}`,
              borderRadius: '6px',
              padding: '10px 14px 12px',
              pointerEvents: 'none',
              zIndex: 10,
              minWidth: `${tooltipW}px`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
              fontFamily: 'system-ui, sans-serif',
            }}>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ color: hovered.labelColor, fontWeight: 600, fontSize: '13px', letterSpacing: '0.01em' }}>
                  {hovered.series} Series
                </div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '1px' }}>
                  n = {hovered.n1} → {hovered.n2}
                </div>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: '5px', columnGap: '12px' }}>
                {rows.map(([label, value]) => (
                  <Fragment key={label}>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', whiteSpace: 'nowrap' }}>{label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: '11px', textAlign: 'right' }}>{value}</span>
                  </Fragment>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Transition-state cross-sections ── */}
      {activeTransition && upperState && lowerState && (
        <div style={{
          marginTop: '10px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '10px'
        }}>
          <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: '12px', marginBottom: '8px' }}>
            Transition Cloud Cross-Sections ({activeTransition.n2}{orbitalLetter(upperState.l)} → {activeTransition.n1}{orbitalLetter(lowerState.l)})
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '8px',
              background: '#04070d',
              padding: '6px',
              width: `${SLICE_SIZE + 12}px`
            }}>
              {upperSliceUrl && (
                <img
                  src={upperSliceUrl}
                  alt={`Upper state ${upperState.n}${orbitalLetter(upperState.l)} cross-section`}
                  width={SLICE_SIZE}
                  height={SLICE_SIZE}
                  style={{ display: 'block', width: `${SLICE_SIZE}px`, height: `${SLICE_SIZE}px`, borderRadius: '5px' }}
                />
              )}
              <div style={{ marginTop: '5px', fontSize: '11px', color: 'rgba(255,255,255,0.66)', textAlign: 'center' }}>
                Initial: {upperState.n}{orbitalLetter(upperState.l)}
              </div>
            </div>

            <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: '20px', padding: '0 3px' }}>→</div>

            <div style={{
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '8px',
              background: '#04070d',
              padding: '6px',
              width: `${SLICE_SIZE + 12}px`
            }}>
              {lowerSliceUrl && (
                <img
                  src={lowerSliceUrl}
                  alt={`Lower state ${lowerState.n}${orbitalLetter(lowerState.l)} cross-section`}
                  width={SLICE_SIZE}
                  height={SLICE_SIZE}
                  style={{ display: 'block', width: `${SLICE_SIZE}px`, height: `${SLICE_SIZE}px`, borderRadius: '5px' }}
                />
              )}
              <div style={{ marginTop: '5px', fontSize: '11px', color: 'rgba(255,255,255,0.66)', textAlign: 'center' }}>
                Final: {lowerState.n}{orbitalLetter(lowerState.l)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '7px', color: 'rgba(255,255,255,0.45)', fontSize: '10px' }}>
            Cross-section plane: y = 0. Click a spectrum line to pin a transition.
          </div>
        </div>
      )}
    </div>
  );
}
