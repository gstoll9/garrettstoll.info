"use client";

import StandardLayout from '@/layouts/standardLayout';
import dynamic from 'next/dynamic'
import { Suspense, useState } from 'react'
import './styles/brain.css';

// Import the BrainModel component dynamically
const BrainModel = dynamic(() => import('./components/BrainModel').then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100%',
      backgroundColor: '#111',
      color: 'white' 
    }}>
      Loading Brain Model...
    </div>
  )
})

const TABS = [
  { id: 'full', label: 'Full View' },
  { id: 'sagittal', label: 'Sagittal Cross-Section' },
  { id: 'coronal', label: 'Coronal Cross-Section' },
] as const;

export type ViewMode = typeof TABS[number]['id'];

export default function BrainPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('full');

  const main = (
    <div className="brainPage">
      {/* Top section nav matching solarsystem/hydrogen style if possible */}
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
        {/* Info Sidebar */}
        <aside className="mathDrawer">
          <div className="mathDrawerInner">
            <h2 style={{borderBottom: '1px solid #444', paddingBottom: '0.5rem', marginTop: 0}}>Human Brain</h2>
            <p style={{ marginTop: '1rem', color: '#ccc', lineHeight: 1.5 }}>
              Explore the 3D procedural brain model. Use the top menu to view cross-sections.
            </p>
            <br/>
            <div id="brain-region-info">
              <h3>Region Info</h3>
              <p style={{ color: '#aaa' }}>Select or hover a region to view details.</p>
            </div>
          </div>
        </aside>

        {/* 3D Canvas Area */}
        <main className="canvasArea">
          <Suspense fallback={<div style={{color: 'white'}}>Loading 3D context...</div>}>
            <BrainModel viewMode={viewMode} />
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