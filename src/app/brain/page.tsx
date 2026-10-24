"use client";

import StandardLayout from '@/layouts/standardLayout';
import dynamic from 'next/dynamic'
import { Suspense, useEffect, useState } from 'react'
import {
  GROUPS, GroupId, REFS, REGIONS, REGION_COLORS, Side, doiUrl, meshName, partFor, wikiUrl,
} from './data/regions';
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
