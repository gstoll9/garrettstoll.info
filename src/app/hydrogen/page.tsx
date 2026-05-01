'use client'
import './styles/HydrogenAtom.css';
import ElectronCloud from './components/ElectronCloud';
import SchrodingerEquation from './components/text/SchrodingerEquation';
import Hydrogen from './components/text/Hydrogen';
import SpectrumMath from './components/text/SpectrumMath';
import HydrogenSpectrum from './components/HydrogenSpectrum';
import StandardLayout from '@/layouts/standardLayout';
import { useState } from 'react';

const TABS = [
  { id: 'wave',     label: 'Wave' },
  { id: 'spectrum', label: 'Spectrum' },
] as const;
type Tab = typeof TABS[number]['id'];

const DRAWER_W = 480;

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('wave');
  const [mathOpen, setMathOpen] = useState(true);

  const main = (
    <div className="hydrogenPage">

      {/* ── Energy-level style tab nav ── */}
      <nav className="energyNav">
        <div className="energyTrack">
          <div className="energyLine" />
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              className={`energyNode${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ left: `${(i / (TABS.length - 1)) * 100}%` }}
            >
              <span className="energyDot" />
              <span className="energyLabel">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── Content row ── */}
      <div className="workArea">

        {/* Collapsible math sidebar */}
        <aside className={`mathDrawer${mathOpen ? '' : ' closed'}`}>
          <div className="mathDrawerInner">
            {activeTab === 'wave' ? (
              <>
                <SchrodingerEquation />
                <Hydrogen />
              </>
            ) : (
              <SpectrumMath />
            )}
          </div>
        </aside>

        {/* Toggle handle — slides with the drawer */}
        <button
          className={`mathToggle${mathOpen ? ' open' : ' closed'}`}
          style={{ left: mathOpen ? DRAWER_W : 0 }}
          onClick={() => setMathOpen(o => !o)}
          title={mathOpen ? 'Hide equations' : 'Show equations'}
        >
          {mathOpen ? '‹' : '›'}
        </button>

        {/* Visualization */}
        <div className="vizArea">
          {activeTab === 'wave'
            ? <ElectronCloud />
            : (
              <div style={{ padding: '20px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
                <HydrogenSpectrum />
              </div>
            )
          }
        </div>

      </div>
    </div>
  );

  return StandardLayout({ title: "Hydrogen Atom", main, headerMode: "tyro-only" });
}

