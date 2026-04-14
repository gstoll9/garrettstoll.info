import Planet from './Planet'
import Orbit from './Orbit'
import { planets } from '../data/planets'
import { AsteroidBelt } from './AsteroidBelt'
import Sun from './Sun'
import { PlanetProps } from './Planet'

type OrbitMode = 'Simple' | 'Elliptical' | 'RealLive';

type SolarSystemProps = {
  setFocus: (focus: string, planetData: PlanetProps | null) => void;
  focus: string;
  showOrbits: boolean;
  orbitMode: OrbitMode;
  useSimplifiedDistance: boolean;
  useRealisticSizes: boolean;
  timeScale: number;
};

export default function SolarSystem({ setFocus, focus, showOrbits, orbitMode, useSimplifiedDistance, useRealisticSizes, timeScale }: SolarSystemProps) {

  return (
    <>
      {/* Asteroid Belt */}
      <AsteroidBelt useSimplifiedDistance={useSimplifiedDistance} />

      {/* Planets and orbits */}
      {planets.map((planet) => (
        <group key={planet.name}>
          {showOrbits && (
            <Orbit
              orbitMode={orbitMode}
              orbitData={planet.orbitData}
              useSimplifiedDistance={useSimplifiedDistance}
            />
          )}
          <Planet 
            {...planet} 
            onClick={(name) => setFocus(name, planet)} // Pass planet details
            orbitMode={orbitMode}
            useSimplifiedDistance={useSimplifiedDistance}
            useRealisticSizes={useRealisticSizes}
            timeScale={timeScale}
            isFocused={focus === planet.name}
          />
        </group>
      ))}

      {/* Sun */}
      <Sun 
        size={2} 
        textureUrl="/solarsystemImages/SunTexture.jpg"
        rotationalSpeed={0.5}
        onClick={() => setFocus('Sun', null)}
        timeScale={timeScale}
      />
    </>
  )
}
