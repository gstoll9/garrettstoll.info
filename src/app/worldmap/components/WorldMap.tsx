'use client'
// The map itself: a MapLibre GL globe over an OpenStreetMap / Sentinel-2 basemap
// (public/worldmap/basemap/style.json, built by scripts/build-basemap-style.mjs), with the
// page's own countries, subregions, districts, labels, capitals and trade arcs drawn as
// GeoJSON layers on top. Country fills fade as you zoom in so streets or imagery show through.
import { useEffect, useMemo, useRef, useState } from 'react';
// The CSP build, with its worker served from public/ (copied by build-basemap-style.mjs):
// Next's bundler breaks the worker the default build inlines, and the map never loads
import maplibregl from 'maplibre-gl/dist/maplibre-gl-csp';
import type { ExpressionSpecification, GeoJSONSource, LngLatBoundsLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { wikiTitleFor } from '../lib/countryNames';
import type { Capital } from '../lib/db';
import { TradeArcs, arcFeatures } from './TradeArcs';
import { PeriodFeature, Period, periodsAt } from '../lib/history';
import type { FocusCategory, FocusPoint } from '../lib/focus';

export type Country = {
  key: string;
  name: string;
  feature: Feature<Geometry, { name: string } | Period>;
  // Set on a historical (time slider) country: the CShapes period drawn
  period?: Period;
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

export type Basemap = 'streets' | 'satellite';

type Choropleth = { level: 0 | 1 | 2; fills: Map<string, string>; labels: Map<string, string> };

type Props = {
  selectedKey: string | null;
  onSelect: (country: Country | null) => void;
  subregions: Subregion[];
  selectedSubKey: string | null;
  onSelectSubregion: (sub: Subregion) => void;
  districts: Subregion[];
  selectedDistrictKey: string | null;
  onSelectDistrict: (d: Subregion) => void;
  // Capital(s) of the selected region, marked on the map
  capitals: Capital[];
  // Data colouring of one level's shapes: fill colour and tooltip value per shape key
  choropleth: Choropleth | null;
  // Trade flows from the selected country to its partners; the map zooms out to show them
  arcs?: TradeArcs | null;
  // Called with the countries drawn, whenever they change (load, or a new year)
  onLoad?: (countries: Country[]) => void;
  insets: Insets;
  // Year shown, or null for the present-day map; historical years draw `history`
  year: number | null;
  history: PeriodFeature[] | null;
  basemap: Basemap;
  onBasemapChange: (b: Basemap) => void;
  // Places of the active focus (already filtered by category and year), and its categories
  facilities: FocusPoint[];
  focusCategories: FocusCategory[];
  selectedFacilityId: string | null;
  onSelectFacility: (f: FocusPoint) => void;
};

// Our layers, bottom to top. Fills and outlines go under the basemap's labels; our own
// labels, arcs and capitals go above everything.
const LEVELS = [
  { id: 'countries', fill: '#34466a', hover: '#5b7bb0', selected: '#e0a43a', dim: '#34466a', line: '#0b1220' },
  { id: 'subregions', fill: '#c98f2e', hover: '#e8b558', selected: '#ffd98a', dim: '#8a6a32', line: '#0b1220' },
  { id: 'districts', fill: '#f2c46d', hover: '#ffe3a6', selected: '#fff4d6', dim: '#f2c46d', line: '#5a3c0a' },
] as const;
type LevelId = typeof LEVELS[number]['id'];

// Fill opacity by zoom, per level: solid on the globe, then fading so the basemap shows.
// Satellite mode is lighter throughout; coloured (choropleth) shapes stay more opaque.
const FADE: Record<LevelId, [number, number][]> = {
  countries: [[2, 0.92], [4, 0.6], [6.5, 0.1]],
  subregions: [[3, 0.9], [5.5, 0.5], [8, 0.1]],
  districts: [[6, 0.8], [8.5, 0.4], [11, 0.08]],
};
const opacityExpr = (level: LevelId, basemap: Basemap, choro: boolean): ExpressionSpecification => {
  const scale = basemap === 'satellite' ? 0.45 : 1;
  const stops = FADE[level].flatMap(([z, o], i) => {
    const base = Math.min(1, o * scale + (choro ? (i ? 0.3 : 0) : 0));
    // Selected shapes stay visible a little longer than their neighbours
    return [z, ['case', ['boolean', ['feature-state', 'selected'], false], Math.max(base, 0.35 * scale + 0.1), base]];
  });
  return ['interpolate', ['linear'], ['zoom'], ...stops] as ExpressionSpecification;
};

maplibregl.setWorkerUrl(`/worldmap/vendor/maplibre-gl-csp-worker-${maplibregl.getVersion()}.js`);

// Latitude past which MapLibre renders nothing (its tiles stop at ±85.05°)
const POLAR_EDGE = 85;

const FONT = ['Noto Sans Regular'];
const FONT_BOLD = ['Noto Sans Bold'];

export default function WorldMap({
  selectedKey, onSelect, subregions, selectedSubKey, onSelectSubregion,
  districts, selectedDistrictKey, onSelectDistrict, capitals, choropleth, arcs, onLoad, insets, year, history, basemap, onBasemapChange,
  facilities, focusCategories, selectedFacilityId, onSelectFacility,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [modern, setModern] = useState<Country[]>([]);
  const [land, setLand] = useState<Feature<Geometry> | null>(null);

  // Country shapes: world-atlas's countries-50m.json, served from public/ (copied by
  // scripts/build-admin1.mjs) so it loads as a static file rather than a code chunk
  useEffect(() => {
    fetch('/worldmap/countries-50m.json').then(r => r.json()).then(json => {
      const topo = json as Topology<{ countries: GeometryCollection<{ name: string }> }>;
      const fc = feature(topo, topo.objects.countries);
      setModern(fc.features.map((f, i) => ({
        key: f.id != null ? `${f.id}-${f.properties.name}` : `${f.properties.name}-${i}`,
        name: f.properties.name,
        feature: f as Country['feature'],
      })));
      const landTopo = json as Topology<{ land: GeometryCollection }>;
      setLand(feature(landTopo, landTopo.objects.land) as unknown as Feature<Geometry>);
    });
  }, []);

  // A historical country keeps its key across periods (the territory's Gleditsch–Ward
  // code), so a selection follows it through border and regime changes
  const countries = useMemo<Country[]>(() => {
    if (year == null) return modern;
    if (!history) return [];
    return periodsAt(history, year).map(f => ({
      key: `gw-${f.properties.g}`,
      name: f.properties.n,
      feature: f,
      period: f.properties,
    }));
  }, [year, history, modern]);
  useEffect(() => {
    if (countries.length) onLoad?.(countries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries]);

  // Latest props for the map's event handlers, which are registered once
  const live = useRef({ countries, subregions, districts, choropleth, onSelect, onSelectSubregion, onSelectDistrict, arcs, facilities, onSelectFacility });
  live.current = { countries, subregions, districts, choropleth, onSelect, onSelectSubregion, onSelectDistrict, arcs, facilities, onSelectFacility };

  // ── Map setup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const map = new maplibregl.Map({
      container: el,
      style: '/worldmap/basemap/style.json',
      center: [15, 22],
      zoom: worldZoom(el.clientWidth, el.clientHeight),
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      maxZoom: 18,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    // style.load, not load: our shapes don't need to wait for every basemap tile
    map.once('style.load', () => {
      const labelsStart = (map.getStyle().metadata as Record<string, string> | undefined)?.['wm:labels-start'];
      const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
      const addSource = (id: string) => map.addSource(id, { type: 'geojson', data: empty, promoteId: 'key' });

      map.addSource('graticule', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: d3.geoGraticule10() } });
      map.addLayer({
        id: 'wm-graticule', type: 'line', source: 'graticule',
        paint: { 'line-color': '#3a5384', 'line-width': 0.6, 'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.35, 4, 0] },
      }, labelsStart);

      addSource('land');
      map.addLayer({
        id: 'wm-land', type: 'fill', source: 'land',
        paint: { 'fill-color': '#111a2b', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.9, 7, 0.2] },
      }, labelsStart);

      for (const lvl of LEVELS) {
        addSource(lvl.id);
        const state = (s: string) => ['boolean', ['feature-state', s], false] as ExpressionSpecification;
        map.addLayer({
          id: `wm-${lvl.id}-fill`, type: 'fill', source: lvl.id,
          paint: {
            // Data colouring wins; hover and selection are then shown by the outline
            'fill-color': ['case',
              ['has', 'fill'], ['get', 'fill'],
              state('selected'), lvl.selected,
              state('hover'), lvl.hover,
              ['boolean', ['get', 'dim'], false], lvl.dim,
              lvl.fill],
            'fill-opacity': opacityExpr(lvl.id, 'streets', false),
          },
        }, labelsStart);
        map.addLayer({
          id: `wm-${lvl.id}-line`, type: 'line', source: lvl.id,
          layout: { 'line-join': 'round' },
          paint: {
            'line-color': ['case', state('selected'), '#ffffff', state('hover'), '#dfe7f5', lvl.line],
            'line-width': ['case', state('selected'), 2.2, state('hover'), 1.4, lvl.id === 'countries' ? 0.7 : 0.6],
            'line-opacity': ['case', state('selected'), 1, 0.85],
          },
        }, labelsStart);
      }

      addSource('arcs');
      map.addLayer({
        id: 'wm-arcs', type: 'line', source: 'arcs',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          // Raw and produced arcs of one partner run side by side
          'line-offset': ['get', 'offset'],
          'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.82],
        },
      });
      // Wide invisible copies make thin arcs easy to hover
      map.addLayer({ id: 'wm-arcs-hit', type: 'line', source: 'arcs', paint: { 'line-width': 12, 'line-opacity': 0 } });
      addSource('arc-ends');
      map.addLayer({
        id: 'wm-arc-ends', type: 'circle', source: 'arc-ends',
        paint: { 'circle-radius': 3, 'circle-color': '#e6ebf3', 'circle-stroke-color': '#0b1220', 'circle-stroke-width': 1 },
      });

      const labelLayer = (id: string, source: string, size: ExpressionSpecification, opts: { min?: number; max?: number; bold?: boolean; color: string; filter?: ExpressionSpecification }) =>
        map.addLayer({
          id, type: 'symbol', source, minzoom: opts.min ?? 0, maxzoom: opts.max ?? 24,
          ...(opts.filter ? { filter: opts.filter } : {}),
          layout: {
            'text-field': ['get', 'text'],
            'text-font': opts.bold ? FONT_BOLD : FONT,
            'text-size': size,
            'text-max-width': 8,
            'text-letter-spacing': 0.02,
            'text-padding': 3,
            // Bigger shapes claim label space first
            'symbol-sort-key': ['-', 0, ['get', 'rank']],
          },
          paint: { 'text-color': opts.color, 'text-halo-color': 'rgba(8, 13, 24, 0.9)', 'text-halo-width': 1.4, 'text-halo-blur': 0.3 },
        });
      for (const lvl of LEVELS) addSource(`${lvl.id}-labels`);
      // Label size grows with zoom and with the shape's area (rank = ln of its area)
      const sized = (stops: [number, number, number][]): ExpressionSpecification => ['interpolate', ['linear'], ['zoom'],
        ...stops.flatMap(([z, small, big]) => [z, ['interpolate', ['linear'], ['get', 'rank'], -11, small, -1, big]])] as ExpressionSpecification;
      labelLayer('wm-districts-labels', 'districts-labels', sized([[5, 9, 12], [10, 11, 16], [14, 13, 20]]), { min: 4, color: '#fff3d6' });
      labelLayer('wm-subregions-labels', 'subregions-labels', sized([[2, 9, 12], [6, 11, 17], [10, 13, 22]]), { max: 12, color: '#fbe3b3', bold: true });
      // Small countries and islands are only labelled once zoomed in a little
      const SMALL = -7.5;
      labelLayer('wm-countries-labels', 'countries-labels', sized([[1, 8, 15], [4, 10, 22], [7, 13, 28]]),
        { max: 8, color: '#e8edf5', bold: true, filter: ['>=', ['get', 'rank'], SMALL] });
      labelLayer('wm-countries-labels-small', 'countries-labels', sized([[1, 8, 15], [4, 10, 22], [7, 13, 28]]),
        { min: 3.5, max: 8, color: '#e8edf5', bold: true, filter: ['<', ['get', 'rank'], SMALL] });

      addSource('capitals');
      map.addLayer({
        id: 'wm-capitals-dot', type: 'circle', source: 'capitals',
        paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-color': '#e0a43a', 'circle-stroke-width': 2.5 },
      });
      map.addLayer({
        id: 'wm-capitals-label', type: 'symbol', source: 'capitals',
        layout: {
          'text-field': ['get', 'text'], 'text-font': FONT_BOLD, 'text-size': 13,
          'text-anchor': 'left', 'text-offset': [0.9, 0], 'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(8, 13, 24, 0.95)', 'text-halo-width': 1.6 },
      });
      // Focus places: dots coloured by category, bigger for ones with a Wikipedia article;
      // labelled once zoomed in (notable ones first)
      addSource('focus');
      const notable = ['==', ['get', 'notable'], 1] as ExpressionSpecification;
      const selectedF = ['boolean', ['feature-state', 'selected'], false] as ExpressionSpecification;
      map.addLayer({
        id: 'wm-focus-dots', type: 'circle', source: 'focus',
        // Notable places draw on top (feature-state isn't allowed in layout properties)
        layout: { 'circle-sort-key': ['get', 'notable'] },
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            1, ['case', selectedF, 7, notable, 3.4, 1.8],
            6, ['case', selectedF, 10, notable, 6, 3.4],
            12, ['case', selectedF, 13, notable, 9, 6]],
          'circle-opacity': ['case', ['==', ['get', 'closed'], 1], 0.45, 0.95],
          'circle-stroke-color': ['case', selectedF, '#ffffff', ['boolean', ['feature-state', 'hover'], false], '#ffffff', 'rgba(8, 13, 24, 0.85)'],
          'circle-stroke-width': ['case', selectedF, 2.5, ['boolean', ['feature-state', 'hover'], false], 2, 0.8],
        },
      });
      const focusLabel = (id: string, minzoom: number, filter: ExpressionSpecification) => map.addLayer({
        id, type: 'symbol', source: 'focus', minzoom, filter,
        layout: {
          'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 11.5,
          'text-anchor': 'left', 'text-offset': [0.9, 0], 'text-max-width': 12, 'text-optional': true,
          'symbol-sort-key': ['-', 0, ['get', 'notable']],
        },
        paint: { 'text-color': '#eef2f8', 'text-halo-color': 'rgba(8, 13, 24, 0.92)', 'text-halo-width': 1.4 },
      });
      focusLabel('wm-focus-labels', 4.5, notable);
      focusLabel('wm-focus-labels-minor', 8, ['!=', ['get', 'notable'], 1]);
      setReady(true);
    });

    // ── Pointer: the most specific shape under the cursor wins ───────────────
    const hitLayers = ['wm-focus-dots', 'wm-arcs-hit', 'wm-districts-fill', 'wm-subregions-fill', 'wm-countries-fill', 'wm-land'];
    const topHit = (point: maplibregl.PointLike) => {
      const layers = hitLayers.filter(l => map.getLayer(l));
      const hits = map.queryRenderedFeatures(point, { layers });
      return hitLayers.map(l => hits.find(h => h.layer.id === l)).find(Boolean) ?? null;
    };
    let hovered: { source: string; id: string | number } | null = null;
    const setHover = (next: typeof hovered) => {
      if (hovered && (hovered.source !== next?.source || hovered.id !== next?.id)) map.setFeatureState(hovered, { hover: false });
      if (next) map.setFeatureState(next, { hover: true });
      hovered = next;
    };
    map.on('mousemove', e => {
      const hit = topHit(e.point);
      const tip = tooltipRef.current;
      if (!hit || hit.id == null) {
        setHover(null);
        map.getCanvas().style.cursor = '';
        if (tip) tip.style.display = 'none';
        return;
      }
      setHover(hit.layer.id === 'wm-land' ? null : { source: hit.source, id: hit.id });
      map.getCanvas().style.cursor = hit.layer.id === 'wm-land' ? '' : 'pointer';
      if (tip) {
        tip.textContent = tooltipText(hit.layer.id, hit.properties as Record<string, unknown>, live.current.choropleth);
        tip.style.display = 'block';
        tip.style.left = `${e.point.x + 14}px`;
        tip.style.top = `${e.point.y + 14}px`;
      }
    });
    map.on('movestart', () => { if (tooltipRef.current) tooltipRef.current.style.display = 'none'; });
    map.getCanvas().addEventListener('mouseleave', () => {
      setHover(null);
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    });
    map.on('click', e => {
      const hit = topHit(e.point);
      const key = hit?.properties?.key as string | undefined;
      const p = live.current;
      if (hit?.layer.id === 'wm-arcs-hit') return;
      if (hit?.layer.id === 'wm-focus-dots') { const f = p.facilities.find(x => x.id === key); if (f) return p.onSelectFacility(f); }
      if (hit?.layer.id === 'wm-districts-fill') { const d = p.districts.find(x => x.key === key); if (d) return p.onSelectDistrict(d); }
      if (hit?.layer.id === 'wm-subregions-fill') { const s = p.subregions.find(x => x.key === key); if (s) return p.onSelectSubregion(s); }
      if (hit?.layer.id === 'wm-countries-fill') { const c = p.countries.find(x => x.key === key); if (c) return p.onSelect(c); }
      p.onSelect(null);
    });

    return () => { map.remove(); mapRef.current = null; setReady(false); };
  }, []);

  // ── Data ───────────────────────────────────────────────────────────────────
  const setData = (id: string, data: FeatureCollection) => {
    (mapRef.current?.getSource(id) as GeoJSONSource | undefined)?.setData(data);
  };
  const fillFor = (level: 0 | 1 | 2, key: string) =>
    choropleth?.level === level ? choropleth.fills.get(key) : undefined;

  // Label anchors are expensive (interior points), so they're computed once per shape list
  const countryLabels = useMemo(() => countries.map(c => {
    const poly = largestPolygon(c.feature);
    const wiki = c.period ? c.name : wikiTitleFor(c.name);
    return { key: c.key, text: wiki.length < c.name.length ? wiki : c.name, at: interiorPoint(poly), rank: Math.log(d3.geoArea(poly) + 1e-12) };
  }), [countries]);
  const regionLabels = (list: Subregion[]) => list.map(s => ({
    key: s.key, text: s.name, at: s.label, rank: Math.log(d3.geoArea(largestPolygon(s.feature)) + 1e-12),
  }));
  const subLabels = useMemo(() => regionLabels(subregions), [subregions]);
  const districtLabels = useMemo(() => regionLabels(districts), [districts]);

  useEffect(() => {
    if (!ready) return;
    setData('countries', shapes(countries.map(c => ({ key: c.key, name: c.name, geometry: clampPolar(c.feature.geometry), fill: fillFor(0, c.key) }))));
    // A shape whose children are drawn gives up its label to them
    setData('countries-labels', points(countryLabels.filter(l => !(l.key === selectedKey && subregions.length))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, countries, countryLabels, choropleth, selectedKey, subregions.length]);
  useEffect(() => {
    if (!ready) return;
    setData('subregions', shapes(subregions.map(s => ({
      key: s.key, name: withType(s), geometry: s.feature.geometry, fill: fillFor(1, s.key),
      // While a subregion's districts are shown, its neighbours recede
      dim: districts.length > 0 && s.key !== selectedSubKey,
    }))));
    setData('subregions-labels', points(subLabels.filter(l => !(l.key === selectedSubKey && districts.length))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, subregions, subLabels, choropleth, selectedSubKey, districts.length]);
  useEffect(() => {
    if (!ready) return;
    setData('districts', shapes(districts.map(d => ({ key: d.key, name: withType(d), geometry: d.feature.geometry, fill: fillFor(2, d.key) }))));
    setData('districts-labels', points(districtLabels));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, districts, districtLabels, choropleth]);
  useEffect(() => {
    if (!ready) return;
    setData('land', { type: 'FeatureCollection', features: year != null && land ? [{ ...land, geometry: clampPolar(land.geometry), properties: { key: 'land' } }] : [] });
  }, [ready, year, land]);
  useEffect(() => {
    if (!ready) return;
    setData('capitals', points(capitals.map(c => ({ key: c.qid, text: c.name, at: [c.lon, c.lat] as [number, number], rank: 0 }))));
  }, [ready, capitals]);
  useEffect(() => {
    if (!ready) return;
    const { lines, ends } = arcs ? arcFeatures(arcs) : { lines: [], ends: [] };
    setData('arcs', { type: 'FeatureCollection', features: lines });
    setData('arc-ends', { type: 'FeatureCollection', features: ends });
  }, [ready, arcs]);

  // Selection state, re-applied whenever a level's data is replaced
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const sel: [LevelId, string | null, { key: string }[]][] = [
      ['countries', selectedKey, countries], ['subregions', selectedSubKey, subregions], ['districts', selectedDistrictKey, districts],
    ];
    for (const [source, key, list] of sel) {
      map.removeFeatureState({ source });
      if (key && list.some(x => x.key === key)) map.setFeatureState({ source, id: key }, { selected: true });
    }
  }, [ready, selectedKey, selectedSubKey, selectedDistrictKey, countries, subregions, districts, choropleth]);

  // Focus places
  const focusMeta = useMemo(() => new Map(focusCategories.map(c => [c.id, c])), [focusCategories]);
  useEffect(() => {
    if (!ready) return;
    setData('focus', {
      type: 'FeatureCollection',
      features: facilities.map(f => ({
        // MapLibre draws nothing past ±85° (the South Pole sites: IceCube, the South Pole
        // Telescope), so those dots sit on the 85° edge; the info box keeps the true position
        type: 'Feature', geometry: { type: 'Point', coordinates: [f.lon, Math.max(-POLAR_EDGE, Math.min(POLAR_EDGE, f.lat))] },
        properties: {
          key: f.id, name: f.name, color: focusMeta.get(f.cat)?.color ?? '#cbd5e1', catLabel: focusMeta.get(f.cat)?.label ?? '',
          notable: f.notable ? 1 : 0, closed: f.to != null ? 1 : 0,
        },
      })),
    });
  }, [ready, facilities, focusMeta]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.removeFeatureState({ source: 'focus' });
    if (selectedFacilityId && facilities.some(f => f.id === selectedFacilityId)) {
      map.setFeatureState({ source: 'focus', id: selectedFacilityId }, { selected: true });
    }
  }, [ready, selectedFacilityId, facilities]);

  // Basemap mode and fill opacity
  const roadOpacity = useRef(new Map<string, unknown>());
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    for (const layer of map.getStyle().layers) {
      const mode = (layer.metadata as Record<string, string> | undefined)?.['wm:mode'];
      if (mode === 'streets' || mode === 'satellite') {
        map.setLayoutProperty(layer.id, 'visibility', mode === basemap ? 'visible' : 'none');
      }
      // Basemap place names are today's (Kaliningrad, not Königsberg): hidden in past years
      if (layer.id.startsWith('place_')) map.setLayoutProperty(layer.id, 'visibility', year == null ? 'visible' : 'none');
      // Roads drawn over imagery are faint, so the imagery reads first
      if (mode === 'both' && layer.type === 'line') {
        const saved = roadOpacity.current;
        if (!saved.has(layer.id)) saved.set(layer.id, map.getPaintProperty(layer.id, 'line-opacity') ?? 1);
        map.setPaintProperty(layer.id, 'line-opacity', basemap === 'satellite' ? 0.3 : saved.get(layer.id));
      }
    }
    for (const lvl of LEVELS) {
      map.setPaintProperty(`wm-${lvl.id}-fill`, 'fill-opacity',
        opacityExpr(lvl.id, basemap, choropleth?.level === LEVELS.indexOf(lvl)));
      map.setPaintProperty(`wm-${lvl.id}-line`, 'line-color', basemap === 'satellite'
        ? ['case', ['boolean', ['feature-state', 'selected'], false], '#ffffff', 'rgba(255, 255, 255, 0.55)']
        : ['case', ['boolean', ['feature-state', 'selected'], false], '#ffffff', ['boolean', ['feature-state', 'hover'], false], '#dfe7f5', lvl.line]);
    }
  }, [ready, basemap, choropleth, year]);

  // ── Camera: fly to the most specific selection, else the whole globe. Not again when
  // only the year changed, so the view stays put while the time slider plays. ──────────
  const lastZoomRef = useRef('');
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!ready || !map || !el) return;
    const zoomKey = [selectedFacilityId, selectedKey, selectedSubKey, selectedDistrictKey, insets.right, insets.bottom, arcs ? 'arcs' : ''].join('|');
    const hasTarget = !selectedKey || countries.some(c => c.key === selectedKey);
    if (zoomKey === lastZoomRef.current || !hasTarget) return;
    lastZoomRef.current = zoomKey;
    const w = el.clientWidth, h = el.clientHeight;
    // Room for the search box, the time slider and the side panel or bottom sheet
    const padding = {
      top: Math.min(80, h * 0.1), left: 30,
      right: Math.min(insets.right + 30, w * 0.7),
      bottom: Math.min(insets.bottom + 120, h * 0.75),
    };
    // A focus place: close enough in that satellite imagery shows the site itself
    const facility = selectedFacilityId ? facilities.find(f => f.id === selectedFacilityId) : undefined;
    if (facility) {
      // Polar sites can't be shown up close (see POLAR_EDGE): frame them from above Antarctica
      const polar = Math.abs(facility.lat) > POLAR_EDGE;
      map.flyTo({
        center: [facility.lon, polar ? Math.sign(facility.lat) * 72 : facility.lat],
        zoom: polar ? 2.4 : Math.max(map.getZoom(), 13), padding, duration: 1600,
      });
      return;
    }
    const district = districts.find(d => d.key === selectedDistrictKey);
    const sub = subregions.find(s => s.key === selectedSubKey);
    const country = countries.find(c => c.key === selectedKey);
    const target = district?.feature ?? sub?.feature ?? country?.feature;
    if (!target || arcs) {
      // The whole globe beside the panel; trade arcs centre on their origin
      const availW = w - padding.left - padding.right, availH = h - padding.top - padding.bottom;
      const center: [number, number] = arcs ? [arcs.origin.lon, Math.max(-30, Math.min(40, arcs.origin.lat))] : [map.getCenter().lng, 20];
      map.flyTo({ center, zoom: worldZoom(availW, availH), padding, duration: 1200 });
      return;
    }
    const [[x0, y0], [x1, y1]] = d3.geoBounds(largestPolygon(target));
    const maxZoom = district ? 11 : sub ? 8.5 : 6;
    if (x1 >= x0) {
      map.fitBounds([[x0, y0], [x1, y1]], { padding, maxZoom, duration: 1200 });
      return;
    }
    // Bounds crossing the antimeridian (Russia, Fiji) run past 180°, which fitBounds wraps
    // back, framing the far side of the globe: size the view on a box of the same width
    // centred on 0°, then fly to the real midpoint
    const width = x1 + 360 - x0;
    const fit: LngLatBoundsLike = [[-width / 2, y0], [width / 2, y1]];
    const cam = map.cameraForBounds(fit, { padding, maxZoom });
    if (cam?.zoom == null || !cam.center) return;
    const midLon = ((x0 + width / 2 + 540) % 360) - 180;
    map.flyTo({ center: [midLon, maplibregl.LngLat.convert(cam.center).lat], zoom: cam.zoom, padding, duration: 1200 });
  }, [ready, selectedFacilityId, facilities, selectedKey, selectedSubKey, selectedDistrictKey, countries, subregions, districts, insets.right, insets.bottom, arcs]);

  const resetView = () => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (map && el) map.flyTo({ center: [map.getCenter().lng, 20], zoom: worldZoom(el.clientWidth - insets.right, el.clientHeight - insets.bottom), duration: 1000 });
  };

  return (
    <div className="wm-map">
      <div className="wm-map-canvas" ref={containerRef} />
      <div className="wm-tooltip" ref={tooltipRef} />
      {/* Basemap and zoom controls, above the time slider and clear of the side panel / bottom sheet */}
      <div className="wm-map-controls" style={{ right: insets.right + 12, bottom: insets.bottom + 124 }}>
        <div className="wm-basemap" role="group" aria-label="Basemap">
          {(['streets', 'satellite'] as const).map(b => (
            <button key={b} aria-pressed={basemap === b} className={basemap === b ? 'wm-active' : ''} onClick={() => onBasemapChange(b)}>
              {b === 'streets' ? 'Map' : 'Satellite'}
            </button>
          ))}
        </div>
        <div className="wm-zoom" role="group" aria-label="Zoom">
          <button onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in">+</button>
          <button onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out">−</button>
          <button onClick={resetView} aria-label="Show the whole globe" title="Whole globe">◯</button>
        </div>
      </div>
      {(!ready || countries.length === 0) && <div className="wm-loading">Loading map…</div>}
    </div>
  );
}

// Zoom at which the globe fills ~85% of a w×h area (at zoom z the globe is 512·2^z/π px across)
function worldZoom(w: number, h: number) {
  return Math.max(0.3, Math.log2((0.85 * Math.max(200, Math.min(w, h)) * Math.PI) / 512));
}

// MapLibre's polygons are planar, while world-atlas is made for d3's spherical geometry:
//  - Rings crossing the antimeridian (Russia's Chukotka, Fiji) jump from 180° to -180°; drawn
//    planar, those edges span the whole map. Their longitudes are unwrapped instead (Chukotka
//    runs on past 180°, which MapLibre draws in place).
//  - Antarctica is a tiny ring round the South Pole with the coastline as a hole — on a
//    sphere that encloses the continent, on a plane it fills a wedge. It's rebuilt with the
//    coastline as the outer ring, its one antimeridian crossing routed along 85°S (where
//    MapLibre's tiles stop).
const POLE = -85;
const polarCache = new WeakMap<Geometry, Geometry>();
function clampPolar(g: Geometry): Geometry {
  if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) return g;
  const hit = polarCache.get(g);
  if (hit) return hit;
  const unwrap = (r: number[][]) => {
    const out: number[][] = [];
    for (const [x, y] of r) {
      const prev = out[out.length - 1]?.[0];
      out.push([prev == null ? x : x + 360 * Math.round((prev - x) / 360), y]);
    }
    return out;
  };
  const aroundPole = (r: number[][]) => {
    const out: number[][] = [];
    r.forEach(([x, y], i) => {
      if (i && Math.abs(x - r[i - 1][0]) > 180) out.push([r[i - 1][0], POLE], [x, POLE]);
      out.push([x, Math.max(y, POLE)]);
    });
    return out;
  };
  const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).flatMap(p =>
    p[0].every(([, y]) => y <= POLE) ? p.slice(1).map(hole => [aroundPole(hole)]) : [p.map(unwrap)]);
  const out: Geometry = { type: 'MultiPolygon', coordinates: polys };
  polarCache.set(g, out);
  return out;
}

// `name` is the tooltip text; `fill` (data colouring) and `dim` are only set where they apply
function shapes(list: { key: string; name: string; geometry: Geometry; fill?: string; dim?: boolean }[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: list.map(({ key, name, geometry, fill, dim }) => ({
      type: 'Feature', geometry,
      properties: { key, name, ...(fill ? { fill } : {}), ...(dim ? { dim } : {}) },
    })),
  };
}

const withType = (s: Subregion) => (s.type ? `${s.name} · ${s.type}` : s.name);

function points(list: { key: string; text: string; at: [number, number]; rank: number }[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: list.map(({ key, text, at, rank }) => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: at }, properties: { key, text, rank },
    })),
  };
}

// Tooltip text for whatever is under the cursor
function tooltipText(layer: string, props: Record<string, unknown>, choropleth: Choropleth | null): string {
  if (layer === 'wm-land') return 'No territory recorded here in CShapes';
  if (layer === 'wm-arcs-hit') return String(props.tip ?? '');
  if (layer === 'wm-focus-dots') return `${props.name} · ${props.catLabel}`;
  const key = String(props.key);
  const level = layer === 'wm-countries-fill' ? 0 : layer === 'wm-subregions-fill' ? 1 : 2;
  const name = String(props.name ?? key);
  const value = choropleth?.level === level ? choropleth.labels.get(key) : undefined;
  return value ? `${name} · ${value}` : name;
}
// Countries like the US, France or Russia have far-flung territories; framing or labelling
// their full extent misplaces things, so use the largest polygon instead.
function largestPolygon(f: Feature<Geometry>): Feature<Geometry> {
  const g = f.geometry;
  if (!g || g.type !== 'MultiPolygon') return f;
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
