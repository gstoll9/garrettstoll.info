import { useState } from 'react'
import Planet from './Planet'
import Orbit from './Orbit'
import { planets } from '../data/planets'
import InfoPopup from './InfoPopup'
import { AsteroidBelt } from './AsteroidBelt'

// Inside the return block of SolarSystem



export default function SolarSystem() {
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)

  return (
    <>
      {/* Sun */}
      <Planet
        name="Sun"
        size={3}
        distance={0}
        textureUrl={'/solarsystemImages/SunTexture.jpg'}
        rotationalSpeed={.04}
      />

      {/* Asteroid Belt */}
      <AsteroidBelt />

      {/* Planets and orbits */}
      {planets.map((planet) => (
        <group key={planet.name}>
          <Orbit radius={planet.distance} />
          <Planet {...planet} onClick={setSelectedPlanet} />
        </group>
      ))}

      {selectedPlanet && (
        <InfoPopup name={selectedPlanet} onClose={() => setSelectedPlanet(null)} />
      )}
    </>
  )
}
