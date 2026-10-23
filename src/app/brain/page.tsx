"use client";

import StandardLayout from '@/layouts/standardLayout';
import dynamic from 'next/dynamic'
import { Suspense, useEffect, useState } from 'react'
import { GROUPS, GroupId, PARTS, wikiUrl } from './data/regions';
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
const CORTEX_GROUPS = GROUP_IDS.filter((g) => GROUPS[g].cortex);

export default function BrainPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [hiddenGroups, setHiddenGroups] = useState<Set<GroupId>>(new Set());
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
  const cortexHidden = CORTEX_GROUPS.every((g) => hiddenGroups.has(g));

  const shownId = hoveredId ?? selectedId;
  const part = shownId ? PARTS[shownId] : null;
  const group = part ? GROUPS[part.group] : null;

  const main = (
    <div className="brainPage">
      <main className="brainCanvas">
        <Suspense fallback={<div className="brainLoading">Loading brain model…</div>}>
          <BrainModel
            viewMode={viewMode}
            hiddenGroups={hiddenGroups}
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

      <aside className={`brainPanel brainInfoPanel${part ? ' hasPart' : ''}`}>
        <h2 className="brainTitle">Human Brain</h2>
        {part && group ? (
          <div className="brainInfo">
            <div className="brainInfoGroup">
              <span className="brainSwatch" style={{ background: group.color }} />
              {group.label}
              {selectedId && (
                <button className="brainClose" aria-label="Clear selection" onClick={() => setSelectedId(null)}>×</button>
              )}
            </div>
            <h3>{part.side ? `${part.name} (${part.side})` : part.name}</h3>
            <p>{part.desc}</p>
            <a className="brainWiki" href={wikiUrl(part.wiki)} target="_blank" rel="noreferrer">
              {part.wiki.replace(/#.*/, '')} on Wikipedia ↗
            </a>
            <div className="brainGroupInfo">
              <h4>{group.label}</h4>
              <p>{group.desc}</p>
              {group.wiki !== part.wiki && (
                <a className="brainWiki" href={wikiUrl(group.wiki)} target="_blank" rel="noreferrer">
                  {group.wiki} on Wikipedia ↗
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="brainHint">
            <span className="brainHintPointer">Hover over a structure to see what it does, or click it to pin it here.</span>
            <span className="brainHintTouch">Tap a structure to see what it does.</span>{' '}
            Drag to rotate, pinch or scroll to zoom, and use the views above to cut the brain open.
          </p>
        )}
        <p className="brainCredit">
          Model:{' '}
          <a href="https://lifesciencedb.jp/bp3d/" target="_blank" rel="noreferrer">BodyParts3D</a>,
          © The Database Center for Life Science,{' '}
          <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" target="_blank" rel="noreferrer">CC BY-SA 2.1 JP</a>.
        </p>
      </aside>

      <aside className={`brainPanel brainRegionsPanel${regionsOpen ? ' open' : ''}`}>
        <button className="brainPanelToggle" aria-expanded={regionsOpen} onClick={() => setRegionsOpen((o) => !o)}>
          Regions <span className="brainChevron">▾</span>
        </button>
        {regionsOpen && (
          <div className="brainRegionsBody">
            <button className="brainToggle" onClick={() => toggleGroups(CORTEX_GROUPS, !cortexHidden)}>
              {cortexHidden ? 'Show cortex' : 'Hide cortex'}
            </button>
            <ul className="brainLegend">
              {GROUP_IDS.map((g) => (
                <li key={g}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!hiddenGroups.has(g)}
                      onChange={(e) => toggleGroups([g], !e.target.checked)}
                    />
                    <span className="brainSwatch" style={{ background: GROUPS[g].color }} />
                    {GROUPS[g].label}
                  </label>
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
