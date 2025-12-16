import Planet from './Planet'
import Orbit from './Orbit'
import { planets } from '../data/planets'
import { AsteroidBelt } from './AsteroidBelt'
import Sun from './Sun'
import { PlanetProps } from './Planet'

type OrbitMode = 'Simple' | 'Elliptical';

type SolarSystemProps = {
  setFocus: (focus: string, planetData: PlanetProps | null) => void;
  showOrbits: boolean;
  orbitMode: OrbitMode;
  useSimplifiedDistance: boolean;
  useRealisticSizes: boolean;
};

export default function SolarSystem({ setFocus, showOrbits, orbitMode, useSimplifiedDistance, useRealisticSizes }: SolarSystemProps) {

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
          />
        </group>
      ))}

      {/* Sun */}
      <Sun 
        size={2} 
        textureUrl="/solarsystemImages/SunTexture.jpg"
        rotationalSpeed={0.5}
        onClick={() => setFocus('Sun', null)}
      />
    </>
  )
}
