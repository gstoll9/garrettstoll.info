'use client'
import StandardLayout from '@/layouts/standardLayout';
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { useState } from 'react';
import { PlanetProps } from './components/Planet';
import { planets } from './data/planets';
import './styles/solarsystem.css';

const TABS = [
  { id: 'solar',  label: 'Solar System' },
  { id: 'planet', label: 'Planet' },
  { id: 'cosmic', label: 'Cosmic Web' },
] as const;
type Tab = typeof TABS[number]['id'];

const EARTH = planets.find(p => p.name === 'Earth')! as unknown as PlanetProps;

const PLANET_SYMBOLS: Record<string, string> = {
  Mercury: "☿",
  Venus: "♀",
  Earth: "♁",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "⛢",
  Neptune: "♆"
};

// Importing the UniverseCanvas component dynamically to avoid SSR issues.
// Cosmic Web is a "warp cut" to a different scale, handled *inside* UniverseCanvas's
// existing Canvas (see its `focus === 'cosmic'` branch) rather than a second <Canvas> —
// mounting a separate WebGL context here caused context loss when switching tabs.
const UniverseCanvas = dynamic(() => import('./components/UniverseCanvas').then(mod => mod.UniverseCanvas), {
  ssr: false,
  loading: () => (
    <div className="solarLoading">
      Loading Solar System...
    </div>
  )
})

export default function Home() {

  const [focus, setFocus] = useState<string>('solarsystem');
  const [focusedPlanet, setFocusedPlanet] = useState<PlanetProps | null>(null);

  const activeTab: Tab = focus === 'solarsystem' ? 'solar' : focus === 'cosmic' ? 'cosmic' : 'planet';
  const activePlanetName = focusedPlanet?.name ?? null;

  const handleFocusChange = (newFocus: string, planetData: PlanetProps | null) => {
    setFocus(newFocus);
    setFocusedPlanet(planetData);
  };

  const handleTabClick = (tab: Tab) => {
    if (tab === 'solar') {
      handleFocusChange('solarsystem', null);
    } else if (tab === 'cosmic') {
      handleFocusChange('cosmic', null);
    } else {
      // default to Earth if no planet has been selected yet
      const target = focusedPlanet ?? EARTH;
      handleFocusChange(target.name, target);
    }
  };

  const handlePlanetPick = (name: string) => {
    const planet = planets.find(p => p.name === name) as unknown as PlanetProps;
    if (planet) handleFocusChange(planet.name, planet);
  };

  const main = (
    <div className="solarPage">

      {/* ── Dot-and-line tab nav ── */}
      <nav className="solarNav">
        <div className="solarTrack">
          <div className="solarLine" />
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              className={`solarNode${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
              style={{ left: `${(i / (TABS.length - 1)) * 100}%` }}
            >
              <span className="solarDot" />
              <span className="solarLabel">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Planet picker — visible only when Planet tab is active */}
        {activeTab === 'planet' && (
          <div className="planetPicker">
            {planets.map(p => (
              <button
                key={p.name}
                className={`planetPickBtn${activePlanetName === p.name ? ' active' : ''}`}
                onClick={() => handlePlanetPick(p.name)}
              >
                <span className="planetPickSymbol">
                  {PLANET_SYMBOLS[p.name] || '•'}
                </span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ── Visualization ── */}
      <div className="solarWorkArea">
        <Suspense fallback={
          <div className="solarLoading">
            Initializing 3D Scene...
          </div>
        }>
          <UniverseCanvas
            focus={focus}
            focusedPlanet={focusedPlanet}
            setFocus={handleFocusChange}
          />
        </Suspense>
      </div>

    </div>
  );

  return StandardLayout({ title: "Solar System", main, headerMode: "tyro-only" });
}
