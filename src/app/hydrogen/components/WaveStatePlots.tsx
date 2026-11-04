"use client";

import * as d3 from 'd3';
import { useEffect, useMemo, useRef, useState } from 'react';
import { radialWavefunction } from '../utils/hydrogenCloud';

interface WaveStatePlotsProps {
  n: number;
  l: number;
  m: number;
  Z?: number;
}

type Point = { x: number; y: number };

function factorial(value: number): number {
  if (value <= 1) return 1;
  let out = 1;
  for (let i = 2; i <= value; i++) out *= i;
  return out;
}

function associatedLegendre(l: number, mAbs: number, x: number): number {
  if (mAbs > l) return 0;

  let pmm = 1;
  if (mAbs > 0) {
    const somx2 = Math.sqrt(Math.max(0, (1 - x) * (1 + x)));
    let fact = 1;
    for (let i = 1; i <= mAbs; i++) {
      pmm *= -fact * somx2;
      fact += 2;
    }
  }

  if (l === mAbs) return pmm;

  let pmmp1 = x * (2 * mAbs + 1) * pmm;
  if (l === mAbs + 1) return pmmp1;

  let pll = 0;
  for (let ll = mAbs + 2; ll <= l; ll++) {
    pll = (x * (2 * ll - 1) * pmmp1 - (ll + mAbs - 1) * pmm) / (ll - mAbs);
    pmm = pmmp1;
    pmmp1 = pll;
  }

  return pll;
}

function angularPart(l: number, m: number, theta: number): number {
  const absM = Math.abs(m);
  const norm = Math.sqrt(
    ((2 * l + 1) * factorial(l - absM)) / (4 * Math.PI * factorial(l + absM))
  );
  const p = associatedLegendre(l, absM, Math.cos(theta));
  return norm * p;
}

// Charts are drawn at their real pixel size (not a fixed viewBox scaled to fit), so
// tick labels stay legible from a phone-width single column to a wide two-column grid.
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

function buildChart(
  data: Point[],
  xDomain: [number, number],
  xTicksCount: number,
  yTicksCount: number,
  xFormatter: ((value: number) => string) | undefined,
  width: number,
  height: number
) {
  // Fewer ticks when narrow so labels don't collide.
  if (width < 360) xTicksCount = Math.min(xTicksCount, 4);
  if (height < 160) yTicksCount = Math.min(yTicksCount, 3);
  const margin = { top: 16, right: 18, bottom: 34, left: 52 };

  const x = d3.scaleLinear().domain(xDomain).range([margin.left, width - margin.right]);

  const yExtent = d3.extent(data, (d) => d.y);
  const yMin = yExtent[0] ?? -1;
  const yMax = yExtent[1] ?? 1;
  const same = Math.abs(yMax - yMin) < 1e-12;
  const padding = same ? 1 : 0.12 * (yMax - yMin);
  const y = d3
    .scaleLinear()
    .domain([yMin - padding, yMax + padding])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const line = d3
    .line<Point>()
    .x((d) => x(d.x))
    .y((d) => y(d.y))
    .curve(d3.curveMonotoneX);

  const path = line(data) ?? '';
  const xTicks = x.ticks(xTicksCount);
  const yTicks = y.ticks(yTicksCount);
  const zeroY = y(0);

  return {
    width,
    height,
    margin,
    path,
    xTicks,
    yTicks,
    x,
    y,
    zeroY,
    xTickLabel: (value: number) => (xFormatter ? xFormatter(value) : d3.format('.2~g')(value)),
  };
}

function thetaTickLabel(theta: number): string {
  const eps = 1e-6;
  if (Math.abs(theta) < eps) return '0';
  if (Math.abs(theta - Math.PI / 2) < eps) return 'pi/2';
  if (Math.abs(theta - Math.PI) < eps) return 'pi';
  return d3.format('.2f')(theta);
}

type ChartSpec = {
  data: Point[];
  xDomain: [number, number];
  xTicks: number;
  yTicks: number;
  xFormatter?: (value: number) => string;
};

function Chart({
  title,
  subtitle,
  xLabel,
  yLabel,
  spec,
}: {
  title: string;
  subtitle: string;
  xLabel: string;
  yLabel: string;
  spec: ChartSpec;
}) {
  const [boxRef, size] = useElementSize<HTMLDivElement>();
  const chart = useMemo(
    () => buildChart(spec.data, spec.xDomain, spec.xTicks, spec.yTicks, spec.xFormatter,
      Math.max(160, size.width), Math.max(120, size.height)),
    [spec, size.width, size.height]
  );

  return (
    <section className="wavePlotCard">
      <header className="wavePlotHead">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </header>

      <div ref={boxRef} className="wavePlotSvg">
      {size.width > 0 && (
      <svg width={chart.width} height={chart.height} style={{ display: 'block' }} role="img" aria-label={title}>
        <rect x={0} y={0} width={chart.width} height={chart.height} fill="transparent" />

        {chart.yTicks.map((t) => (
          <g key={`y-${t}`}>
            <line
              x1={chart.margin.left}
              x2={chart.width - chart.margin.right}
              y1={chart.y(t)}
              y2={chart.y(t)}
              className="waveGridLine"
            />
            <text x={chart.margin.left - 8} y={chart.y(t) + 4} textAnchor="end" className="waveTickText">
              {d3.format('.2~g')(t)}
            </text>
          </g>
        ))}

        {chart.xTicks.map((t) => (
          <g key={`x-${t}`}>
            <line
              x1={chart.x(t)}
              x2={chart.x(t)}
              y1={chart.margin.top}
              y2={chart.height - chart.margin.bottom}
              className="waveGridLine"
            />
            <text x={chart.x(t)} y={chart.height - chart.margin.bottom + 18} textAnchor="middle" className="waveTickText">
              {chart.xTickLabel(t)}
            </text>
          </g>
        ))}

        <line
          x1={chart.margin.left}
          x2={chart.width - chart.margin.right}
          y1={chart.zeroY}
          y2={chart.zeroY}
          className="waveAxisZero"
        />

        <path d={chart.path} className="waveDataPath" />

        <text x={(chart.margin.left + chart.width - chart.margin.right) / 2} y={chart.height - 6} textAnchor="middle" className="waveAxisLabel">
          {xLabel}
        </text>
        <text
          x={16}
          y={(chart.margin.top + chart.height - chart.margin.bottom) / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${(chart.margin.top + chart.height - chart.margin.bottom) / 2})`}
          className="waveAxisLabel"
        >
          {yLabel}
        </text>
      </svg>
      )}
      </div>
    </section>
  );
}

export default function WaveStatePlots({ n, l, m, Z = 1 }: WaveStatePlotsProps) {
  const radialData = useMemo(() => {
    const rMax = Math.max(8, (n * n * 6) / Z);
    const samples = 260;
    return d3.range(samples).map((i) => {
      const r = (i / (samples - 1)) * rMax;
      return { x: r, y: radialWavefunction(n, l, r, Z) };
    });
  }, [n, l, Z]);

  const radialChart = useMemo<ChartSpec>(() => {
    const rMax = radialData[radialData.length - 1]?.x ?? 1;
    return { data: radialData, xDomain: [0, rMax], xTicks: 6, yTicks: 5 };
  }, [radialData]);

  const angularData = useMemo(() => {
    const samples = 260;
    return d3.range(samples).map((i) => {
      const theta = (i / (samples - 1)) * Math.PI;
      return { x: theta, y: angularPart(l, m, theta) };
    });
  }, [l, m]);

  const angularChart = useMemo<ChartSpec>(
    () => ({ data: angularData, xDomain: [0, Math.PI], xTicks: 5, yTicks: 5, xFormatter: thetaTickLabel }),
    [angularData]
  );

  return (
    <div className="wavePlotsGrid">
      <Chart
        title="Radial"
        subtitle={`R_${n}${l}(r)`}
        xLabel="r (a0)"
        yLabel="R_nl(r)"
        spec={radialChart}
      />
      <Chart
        title="Angular"
        subtitle={`Y_${l}${m}(theta, phi=0) core`}
        xLabel="theta"
        yLabel="A_lm(theta)"
        spec={angularChart}
      />
    </div>
  );
}
