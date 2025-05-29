import { useEffect, useState } from 'react'
import Planet from './Planet'
import Orbit from './Orbit'
import { planets } from '../data/planets'
import InfoPopup from './InfoPopup'
import { AsteroidBelt } from './AsteroidBelt'
import * as dat from 'dat.gui';
import Sun from './Sun'
import { PlanetProps } from './Planet'

type OrbitMode = 'Simple' | 'Elliptical' | 'To Scale';

type SolarSystemProps = {
  setSelectedPlanet: (planetName: string | null, planetData: PlanetProps | null) => void;
};

export default function SolarSystem({ setSelectedPlanet }: SolarSystemProps) {
  const [showOrbits, setShowOrbits] = useState(true);
  const [orbitMode, setOrbitMode] = useState<OrbitMode>('Simple');

  useEffect(() => {
    // Initialize dat.GUI
    const gui = new dat.GUI();

    // Controls object for dat.GUI
    const controls = {
      showOrbits: showOrbits,
      orbitMode: orbitMode
    };

    // Add orbit visibility toggle
    gui.add(controls, 'showOrbits').name('Show Orbits').onChange((value: boolean) => {
      setShowOrbits(value);
    });

    // Add orbit mode dropdown
    gui.add(controls, 'orbitMode', ['Simple', 'Elliptical', 'To Scale']).name('Orbit Mode').onChange((value: OrbitMode) => {
      setOrbitMode(value);
    });

    // Cleanup GUI on component unmount
    return () => {
      gui.destroy();
    };
  }, [showOrbits]);

  return (
    <>
      {/* Asteroid Belt */}
      <AsteroidBelt />

      {/* Planets and orbits */}
      {planets.map((planet) => (
        <group key={planet.name}>
          {showOrbits && (
            <Orbit
              orbitMode={orbitMode}
              orbitData={planet.orbitData}
            />
          )}
          <Planet 
            {...planet} 
            onClick={(name) => setSelectedPlanet(name, planet)} // Pass planet details
            orbitMode={orbitMode}
          />
        </group>
      ))}

      {/* Sun */}
      <Sun 
        size={2} 
        textureUrl="/solarsystemImages/SunTexture.jpg"
        rotationalSpeed={0.5}
        onClick={() => setSelectedPlanet('Sun', null)}
      />
    </>
  )
}
