'use client'
import './styles/HydrogenAtom.css';
import ElectronCloud from './components/ElectronCloud';
import SchrodingerEquation from './components/text/SchrodingerEquation';
import Hydrogen from './components/text/Hydrogen';
import SpectrumMath from './components/text/SpectrumMath';
import HydrogenSpectrum from './components/HydrogenSpectrum';
import WaveStatePlots from './components/WaveStatePlots';
import PeriodicTable from './components/PeriodicTable';
import StandardLayout from '@/layouts/standardLayout';
import { useState, useMemo } from 'react';
import { getElement } from './data/elements';
import { effectiveNuclearCharge, outermostSubshell } from './utils/slater';

const TABS = [
  { id: 'wave',     label: 'Wave' },
  { id: 'spectrum', label: 'Spectrum' },
] as const;
type Tab = typeof TABS[number]['id'];

const DRAWER_W = 480;

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('wave');
  const [mathOpen, setMathOpen] = useState(true);
  const [selectedState, setSelectedState] = useState({ n: 2, l: 1, m: 0 });
  const [selectedZ, setSelectedZ] = useState(1);

  const element = getElement(selectedZ)!;

  const handleElementSelect = (Z: number) => {
    setSelectedZ(Z);
    // Default to the new element's outermost (valence) subshell — the most illustrative
    // orbital to land on when switching elements.
    const el = getElement(Z)!;
    const outer = outermostSubshell(el.configuration);
    setSelectedState({ n: outer.n, l: outer.l, m: 0 });
  };

  const renderZ = useMemo(
    () => effectiveNuclearCharge(selectedZ, element.configuration, selectedState.n, selectedState.l),
    [selectedZ, element, selectedState.n, selectedState.l]
  );

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

      {/* ── Periodic table selector — drives Z/Z_eff for every visualization below ── */}
      <PeriodicTable selectedZ={selectedZ} onSelect={handleElementSelect} />

      {/* ── Content row ── */}
      <div className="workArea">

        {/* Collapsible math sidebar */}
        <aside className={`mathDrawer${mathOpen ? '' : ' closed'}`}>
          <div className="mathDrawerInner">
            {activeTab === 'wave' ? (
              <>
                <SchrodingerEquation
                  n={selectedState.n}
                  l={selectedState.l}
                  m={selectedState.m}
                  onStateChange={setSelectedState}
                />
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
            ? (
              <div className="waveVizStack">
                <div className="waveCloudPanel">
                  <ElectronCloud
                    n={selectedState.n}
                    l={selectedState.l}
                    m={selectedState.m}
                    onStateChange={setSelectedState}
                    Z={selectedZ}
                    elementSymbol={element.symbol}
                    configuration={element.configuration}
                    realIonizationEnergyEV={element.ionizationEnergyEV}
                  />
                </div>
                <div className="wavePlotsPanel">
                  <WaveStatePlots
                    n={selectedState.n}
                    l={selectedState.l}
                    m={selectedState.m}
                    Z={renderZ}
                  />
                </div>
              </div>
            )
            : (
              <div className="hydrogenSpectrumPane">
                <HydrogenSpectrum Z={renderZ} />
              </div>
            )
          }
        </div>

      </div>
    </div>
  );

  return StandardLayout({ title: "Hydrogen Atom", main });
}
