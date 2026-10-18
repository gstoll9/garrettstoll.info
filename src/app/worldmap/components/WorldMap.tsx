'use client'
import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import { wikiTitleFor } from '../lib/countryNames';

export type Country = {
  key: string;
  name: string;
  feature: Feature<Geometry, { name: string }>;
};

// Properties of a subregion (admin-1: states, provinces) or district (admin-2: counties, ...)
export type SubregionProps = {
  name: string;
  type: string | null;
  // Wikidata QID, used to find the exact English Wikipedia article
  wikidata: string | null;
  // Explicit Wikipedia title, for subregions without a QID
  wiki?: string | null;
  // [lon, lat] interior point for the map label
  label: [number, number];
  // Admin-1 only: names this subregion's admin-2 file
  id?: string;
};

export type Subregion = SubregionProps & {
  key: string;
  feature: Feature<Geometry, SubregionProps>;
};

// Screen area covered by the info panel; zooming centers in the remaining space
export type Insets = { right: number; bottom: number };

type MapLabel = {
  key: string;
  text: string;
  // 0 country, 1 subregion, 2 district
  level: 0 | 1 | 2;
  // Anchor and size of the labelled shape, in unzoomed projected pixels
  x: number;
  y: number;
  w: number;
  h: number;
};

type Props = {
  selectedKey: string | null;
  onSelect: (country: Country | null) => void;
  subregions: Subregion[];
  selectedSubKey: string | null;
  onSelectSubregion: (sub: Subregion) => void;
  districts: Subregion[];
  selectedDistrictKey: string | null;
  onSelectDistrict: (d: Subregion) => void;
  onLoad?: (countries: Country[]) => void;
  insets: Insets;
};

export default function WorldMap({
  selectedKey, onSelect, subregions, selectedSubKey, onSelectSubregion,
  districts, selectedDistrictKey, onSelectDistrict, onLoad, insets,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const labelsRef = useRef<SVGGElement>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [countries, setCountries] = useState<Country[]>([]);

  // Load the topology lazily so the ~750KB JSON is its own chunk
  useEffect(() => {
    import('world-atlas/countries-50m.json').then(mod => {
      const topo = (mod.default ?? mod) as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
      const fc = feature(topo, topo.objects.countries);
      const list = fc.features.map((f, i) => ({
        key: f.id != null ? `${f.id}-${f.properties.name}` : `${f.properties.name}-${i}`,
        name: f.properties.name,
        feature: f as Country['feature'],
      }));
      setCountries(list);
      onLoad?.(list);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { projection, path } = useMemo(() => {
    const projection = d3.geoNaturalEarth1().fitExtent(
      [[8, 8], [Math.max(size.width - 8, 9), Math.max(size.height - 8, 9)]],
      { type: 'Sphere' },
    );
    return { projection, path: d3.geoPath(projection) };
  }, [size.width, size.height]);

  const paths = useMemo(
    () => countries.map(c => ({ key: c.key, d: path(c.feature) ?? '' })),
    [countries, path],
  );
  const subPaths = useMemo(
    () => subregions.map(s => ({ key: s.key, d: path(s.feature) ?? '' })),
    [subregions, path],
  );
  const districtPaths = useMemo(
    () => districts.map(s => ({ key: s.key, d: path(s.feature) ?? '' })),
    [districts, path],
  );
  const labels = useMemo(() => {
    const out: MapLabel[] = [];
    const add = (key: string, text: string, level: MapLabel['level'], f: Feature<Geometry>, anchor: [number, number]) => {
      const p = projection(anchor);
      const poly = largestPolygon(f);
      const [[x0, y0], [x1, y1]] = path.bounds(poly);
      if (p) out.push({ key, text, level, x: p[0], y: p[1], w: x1 - x0, h: y1 - y0 });
    };
    // A shape whose children are drawn gives up its label to them
    for (const d of districts) add(d.key, d.name, 2, d.feature, d.label);
    for (const s of subregions) {
      if (s.key === selectedSubKey && districts.length) continue;
      add(s.key, s.name, 1, s.feature, s.label);
    }
    for (const c of countries) {
      if (c.key === selectedKey && subregions.length) continue;
      const wiki = wikiTitleFor(c.name);
      add(c.key, wiki.length < c.name.length ? wiki : c.name, 0, c.feature, interiorPoint(largestPolygon(c.feature)));
    }
    // Deeper levels claim label space first, then bigger shapes
    return out.sort((a, b) => b.level - a.level || b.w * b.h - a.w * a.h);
  }, [countries, subregions, districts, selectedKey, selectedSubKey, projection, path]);

  // Positions labels for the current zoom; a label shows only if it fits inside its
  // shape and doesn't overlap a label placed before it.
  const layoutLabels = () => {
    const g = labelsRef.current;
    if (!g) return;
    const t = transformRef.current;
    const placed: [number, number, number, number][] = [];
    labels.forEach((l, i) => {
      const el = g.children[i] as SVGTextElement | undefined;
      if (!el) return;
      const sw = l.w * t.k;
      const sh = l.h * t.k;
      // Labels grow with zoom level, and big shapes get bigger labels still
      const fs =
        l.level === 2 ? Math.min(20, Math.max(9 * t.k ** 0.2, Math.sqrt(sw * sh) / 9))
        : l.level === 1 ? Math.min(24, Math.max(10 * t.k ** 0.25, Math.sqrt(sw * sh) / 9))
        : Math.min(32, Math.max(10 * t.k ** 0.3, Math.sqrt(sw * sh) / 11));
      const tw = l.text.length * fs * 0.58;
      const [x, y] = t.apply([l.x, l.y]);
      const box: [number, number, number, number] = [x - tw / 2 - 2, y - fs / 2 - 1, x + tw / 2 + 2, y + fs / 2 + 1];
      const visible =
        // Subregion labels may overhang their shape a little; collisions still keep them apart
        tw <= sw * (l.level ? 1.4 : 0.95) && fs <= sh * (l.level ? 1.2 : 0.9) &&
        box[0] >= 0 && box[2] <= size.width - insets.right && box[1] >= 0 && box[3] <= size.height - insets.bottom &&
        !placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
      if (visible) placed.push(box);
      el.style.display = visible ? '' : 'none';
      el.setAttribute('x', String(x));
      el.setAttribute('y', String(y));
      el.style.fontSize = `${fs}px`;
    });
  };
  const layoutRef = useRef(layoutLabels);
  layoutRef.current = layoutLabels;
  useEffect(() => { layoutRef.current(); }, [labels]);

  const sphere = useMemo(() => path({ type: 'Sphere' }) ?? '', [path]);
  const graticule = useMemo(() => path(d3.geoGraticule10()) ?? '', [path]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 600])
      .translateExtent([[0, 0], [size.width, size.height]])
      .on('zoom', e => {
        d3.select(gRef.current).attr('transform', e.transform.toString());
        transformRef.current = e.transform;
        layoutRef.current();
      });
    zoomRef.current = zoom;
    d3.select(svg).call(zoom).on('dblclick.zoom', null);
    return () => { d3.select(svg).on('.zoom', null); };
  }, [size.width, size.height]);

  // Zoom to the most specific selection, else the whole world
  useEffect(() => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom || !size.width) return;
    const sel = d3.select(svg).transition().duration(750);
    const district = districts.find(d => d.key === selectedDistrictKey);
    const sub = subregions.find(s => s.key === selectedSubKey);
    const country = countries.find(c => c.key === selectedKey);
    const target = district?.feature ?? sub?.feature ?? country?.feature;
    if (!target) {
      sel.call(zoom.transform, d3.zoomIdentity);
      return;
    }
    const [[x0, y0], [x1, y1]] = path.bounds(largestPolygon(target));
    const availW = Math.max(size.width - insets.right, size.width * 0.4);
    const availH = Math.max(size.height - insets.bottom, size.height * 0.3);
    // Smaller units get a looser fit so their neighbours stay visible
    const fill = district ? 0.35 : sub ? 0.6 : 0.75;
    const k = Math.min(sub ? 400 : 20, fill / Math.max((x1 - x0) / availW, (y1 - y0) / availH));
    sel.call(
      zoom.transform,
      d3.zoomIdentity
        .translate(availW / 2, availH / 2)
        .scale(Math.max(1, k))
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
    );
  }, [selectedKey, selectedSubKey, selectedDistrictKey, countries, subregions, districts, path, size.width, size.height, insets.right, insets.bottom]);

  // Tooltip is updated imperatively so mouse moves don't re-render every path
  const moveTooltip = (e: React.MouseEvent, text: string) => {
    const tip = tooltipRef.current;
    const box = containerRef.current;
    if (!tip || !box) return;
    const r = box.getBoundingClientRect();
    tip.textContent = text;
    tip.style.display = 'block';
    tip.style.left = `${e.clientX - r.left + 12}px`;
    tip.style.top = `${e.clientY - r.top + 12}px`;
  };
  const hideTooltip = () => { if (tooltipRef.current) tooltipRef.current.style.display = 'none'; };

  return (
    <div className="wm-map" ref={containerRef}>
      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        onClick={() => onSelect(null)}
      >
        <g ref={gRef}>
          <path className="wm-sphere" d={sphere} />
          <path className="wm-graticule" d={graticule} />
          {paths.map((p, i) => (
            <path
              key={p.key}
              d={p.d}
              className={`wm-country${p.key === selectedKey ? ' wm-selected' : ''}`}
              onClick={e => { e.stopPropagation(); onSelect(countries[i]); }}
              onMouseMove={e => moveTooltip(e, countries[i].name)}
              onMouseLeave={hideTooltip}
            />
          ))}
          <g className={`wm-subregions${districts.length ? ' wm-dimmed' : ''}`}>
            {subPaths.map((p, i) => (
              <path
                key={p.key}
                d={p.d}
                className={`wm-subregion${p.key === selectedSubKey ? ' wm-selected' : ''}`}
                onClick={e => { e.stopPropagation(); onSelectSubregion(subregions[i]); }}
                onMouseMove={e => {
                  const s = subregions[i];
                  moveTooltip(e, s.type ? `${s.name} · ${s.type}` : s.name);
                }}
                onMouseLeave={hideTooltip}
              />
            ))}
          </g>
          <g className="wm-districts">
            {districtPaths.map((p, i) => (
              <path
                key={p.key}
                d={p.d}
                className={`wm-district${p.key === selectedDistrictKey ? ' wm-selected' : ''}`}
                onClick={e => { e.stopPropagation(); onSelectDistrict(districts[i]); }}
                onMouseMove={e => {
                  const d = districts[i];
                  moveTooltip(e, d.type ? `${d.name} · ${d.type}` : d.name);
                }}
                onMouseLeave={hideTooltip}
              />
            ))}
          </g>
        </g>
        <g className="wm-labels" ref={labelsRef}>
          {labels.map(l => (
            <text
              key={l.key}
              className={`${LABEL_CLASS[l.level]}${l.key === selectedSubKey || l.key === selectedDistrictKey ? ' wm-selected' : ''}`}
              style={{ display: 'none' }}
            >
              {l.text}
            </text>
          ))}
        </g>
      </svg>
      <div className="wm-tooltip" ref={tooltipRef} />
      {countries.length === 0 && <div className="wm-loading">Loading map…</div>}
    </div>
  );
}

const LABEL_CLASS = ['wm-label-country', 'wm-label-sub', 'wm-label-district'] as const;

// Countries like the US, France or Russia have far-flung territories; framing or labelling
// their full extent misplaces things, so use the largest polygon instead.
function largestPolygon(f: Feature<Geometry>): Feature<Geometry> {
  const g = f.geometry;
  if (g.type !== 'MultiPolygon') return f;
  let best: Feature<Geometry> = f;
  let bestArea = -1;
  for (const coords of g.coordinates) {
    const poly: Feature<Geometry> = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: coords } };
    const a = d3.geoArea(poly);
    if (a > bestArea) { bestArea = a; best = poly; }
  }
  return best;
}

// Centroid if it lies inside the shape (most countries); otherwise the grid point inside
// the shape nearest the centroid, for crescent-shaped countries like Croatia
function interiorPoint(f: Feature<Geometry>): [number, number] {
  const c = d3.geoCentroid(f);
  if (d3.geoContains(f, c)) return c;
  const [[x0, y0], [x1, y1]] = d3.geoBounds(f);
  let best = c;
  let bestDist = Infinity;
  const n = 12;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const p: [number, number] = [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * j) / n];
      if (!d3.geoContains(f, p)) continue;
      const d = d3.geoDistance(p, c);
      if (d < bestDist) { bestDist = d; best = p; }
    }
  }
  return best;
}
