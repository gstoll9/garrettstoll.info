"use client";

import StandardLayout from '@/layouts/standardLayout';
import dynamic from 'next/dynamic'
import { Suspense, useEffect, useState } from 'react'
import {
  GROUPS, GroupId, REFS, REGIONS, REGION_COLORS, Side, doiUrl, meshName, partFor, wikiUrl,
} from './data/regions';
import { DISSECTIONS, REGION_CELLS, SUPERCLUSTERS } from './data/cellTypes';
import { SUPERCLUSTER_INFO } from './data/cellTypeInfo';
import { TISSUE } from './data/tissue';
import { REGION_TISSUE, TISSUE_TYPES } from './data/tissueInfo';
import { RECEPTORS, RECEPTOR_TARGETS } from './data/receptors';
import { RECEPTOR_INFO } from './data/receptorInfo';
import { REGION_GENES } from './data/genes';
import './styles/brain.css';

// Import the BrainModel component dynamically
const BrainModel = dynamic(() => import('./components/BrainModel').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="brainLoading">Loading brain model…</div>,
})

const TABS = [
  { id: 'full', label: 'Full View' },
  { id: 'sagittal', label: 'Sagittal' },
  { id: 'coronal', label: 'Coronal' },
  { id: 'axial', label: 'Axial' },
] as const;

export type ViewMode = typeof TABS[number]['id'];

const GROUP_IDS = Object.keys(GROUPS) as GroupId[];
const OUTER_GROUPS = GROUP_IDS.filter((g) => GROUPS[g].outer);
const REGIONS_BY_GROUP = Object.fromEntries(
  GROUP_IDS.map((g) => [g, Object.keys(REGIONS).filter((id) => REGIONS[id].group === g)]),
) as Record<GroupId, string[]>;
const HEMISPHERES = ['Left', 'Both', 'Right'] as const;

const SILETTI_DOI = '10.1126/science.add7046';
const FONOV_DOI = '10.1016/j.neuroimage.2010.07.033';
const GLASSER_DOI = '10.1523/JNEUROSCI.2180-11.2011';
const TISSUE_CLASSES = [
  { key: 'gm', label: 'Grey matter', color: '#c9a48a' },
  { key: 'wm', label: 'White matter', color: '#ece6d6' },
  { key: 'csf', label: 'Fluid', color: '#5b8fc9' },
] as const;

function Tissue({ regionId }: { regionId: string }) {
  const info = REGION_TISSUE[regionId];
  const t = TISSUE[regionId];
  if (!info || !t) return null;
  const type = TISSUE_TYPES[info.type];
  const myelin = t.myelin !== undefined ? Math.round((t.myelin - 1) * 100) : null;
  return (
    <div className="brainTissue">
      <h4>Tissue</h4>
      <p className="brainTissueType">
        <strong>{type.label}</strong>
        {type.layers && <span> · {type.layers}</span>}
      </p>
      <p className="brainTissueDesc">
        {type.desc}{' '}
        <a href={wikiUrl(type.wiki)} target="_blank" rel="noreferrer">{type.wiki} ↗</a>
      </p>
      {info.note && <p className="brainTissueNote">{info.note}</p>}
      <dl className="brainTissueStats">
        <div>
          <dt>Volume</dt>
          <dd>{t.volume.toFixed(t.volume < 10 ? 1 : 0)} cm³ <span>both sides</span></dd>
        </div>
        {myelin !== null && (
          <div>
            <dt>Myelin</dt>
            <dd>
              {myelin === 0 ? 'cortical median' : `${myelin > 0 ? '+' : '−'}${Math.abs(myelin)}% vs cortical median`}
            </dd>
          </div>
        )}
      </dl>
      <div className="brainCellBar brainTissueBar">
        {TISSUE_CLASSES.map((c) => (
          <span key={c.key} style={{ width: `${t[c.key] * 100}%`, background: c.color }} title={c.label} />
        ))}
      </div>
      <ul className="brainTissueLegend">
        {TISSUE_CLASSES.map((c) => (
          <li key={c.key}>
            <span className="brainSwatch" style={{ background: c.color }} />
            {c.label} {Math.round(t[c.key] * 100)}%
          </li>
        ))}
      </ul>
      <p className="brainCellNote">
        Measured on the MNI-ICBM152 average brain and its MRI tissue maps (
        <a href={doiUrl(FONOV_DOI)} target="_blank" rel="noreferrer">Fonov et al. 2011</a>), which is
        symmetric, so both hemispheres are the same.
        {myelin !== null && (
          <>
            {' '}Myelin is the T1w/T2w MRI ratio in the region&apos;s grey matter (
            <a href={doiUrl(GLASSER_DOI)} target="_blank" rel="noreferrer">Glasser &amp; Van Essen 2011</a>).
          </>
        )}
      </p>
    </div>
  );
}
const pct = (x: number) => (x >= 0.095 ? `${Math.round(x * 100)}%` : `${(x * 100).toFixed(1)}%`);

function CellTypeList({ title, count, types }: { title: string; count: number; types: [number, number][] }) {
  return (
    <div className="brainCellGroup">
      <h5>{title} <span>{count.toLocaleString()} nuclei</span></h5>
      <div className="brainCellBar">
        {types.map(([i, share]) => (
          <span key={i} style={{ width: `${share * 100}%`, background: SUPERCLUSTERS[i].color }} title={SUPERCLUSTERS[i].name} />
        ))}
      </div>
      <ul>
        {types.map(([i, share]) => (
          <li key={i}>
            <details>
              <summary>
                <span className="brainSwatch" style={{ background: SUPERCLUSTERS[i].color }} />
                <span className="brainCellName">{SUPERCLUSTERS[i].name}</span>
                <span className="brainCellShare">{pct(share)}</span>
              </summary>
              <p>{SUPERCLUSTER_INFO[SUPERCLUSTERS[i].name]}</p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CellTypes({ regionId }: { regionId: string }) {
  const cells = REGION_CELLS[regionId];
  return (
    <div className="brainCells">
      <h4>Cell types</h4>
      {cells ? (
        <>
          <p className="brainTransmitters">
            Neurons by transmitter:{' '}
            {Object.entries(cells.transmitters).map(([t, share], i) => (
              <span key={t}>{i > 0 && ' · '}{t} {pct(share)}</span>
            ))}
          </p>
          <CellTypeList title="Neurons" count={cells.neurons} types={cells.neuronTypes} />
          <CellTypeList title="Glia and other cells" count={cells.others} types={cells.otherTypes} />
          <p className="brainCellNote">
            Single-nucleus RNA-seq of{' '}
            {cells.dissections.map((d) => DISSECTIONS[d]).join('; ')}, pooled over donors and both hemispheres
            (Human Brain Cell Atlas,{' '}
            <a href={doiUrl(SILETTI_DOI)} target="_blank" rel="noreferrer">Siletti et al. 2023</a>, CC BY 4.0).
            Neurons were enriched in sampling, so the two groups are shown separately.
          </p>
        </>
      ) : (
        <p className="brainCellNote">
          Not sampled by the Human Brain Cell Atlas (
          <a href={doiUrl(SILETTI_DOI)} target="_blank" rel="noreferrer">Siletti et al. 2023</a>).
        </p>
      )}
    </div>
  );
}

const HANSEN_DOI = '10.1038/s41593-022-01186-3';
const AHBA_DOI = '10.1038/nature11405';
const RECEPTOR_REGIONS = Object.keys(RECEPTORS);
const RECEPTOR_SYSTEMS = [...new Set(Object.values(RECEPTOR_TARGETS).map((t) => t.system))];
const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]}`;

function Receptors({ regionId }: { regionId: string }) {
  const values = RECEPTORS[regionId];
  if (!values) return null;
  const rank = (tid: string) => 1 + RECEPTOR_REGIONS.filter((r) => RECEPTORS[r][tid] > values[tid]).length;
  return (
    <div className="brainReceptors">
      <h4>Receptors</h4>
      {RECEPTOR_SYSTEMS.map((system) => (
        <div key={system} className="brainReceptorSystem">
          <h5>{system}</h5>
          <ul>
            {Object.entries(RECEPTOR_TARGETS).filter(([, t]) => t.system === system).map(([tid, t]) => {
              const isRef = t.refRegions?.includes(regionId);
              return (
                <li key={tid}>
                  <details>
                    <summary>
                      <span className="brainReceptorName">{t.label}</span>
                      {isRef ? (
                        <span className="brainReceptorRef">reference</span>
                      ) : (
                        <>
                          <span className="brainReceptorBar"><span style={{ width: `${Math.max(values[tid], 0.02) * 100}%` }} /></span>
                          <span className="brainReceptorRank">{ordinal(rank(tid))}</span>
                        </>
                      )}
                    </summary>
                    <p>
                      {RECEPTOR_INFO[tid].desc}{' '}
                      <a href={wikiUrl(RECEPTOR_INFO[tid].wiki)} target="_blank" rel="noreferrer">Wikipedia</a>
                    </p>
                    <p className="brainReceptorTracer">
                      {t.maps.map((m) => `${m.tracer}, ${m.n} people (${m.study})`).join('; ')}.
                      {t.reference && ` Measured relative to the ${t.reference}${isRef ? ', so this region reads as zero by construction' : ''}.`}
                    </p>
                  </details>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="brainCellNote">
        Group-average PET maps of over 1,200 healthy adults, collected by{' '}
        <a href={doiUrl(HANSEN_DOI)} target="_blank" rel="noreferrer">Hansen et al. 2022</a> (CC BY-NC-SA 4.0).
        Bars run from the lowest to the highest of {RECEPTOR_REGIONS.length} grey-matter regions, and the number is this
        region&apos;s rank. Tracers use different units, so compare a receptor between regions, not receptors with each
        other. Both hemispheres combined.
      </p>
    </div>
  );
}

function Genes({ regionId }: { regionId: string }) {
  const entry = REGION_GENES[regionId];
  const source = (
    <>
      Allen Human Brain Atlas microarrays from 6 donors (
      <a href={doiUrl(AHBA_DOI)} target="_blank" rel="noreferrer">Hawrylycz et al. 2012</a>)
    </>
  );
  return (
    <div className="brainGenes">
      <h4>Gene expression</h4>
      {!entry ? (
        <p className="brainCellNote">Not sampled as a separate structure in the {source}.</p>
      ) : entry.genes.length === 0 ? (
        <p className="brainCellNote">
          No gene stands out against the rest of the cortex (p &lt; 10⁻⁶): neighbouring cortical areas express
          very similar genes, and the atlas has few samples here. Source: {source}.
        </p>
      ) : (
        <>
          <p className="brainGenesIntro">
            Most enriched compared with {entry.vs === 'cortex' ? 'the rest of the cerebral cortex' : 'the whole brain'}:
          </p>
          <ul>
            {entry.genes.map(([symbol, name, fold, entrez]) => (
              <li key={symbol}>
                <a href={`https://www.ncbi.nlm.nih.gov/gene/${entrez}`} target="_blank" rel="noreferrer">{symbol}</a>
                <span className="brainGeneName" title={name}>{name}</span>
                <span className="brainGeneFold">×{fold}</span>
              </li>
            ))}
          </ul>
          <p className="brainCellNote">
            Fold change in mean expression, {source}. Symbols link to NCBI Gene.
          </p>
        </>
      )}
    </div>
  );
}

export default function BrainPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [hiddenGroups, setHiddenGroups] = useState<Set<GroupId>>(new Set());
  const [hemisphere, setHemisphere] = useState<Side | 'Both'>('Both');
  const [openGroups, setOpenGroups] = useState<Set<GroupId>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Open by default only where there's room beside the brain.
  const [regionsOpen, setRegionsOpen] = useState(false);
  useEffect(() => {
    setRegionsOpen(window.matchMedia('(min-width: 769px)').matches);
  }, []);

  const toggleGroups = (groups: GroupId[], hide: boolean) => {
    setHiddenGroups((prev) => {
      const next = new Set(prev);
      for (const g of groups) {
        if (hide) next.add(g);
        else next.delete(g);
      }
      return next;
    });
  };
  const toggleOpen = (g: GroupId) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };
  const outerHidden = OUTER_GROUPS.every((g) => hiddenGroups.has(g));

  const shownId = hoveredId ?? selectedId;
  const part = shownId ? partFor(shownId) : null;
  const region = part?.region;
  const group = region ? GROUPS[region.group] : null;
  const sideNotes = region
    ? (['Left', 'Right'] as const).filter((s) => region[s === 'Left' ? 'left' : 'right'])
    : [];

  const main = (
    <div className="brainPage">
      <main className="brainCanvas">
        <Suspense fallback={<div className="brainLoading">Loading brain model…</div>}>
          <BrainModel
            viewMode={viewMode}
            hiddenGroups={hiddenGroups}
            hemisphere={hemisphere}
            hoveredId={hoveredId}
            selectedId={selectedId}
            onHover={setHoveredId}
            onSelect={setSelectedId}
          />
        </Suspense>
      </main>

      <nav className="brainNav">
        <div className="brainTrack">
          <div className="brainLine" />
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              className={`brainNode${viewMode === tab.id ? ' active' : ''}`}
              onClick={() => setViewMode(tab.id)}
              style={{ left: `${(i / (TABS.length - 1)) * 100}%` }}
            >
              <span className="brainDot" />
              <span className="brainLabel">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <aside className="brainPanel brainInfoPanel">
        {part && region && group ? (
          <div className="brainInfo">
            <div className="brainInfoGroup">
              <span className="brainSwatch" style={{ background: REGION_COLORS[part.regionId] }} />
              {group.label} · {part.side} hemisphere
              {selectedId && (
                <button className="brainClose" aria-label="Clear selection" onClick={() => setSelectedId(null)}>×</button>
              )}
            </div>
            <h3>{region.name} <span className="brainSide">({part.side})</span></h3>
            <p>{region.desc}</p>
            {sideNotes.length > 0 && (
              <dl className="brainSideNotes">
                {sideNotes.map((s) => (
                  <div key={s} className={s === part.side ? 'current' : ''}>
                    <dt>{s}</dt>
                    <dd>{region[s === 'Left' ? 'left' : 'right']}</dd>
                  </div>
                ))}
              </dl>
            )}
            <a className="brainWiki" href={wikiUrl(region.wiki)} target="_blank" rel="noreferrer">
              {region.wiki} on Wikipedia ↗
            </a>
            <Tissue regionId={part.regionId} />
            <CellTypes regionId={part.regionId} />
            <Receptors regionId={part.regionId} />
            <Genes regionId={part.regionId} />
            {region.refs && (
              <div className="brainRefs">
                <h4>Sources</h4>
                <ul>
                  {region.refs.map((r) => (
                    <li key={r}>
                      <a href={doiUrl(REFS[r].doi)} target="_blank" rel="noreferrer" title={REFS[r].title}>
                        {REFS[r].cite}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="brainGroupInfo">
              <h4>{group.label}</h4>
              <p>{group.desc}</p>
              {group.wiki !== region.wiki && (
                <a className="brainWiki" href={wikiUrl(group.wiki)} target="_blank" rel="noreferrer">
                  {group.wiki} on Wikipedia ↗
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="brainHint">
            <span className="brainHintPointer">Hover over a region to see what it does, or click it to pin it here.</span>
            <span className="brainHintTouch">Tap a region to see what it does.</span>{' '}
            Drag to rotate, pinch or scroll to zoom, and use the views above to cut the brain open. Show one
            hemisphere or pick a region from the list to reach the hidden ones.
          </p>
        )}
        <p className="brainCredit">
          Regions:{' '}
          <a href={doiUrl(REFS.manera2020.doi)} target="_blank" rel="noreferrer">CerebrA atlas</a>{' '}
          (Manera et al. 2020, CC0), from the{' '}
          <a href={doiUrl(REFS.klein2012.doi)} target="_blank" rel="noreferrer">Mindboggle-101</a> labels on the
          MNI-ICBM152 average brain.
        </p>
      </aside>

      <aside className={`brainPanel brainRegionsPanel${regionsOpen ? ' open' : ''}`}>
        <button className="brainPanelToggle" aria-expanded={regionsOpen} onClick={() => setRegionsOpen((o) => !o)}>
          Regions <span className="brainChevron">▾</span>
        </button>
        {regionsOpen && (
          <div className="brainRegionsBody">
            <div className="brainSegmented" role="group" aria-label="Hemisphere">
              {HEMISPHERES.map((h) => (
                <button key={h} className={hemisphere === h ? 'active' : ''} onClick={() => setHemisphere(h)}>
                  {h}
                </button>
              ))}
            </div>
            <button className="brainToggle" onClick={() => toggleGroups(OUTER_GROUPS, !outerHidden)}>
              {outerHidden ? 'Show cortex' : 'Hide cortex'}
            </button>
            <ul className="brainLegend">
              {GROUP_IDS.map((g) => (
                <li key={g}>
                  <div className="brainLegendRow">
                    <label>
                      <input
                        type="checkbox"
                        checked={!hiddenGroups.has(g)}
                        onChange={(e) => toggleGroups([g], !e.target.checked)}
                      />
                      <span className="brainSwatch" style={{ background: `hsl(${GROUPS[g].hue}, 58%, 58%)` }} />
                      {GROUPS[g].label}
                    </label>
                    <button
                      className="brainExpand"
                      aria-expanded={openGroups.has(g)}
                      aria-label={`List ${GROUPS[g].label} regions`}
                      onClick={() => toggleOpen(g)}
                    >
                      {REGIONS_BY_GROUP[g].length} <span className="brainChevron">▾</span>
                    </button>
                  </div>
                  {openGroups.has(g) && (
                    <ul className="brainRegionList">
                      {REGIONS_BY_GROUP[g].map((id) => (
                        <li key={id}>
                          <span className="brainSwatch" style={{ background: REGION_COLORS[id] }} />
                          <span className="brainRegionName">{REGIONS[id].name}</span>
                          {(['Left', 'Right'] as const).map((s) => {
                            const key = meshName(id, s);
                            return (
                              <button
                                key={s}
                                className={`brainSidePick${selectedId === key ? ' active' : ''}`}
                                title={`${REGIONS[id].name} (${s})`}
                                onClick={() => setSelectedId(selectedId === key ? null : key)}
                              >
                                {s[0]}
                              </button>
                            );
                          })}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );

  return (
    <>
      <StandardLayout
        title="Brain Model"
        main={main}
        headerMode="tyro-only"
        variant="plain"
      />
    </>
  );
}
