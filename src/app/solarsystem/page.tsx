'use client'
import StandardLayout from '@/layouts/standardLayout';
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { useEffect, useState, useRef } from 'react';
import { PlanetProps } from './components/Planet';

// Importing the UniverseCanvas component dynamically to avoid SSR issues 
const UniverseCanvas = dynamic(() => import('./components/UniverseCanvas').then(mod => mod.UniverseCanvas), {
  ssr: false,
  loading: () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: 'black',
      color: 'white' 
    }}>
      Loading Solar System...
    </div>
  )
})

export default function Home() {

    const [focus, setFocus] = useState<string>("solarsystem");
    const [focusedPlanet, setFocusedPlanet] = useState<PlanetProps | null>(null);

    const handleFocusChange = (newFocus: string, planetData: PlanetProps | null) => {
      setFocus(newFocus);
      setFocusedPlanet(planetData);
    };
  
  const main =(
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left Column: Text Information */}
      {/* {selectedPlanet && planetData ? (
          <PlanetText {...planetData} />
      ) : <SolarSystemText />} */}
      <Suspense fallback={
        <div style={{ 
          flex: 2, 
          position: 'relative',
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          backgroundColor: 'black',
          color: 'white' 
        }}>
          Initializing 3D Scene...
        </div>
      }>
        <UniverseCanvas 
          focus={focus}
          focusedPlanet={focusedPlanet}
          setFocus={handleFocusChange} 
        />
      </Suspense>
  </div>);

  return StandardLayout({title: "Solar System", main });
}
