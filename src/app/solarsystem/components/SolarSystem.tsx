import Planet from './Planet'
import Orbit from './Orbit'
import { planets } from '../data/planets'
import { dwarfPlanets } from '../data/dwarfPlanets'
import { asteroids } from '../data/asteroids'
import { AsteroidBelt } from './AsteroidBelt'
import { JupiterTrojans, NeptuneTrojans } from './Trojans'
import Comets from './Comets'
import Heliosphere from './Heliosphere'
import Spacecraft from './Spacecraft'
import { KuiperBelt, ScatteredDisc } from './KuiperBelt'
import { smallBodies } from '../data/smallBodies.display'
import Sun from './Sun'
import GalacticTrails, { type TrailBody } from './GalacticTrails'
import { useMemo } from 'react'
import { PlanetProps, HoveredLayer } from './Planet'
import { INNER_PLANETS, ASTEROID_BELT_BODIES, JUPITER_TROJAN_BODIES, OUTER_PLANETS, REGION_COLORS } from '../data/regions'

type OrbitMode = 'Simple' | 'Elliptical' | 'RealLive';

const SMALL_BODY_ORBIT_COLORS: Record<string, string> = {
  'near-earth': REGION_COLORS.inner,
  trojan: REGION_COLORS.trojans,
  centaur: REGION_COLORS.centaurs,
};
const SMALL_BODY_CATEGORY = new Map(smallBodies.map((b) => [b.name, b.category]));

function orbitColorFor(name: string): string {
  const category = SMALL_BODY_CATEGORY.get(name);
  if (category) return SMALL_BODY_ORBIT_COLORS[category] ?? REGION_COLORS.transNeptunian;
  if (INNER_PLANETS.has(name)) return REGION_COLORS.inner;
  if (ASTEROID_BELT_BODIES.has(name)) return REGION_COLORS.asteroidBelt;
  if (JUPITER_TROJAN_BODIES.has(name)) return REGION_COLORS.trojans;
  if (OUTER_PLANETS.has(name)) return REGION_COLORS.outer;
  return REGION_COLORS.transNeptunian;
}

type SolarSystemProps = {
  setFocus: (focus: string, planetData: PlanetProps | null) => void;
  focus: string;
  showOrbits: boolean;
  orbitMode: OrbitMode;
  useSimplifiedDistance: boolean;
  useRealisticSizes: boolean;
  hiddenBodies: Set<string>;
  showAtmosphere: boolean;
  showCrust: boolean;
  hoveredLayer: HoveredLayer;
  setHoveredLayer: (layer: HoveredLayer) => void;
  galacticTrailYears: number; // 0 = off
};

export default function SolarSystem({ setFocus, focus, showOrbits, orbitMode, useSimplifiedDistance, useRealisticSizes, hiddenBodies, showAtmosphere, showCrust, hoveredLayer, setHoveredLayer, galacticTrailYears }: SolarSystemProps) {

  const isSolarSystem = focus === 'solarsystem';
  const isSunFocused = focus === 'Sun';

  // every body currently shown gets a path through the Galaxy
  const trailBodies = useMemo<TrailBody[]>(() => {
    const tracer = (b: { name: string; orbitData: TrailBody['orbitData'] }, kind: TrailBody['kind']): TrailBody =>
      ({ name: b.name, orbitData: b.orbitData, color: orbitColorFor(b.name), kind });
    return [
      ...(hiddenBodies.has('Sun') ? [] : [{ name: 'Sun', color: '#ffd27a', kind: 'star' as const }]),
      ...planets.map((b) => tracer(b, 'planet')),
      ...dwarfPlanets.map((b) => tracer(b, 'dwarf')),
      ...asteroids.map((b) => tracer(b, 'small')),
      ...smallBodies.map((b) => tracer(b, b.category === 'dwarf' ? 'dwarf' : 'small')),
    ].filter((b) => !hiddenBodies.has(b.name));
  }, [hiddenBodies]);

  return (
    <>
      {/* Paths through the Galaxy (Display Options → Galactic Path) */}
      {galacticTrailYears > 0 && (
        <group visible={isSolarSystem || isSunFocused}>
          <GalacticTrails bodies={trailBodies} spanYears={galacticTrailYears} showLabels={isSolarSystem || isSunFocused} />
        </group>
      )}

      {/* Asteroid Belt */}
      <group visible={(isSolarSystem || isSunFocused) && !hiddenBodies.has('Asteroid Belt')}>
        <AsteroidBelt useSimplifiedDistance={useSimplifiedDistance} />
      </group>

      {/* Heliosphere boundaries + escaping probes */}
      <group visible={(isSolarSystem || isSunFocused) && !hiddenBodies.has('Heliosphere')}>
        <Heliosphere useSimplifiedDistance={useSimplifiedDistance} visible={(isSolarSystem || isSunFocused) && !hiddenBodies.has('Heliosphere')} />
      </group>
      <group visible={isSolarSystem || isSunFocused}>
        <Spacecraft hiddenBodies={hiddenBodies} useSimplifiedDistance={useSimplifiedDistance} />
      </group>

      {/* Trans-Neptunian populations */}
      <group visible={(isSolarSystem || isSunFocused) && !hiddenBodies.has('Kuiper Belt')}>
        <KuiperBelt useSimplifiedDistance={useSimplifiedDistance} />
      </group>
      <group visible={(isSolarSystem || isSunFocused) && !hiddenBodies.has('Scattered Disc')}>
        <ScatteredDisc useSimplifiedDistance={useSimplifiedDistance} />
      </group>

      {/* Comets */}
      <group visible={isSolarSystem || isSunFocused}>
        <Comets hiddenBodies={hiddenBodies} showOrbits={showOrbits} />
      </group>

      {/* Trojan swarms at Jupiter's and Neptune's L4/L5 points */}
      <group visible={(isSolarSystem || isSunFocused) && !hiddenBodies.has('Jupiter Trojans')}>
        <JupiterTrojans useSimplifiedDistance={useSimplifiedDistance} />
      </group>
      <group visible={(isSolarSystem || isSunFocused) && !hiddenBodies.has('Neptune Trojans')}>
        <NeptuneTrojans useSimplifiedDistance={useSimplifiedDistance} />
      </group>

      {/* Planets and orbits */}
      {planets.map((planet) => {
        const isThisPlanetFocused = focus === planet.name;
        const isVisible = (isSolarSystem || isSunFocused || isThisPlanetFocused) && !hiddenBodies.has(planet.name);

        return (
          <group key={planet.name} visible={isVisible}>
            {showOrbits && (isSolarSystem || isSunFocused) && (
              <Orbit
                orbitMode={orbitMode}
                orbitData={planet.orbitData}
                useSimplifiedDistance={useSimplifiedDistance}
                color={orbitColorFor(planet.name)}
                lineWidth={1.5}
              />
            )}
            <Planet
              {...planet}
              onClick={(name) => setFocus(name, planet)} // Pass planet details
              orbitMode={orbitMode}
              useSimplifiedDistance={useSimplifiedDistance}
              useRealisticSizes={useRealisticSizes}
              isFocused={isThisPlanetFocused}
              showAtmosphere={showAtmosphere}
              showCrust={showCrust}
              hoveredLayer={hoveredLayer}
              setHoveredLayer={setHoveredLayer}
            />
          </group>
        );
      })}

      {/* Dwarf planets (Pluto, Ceres, Eris, Haumea, Makemake) */}
      {dwarfPlanets.map((dwarf) => {
        const isThisFocused = focus === dwarf.name;
        const isVisible = (isSolarSystem || isSunFocused || isThisFocused) && !hiddenBodies.has(dwarf.name);

        return (
          <group key={dwarf.name} visible={isVisible}>
            {showOrbits && (isSolarSystem || isSunFocused) && (
              <Orbit
                orbitMode={orbitMode}
                orbitData={dwarf.orbitData}
                useSimplifiedDistance={useSimplifiedDistance}
                color={orbitColorFor(dwarf.name)}
                lineWidth={1.5}
              />
            )}
            <Planet
              {...(dwarf as unknown as PlanetProps)}
              onClick={(name) => setFocus(name, dwarf as unknown as PlanetProps)}
              orbitMode={orbitMode}
              useSimplifiedDistance={useSimplifiedDistance}
              useRealisticSizes={useRealisticSizes}
              isFocused={isThisFocused}
              showAtmosphere={showAtmosphere}
              showCrust={showCrust}
              hoveredLayer={hoveredLayer}
              setHoveredLayer={setHoveredLayer}
            />
          </group>
        );
      })}

      {/* Largest main-belt asteroids (Vesta, Pallas, Hygiea, Interamnia) */}
      {asteroids.map((asteroid) => {
        const isThisFocused = focus === asteroid.name;
        const isVisible = (isSolarSystem || isSunFocused || isThisFocused) && !hiddenBodies.has(asteroid.name);

        return (
          <group key={asteroid.name} visible={isVisible}>
            {showOrbits && (isSolarSystem || isSunFocused) && (
              <Orbit
                orbitMode={orbitMode}
                orbitData={asteroid.orbitData}
                useSimplifiedDistance={useSimplifiedDistance}
                color={orbitColorFor(asteroid.name)}
                lineWidth={0.75}
              />
            )}
            <Planet
              {...(asteroid as unknown as PlanetProps)}
              onClick={(name) => setFocus(name, asteroid as unknown as PlanetProps)}
              orbitMode={orbitMode}
              useSimplifiedDistance={useSimplifiedDistance}
              useRealisticSizes={useRealisticSizes}
              isFocused={isThisFocused}
              showAtmosphere={showAtmosphere}
              showCrust={showCrust}
              hoveredLayer={hoveredLayer}
              setHoveredLayer={setHoveredLayer}
            />
          </group>
        );
      })}

      {/* Named small bodies from Wikipedia's List of Solar System objects (data/smallBodies.ts) */}
      {smallBodies.map((body) => {
        const isThisFocused = focus === body.name;
        const isVisible = (isSolarSystem || isSunFocused || isThisFocused) && !hiddenBodies.has(body.name);

        return (
          <group key={body.name} visible={isVisible}>
            {showOrbits && (isSolarSystem || isSunFocused) && (
              <Orbit
                orbitMode={orbitMode}
                orbitData={body.orbitData}
                useSimplifiedDistance={useSimplifiedDistance}
                color={orbitColorFor(body.name)}
                lineWidth={body.category === 'dwarf' ? 1.5 : 0.75}
              />
            )}
            <Planet
              {...(body as unknown as PlanetProps)}
              onClick={(name) => setFocus(name, body as unknown as PlanetProps)}
              orbitMode={orbitMode}
              useSimplifiedDistance={useSimplifiedDistance}
              useRealisticSizes={useRealisticSizes}
              isFocused={isThisFocused}
              showAtmosphere={showAtmosphere}
              showCrust={showCrust}
              hoveredLayer={hoveredLayer}
              setHoveredLayer={setHoveredLayer}
            />
          </group>
        );
      })}

      {/* Sun */}
      <group visible={(isSolarSystem || isSunFocused) && !hiddenBodies.has('Sun')}>
        <Sun
          size={2} 
          textureUrl="/solarsystemImages/SunTexture.jpg"
          rotationalSpeed={0.5}
          onClick={() => setFocus('Sun', null)}
        />
      </group>
    </>
  )
}
