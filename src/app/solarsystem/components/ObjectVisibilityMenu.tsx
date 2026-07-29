import { useState } from 'react';
import '../styles/orbitControls.css';
import { planets } from '../data/planets';
import { dwarfPlanets } from '../data/dwarfPlanets';
import { asteroids } from '../data/asteroids';
import { INNER_PLANETS, ASTEROID_BELT_BODIES, OUTER_PLANETS, REGION_COLORS } from '../data/regions';

const innerPlanetNames = planets.filter(p => INNER_PLANETS.has(p.name)).map(p => p.name);
const outerPlanetNames = planets.filter(p => OUTER_PLANETS.has(p.name)).map(p => p.name);
const beltDwarfNames = dwarfPlanets.filter(d => ASTEROID_BELT_BODIES.has(d.name)).map(d => d.name);
const transNeptunianNames = dwarfPlanets.filter(d => !ASTEROID_BELT_BODIES.has(d.name)).map(d => d.name);

// Split the asteroid batch by real diameter (km) so the menu can offer a size-bucketed
// breakdown rather than one long flat list; matches the >300km / 200-300km / 100-200km
// batches they were downloaded and added in.
const EARTH_DIAMETER_KM = 12742;
const diameterKm = (a: { realDiameter: number }) => a.realDiameter * EARTH_DIAMETER_KM;
const over300kmAsteroidNames = asteroids.filter(a => diameterKm(a) > 300).map(a => a.name);
const between200and300kmAsteroidNames = asteroids.filter(a => diameterKm(a) > 200 && diameterKm(a) <= 300).map(a => a.name);
const between100and200kmAsteroidNames = asteroids.filter(a => diameterKm(a) <= 200).map(a => a.name);

// Sun has no orbit region color of its own, so its header falls back to light grey.
const SUN_HEADER_COLOR = 'rgba(232, 236, 245, 0.92)';

type SubGroup = { label: string; bodies: string[] };
type Group = { label: string; bodies?: string[]; subgroups?: SubGroup[]; color: string };

const REGION_GROUPS: Group[] = [
  { label: 'Sun', bodies: ['Sun'], color: SUN_HEADER_COLOR },
  { label: 'Inner Planets', bodies: innerPlanetNames, color: REGION_COLORS.inner },
  {
    label: 'Asteroid Belt',
    color: REGION_COLORS.asteroidBelt,
    bodies: ['Asteroid Belt'],
    subgroups: [
      { label: '>300km', bodies: [...beltDwarfNames, ...over300kmAsteroidNames] },
      { label: '200-300km', bodies: between200and300kmAsteroidNames },
      { label: '100-200km', bodies: between100and200kmAsteroidNames },
    ],
  },
  { label: 'Outer Planets', bodies: outerPlanetNames, color: REGION_COLORS.outer },
  { label: 'Dwarf Planets', bodies: transNeptunianNames, color: REGION_COLORS.transNeptunian },
];

type ObjectVisibilityMenuProps = {
  hiddenBodies: Set<string>;
  toggleBody: (name: string) => void;
  setBodiesVisible: (names: string[], visible: boolean) => void;
};

type BodyToggleProps = {
  hiddenBodies: Set<string>;
  toggleBody: (name: string) => void;
  setBodiesVisible: (names: string[], visible: boolean) => void;
};

function BodyList({ bodies, hiddenBodies, toggleBody }: { bodies: string[] } & Pick<BodyToggleProps, 'hiddenBodies' | 'toggleBody'>) {
  return (
    <div className="region-body-list">
      {bodies.map((name) => (
        <label className="toggle-label" key={name}>
          <input
            type="checkbox"
            checked={!hiddenBodies.has(name)}
            onChange={() => toggleBody(name)}
          />
          <span>{name}</span>
        </label>
      ))}
    </div>
  );
}

function AsteroidSubGroup({ label, bodies, color, hiddenBodies, toggleBody, setBodiesVisible }: SubGroup & { color: string } & BodyToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const allVisible = bodies.every((name) => !hiddenBodies.has(name));

  return (
    <div className="region-subgroup">
      <div className="region-subheader">
        <button
          type="button"
          className="region-subheader-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span style={{ color }}>{label}</span>
          <span className={`region-subarrow ${isOpen ? 'open' : ''}`} style={{ color }}>▾</span>
        </button>
        <button
          type="button"
          className="region-visibility-toggle region-visibility-toggle-small"
          style={{ color }}
          onClick={() => setBodiesVisible(bodies, !allVisible)}
          aria-label={allVisible ? `Hide all ${label}` : `Show all ${label}`}
        >
          {allVisible ? 'Hide All' : 'Show All'}
        </button>
      </div>
      {isOpen && <BodyList bodies={bodies} hiddenBodies={hiddenBodies} toggleBody={toggleBody} />}
    </div>
  );
}

function RegionGroup({ label, bodies, subgroups, color, hiddenBodies, toggleBody, setBodiesVisible }: Group & BodyToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const allBodies = [...(bodies ?? []), ...(subgroups ? subgroups.flatMap((sg) => sg.bodies) : [])];
  const allVisible = allBodies.every((name) => !hiddenBodies.has(name));

  return (
    <div className="region-group">
      <div className="region-header">
        <button
          type="button"
          className="region-header-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span style={{ color }}>{label}</span>
          <span className={`region-arrow ${isOpen ? 'open' : ''}`} style={{ color }}>▾</span>
        </button>
        <button
          type="button"
          className="region-visibility-toggle"
          style={{ color }}
          onClick={() => setBodiesVisible(allBodies, !allVisible)}
          aria-label={allVisible ? `Hide all ${label}` : `Show all ${label}`}
        >
          {allVisible ? 'Hide All' : 'Show All'}
        </button>
      </div>
      {isOpen && (
        <>
          {bodies && <BodyList bodies={bodies} hiddenBodies={hiddenBodies} toggleBody={toggleBody} />}
          {subgroups && (
            <div className="region-subgroup-list">
              {subgroups.map((sg) => (
                <AsteroidSubGroup
                  key={sg.label}
                  label={sg.label}
                  bodies={sg.bodies}
                  color={color}
                  hiddenBodies={hiddenBodies}
                  toggleBody={toggleBody}
                  setBodiesVisible={setBodiesVisible}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ObjectVisibilityMenu({ hiddenBodies, toggleBody, setBodiesVisible }: ObjectVisibilityMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`orbit-controls-menu ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        type="button"
        className="menu-toggle-button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="menu-toggle-label">Astronomical Objects</span>
        <span className="menu-toggle-arrow">▾</span>
      </button>

      {isExpanded && (
        <div className="controls-content">
          {REGION_GROUPS.map((group) => (
            <RegionGroup
              key={group.label}
              label={group.label}
              bodies={group.bodies}
              subgroups={group.subgroups}
              color={group.color}
              hiddenBodies={hiddenBodies}
              toggleBody={toggleBody}
              setBodiesVisible={setBodiesVisible}
            />
          ))}
        </div>
      )}
    </div>
  );
}
