"use client";

import * as d3 from 'd3';
import { useMemo } from 'react';
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

function buildChart(
  data: Point[],
  xDomain: [number, number],
  xTicksCount: number,
  yTicksCount: number,
  xFormatter?: (value: number) => string
) {
  const width = 760;
  const height = 230;
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

function Chart({
  title,
  subtitle,
  xLabel,
  yLabel,
  chart,
}: {
  title: string;
  subtitle: string;
  xLabel: string;
  yLabel: string;
  chart: ReturnType<typeof buildChart>;
}) {
  return (
    <section className="wavePlotCard">
      <header className="wavePlotHead">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </header>

      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="wavePlotSvg" role="img" aria-label={title}>
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

  const radialChart = useMemo(() => {
    const rMax = radialData[radialData.length - 1]?.x ?? 1;
    return buildChart(radialData, [0, rMax], 6, 5);
  }, [radialData]);

  const angularData = useMemo(() => {
    const samples = 260;
    return d3.range(samples).map((i) => {
      const theta = (i / (samples - 1)) * Math.PI;
      return { x: theta, y: angularPart(l, m, theta) };
    });
  }, [l, m]);

  const angularChart = useMemo(
    () => buildChart(angularData, [0, Math.PI], 5, 5, thetaTickLabel),
    [angularData]
  );

  return (
    <div className="wavePlotsGrid">
      <Chart
        title="Radial"
        subtitle={`R_${n}${l}(r)`}
        xLabel="r (a0)"
        yLabel="R_nl(r)"
        chart={radialChart}
      />
      <Chart
        title="Angular"
        subtitle={`Y_${l}${m}(theta, phi=0) core`}
        xLabel="theta"
        yLabel="A_lm(theta)"
        chart={angularChart}
      />
    </div>
  );
}
