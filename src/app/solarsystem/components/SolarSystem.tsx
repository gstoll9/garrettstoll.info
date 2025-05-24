import { useEffect, useState } from 'react'
import Planet from './Planet'
import Orbit from './Orbit'
import { planets } from '../data/planets'
import InfoPopup from './InfoPopup'
import { AsteroidBelt } from './AsteroidBelt'
import * as dat from 'dat.gui';


export default function SolarSystem() {
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)
  const [showOrbits, setShowOrbits] = useState(true);

  useEffect(() => {
    // Initialize dat.GUI
    const gui = new dat.GUI();

    // Add a button to toggle orbits
    gui.add({ toggleOrbits: () => setShowOrbits((prev) => !prev) }, 'toggleOrbits').name(
      showOrbits ? 'Hide Orbits' : 'Show Orbits'
    );

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
          {showOrbits && <Orbit radius={planet.distance} />}
          <Planet {...planet} onClick={setSelectedPlanet} />
        </group>
      ))}

      {/* Sun */}
      <Planet
        name="Sun"
        size={3}
        distance={0}
        textureUrl={'/solarsystemImages/SunTexture.jpg'}
        rotationalSpeed={.04}
      />

      {selectedPlanet && (
        <InfoPopup name={selectedPlanet} onClose={() => setSelectedPlanet(null)} />
      )}
    </>
  )
}
