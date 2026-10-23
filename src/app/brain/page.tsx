"use client";

import StandardLayout from '@/layouts/standardLayout';
import dynamic from 'next/dynamic'
import { Suspense, useState } from 'react'
import { GROUPS, GroupId, PARTS } from './data/regions';
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

      <div className="workArea">
        <aside className="mathDrawer">
          <div className="mathDrawerInner">
            <h2 className="brainTitle">Human Brain</h2>

            <div className="brainInfo">
              {part && group ? (
                <>
                  <div className="brainInfoGroup">
                    <span className="brainSwatch" style={{ background: group.color }} />
                    {group.label}
                  </div>
                  <h3>{part.side ? `${part.name} (${part.side})` : part.name}</h3>
                  <p>{group.desc}</p>
                </>
              ) : (
                <p className="brainHint">
                  Hover or click a structure to see what it does. Drag to rotate, scroll to zoom, and use
                  the views above to cut the brain open.
                </p>
              )}
            </div>

            <div className="brainLegendHeader">
              <h3>Regions</h3>
              <button className="brainToggle" onClick={() => toggleGroups(CORTEX_GROUPS, !cortexHidden)}>
                {cortexHidden ? 'Show cortex' : 'Hide cortex'}
              </button>
            </div>
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

            <p className="brainCredit">
              Model:{' '}
              <a href="https://lifesciencedb.jp/bp3d/" target="_blank" rel="noreferrer">BodyParts3D</a>,
              © The Database Center for Life Science, licensed under{' '}
              <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" target="_blank" rel="noreferrer">CC BY-SA 2.1 JP</a>.
            </p>
          </div>
        </aside>

        <main className="canvasArea">
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
      </div>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .standardlayout-main {
          padding: 0 !important;
          max-width: none !important;
          margin: 0 !important;
        }
      `}} />
      <StandardLayout
        title="Brain Model"
        main={main}
        headerMode="tyro-only"
      />
    </>
  );
}
