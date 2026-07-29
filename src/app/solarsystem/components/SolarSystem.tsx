import Planet from './Planet'
import Orbit from './Orbit'
import { planets } from '../data/planets'
import { dwarfPlanets } from '../data/dwarfPlanets'
import { asteroids } from '../data/asteroids'
import { AsteroidBelt } from './AsteroidBelt'
import Sun from './Sun'
import { PlanetProps, HoveredLayer } from './Planet'
import { INNER_PLANETS, ASTEROID_BELT_BODIES, OUTER_PLANETS, REGION_COLORS } from '../data/regions'

type OrbitMode = 'Simple' | 'Elliptical' | 'RealLive';

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
  hiddenBodies: Set<string>;
  showAtmosphere: boolean;
  showCrust: boolean;
  hoveredLayer: HoveredLayer;
  setHoveredLayer: (layer: HoveredLayer) => void;
};

export default function SolarSystem({ setFocus, focus, showOrbits, orbitMode, useSimplifiedDistance, useRealisticSizes, hiddenBodies, showAtmosphere, showCrust, hoveredLayer, setHoveredLayer }: SolarSystemProps) {

  const isSolarSystem = focus === 'solarsystem';
  const isSunFocused = focus === 'Sun';

  return (
    <>
      {/* Asteroid Belt */}
      <group visible={(isSolarSystem || isSunFocused) && !hiddenBodies.has('Asteroid Belt')}>
        <AsteroidBelt useSimplifiedDistance={useSimplifiedDistance} />
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
