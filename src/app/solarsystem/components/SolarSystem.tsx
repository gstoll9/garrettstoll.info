import Planet from './Planet'
import Orbit from './Orbit'
import { planets } from '../data/planets'
import { dwarfPlanets } from '../data/dwarfPlanets'
import { AsteroidBelt } from './AsteroidBelt'
import Sun from './Sun'
import Heliosphere from './Heliosphere'
import SolarWind from './SolarWind'
import { PlanetProps } from './Planet'

type OrbitMode = 'Simple' | 'Elliptical' | 'RealLive';

// Orbit line color by solar-system region.
const REGION_COLORS = {
  inner: '#e8935a',        // Mercury, Venus, Earth, Mars — rocky, close to the Sun
  asteroidBelt: '#9a8a7a', // Ceres — rocky debris between Mars and Jupiter
  outer: '#5fb8e8',        // Jupiter, Saturn, Uranus, Neptune — gas/ice giants
  transNeptunian: '#b39ddb', // Pluto, Eris, Haumea, Makemake — icy, beyond Neptune
} as const;

const INNER_PLANETS = new Set(['Mercury', 'Venus', 'Earth', 'Mars']);
const ASTEROID_BELT_BODIES = new Set(['Ceres']);
const OUTER_PLANETS = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune']);
// Everything else in dwarfPlanets (Pluto, Eris, Haumea, Makemake) is trans-Neptunian.

function orbitColorFor(name: string): string {
  if (INNER_PLANETS.has(name)) return REGION_COLORS.inner;
  if (ASTEROID_BELT_BODIES.has(name)) return REGION_COLORS.asteroidBelt;
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
  timeScale: number;
  showHeliosphere: boolean;
  showSolarWind: boolean;
};

export default function SolarSystem({ setFocus, focus, showOrbits, orbitMode, useSimplifiedDistance, useRealisticSizes, timeScale, showHeliosphere, showSolarWind }: SolarSystemProps) {

  const isSolarSystem = focus === 'solarsystem';
  const isSunFocused = focus === 'Sun';

  return (
    <>
      {/* Asteroid Belt */}
      <group visible={isSolarSystem || isSunFocused}>
        <AsteroidBelt useSimplifiedDistance={useSimplifiedDistance} />
      </group>

      {/* Heliosphere boundary (termination shock + heliopause) */}
      {showHeliosphere && (
        <group visible={isSolarSystem || isSunFocused}>
          <Heliosphere />
        </group>
      )}

      {/* Solar wind particle stream */}
      {showSolarWind && (
        <group visible={isSolarSystem || isSunFocused}>
          <SolarWind />
        </group>
      )}

      {/* Planets and orbits */}
      {planets.map((planet) => {
        const isThisPlanetFocused = focus === planet.name;
        const isVisible = isSolarSystem || isSunFocused || isThisPlanetFocused;

        return (
          <group key={planet.name} visible={isVisible}>
            {showOrbits && (isSolarSystem || isSunFocused) && (
              <Orbit
                orbitMode={orbitMode}
                orbitData={planet.orbitData}
                useSimplifiedDistance={useSimplifiedDistance}
                color={orbitColorFor(planet.name)}
              />
            )}
            <Planet
              {...planet}
              onClick={(name) => setFocus(name, planet)} // Pass planet details
              orbitMode={orbitMode}
              useSimplifiedDistance={useSimplifiedDistance}
              useRealisticSizes={useRealisticSizes}
              timeScale={timeScale}
              isFocused={isThisPlanetFocused}
            />
          </group>
        );
      })}

      {/* Dwarf planets (Pluto, Ceres, Eris, Haumea, Makemake) */}
      {dwarfPlanets.map((dwarf) => {
        const isThisFocused = focus === dwarf.name;
        const isVisible = isSolarSystem || isSunFocused || isThisFocused;

        return (
          <group key={dwarf.name} visible={isVisible}>
            {showOrbits && (isSolarSystem || isSunFocused) && (
              <Orbit
                orbitMode={orbitMode}
                orbitData={dwarf.orbitData}
                useSimplifiedDistance={useSimplifiedDistance}
                color={orbitColorFor(dwarf.name)}
              />
            )}
            <Planet
              {...(dwarf as unknown as PlanetProps)}
              onClick={(name) => setFocus(name, dwarf as unknown as PlanetProps)}
              orbitMode={orbitMode}
              useSimplifiedDistance={useSimplifiedDistance}
              useRealisticSizes={useRealisticSizes}
              timeScale={timeScale}
              isFocused={isThisFocused}
            />
          </group>
        );
      })}

      {/* Sun */}
      <group visible={isSolarSystem || isSunFocused}>
        <Sun
          size={2} 
          textureUrl="/solarsystemImages/SunTexture.jpg"
          rotationalSpeed={0.5}
          onClick={() => setFocus('Sun', null)}
          timeScale={timeScale}
        />
      </group>
    </>
  )
}
