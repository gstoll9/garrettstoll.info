'use client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Plane, Stars } from '@react-three/drei'
import SolarSystem from './SolarSystem'
import { useEffect, useState, useRef } from 'react'
import {PlanetProps} from './Planet';
import PlanetText from './text/PlanetText';
import SolarSystemText from './text/SolarSystemText'
import { planets } from '../data/planets'

export function UniverseCanvas() {
  const [contextLost, setContextLost] = useState(false);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [planetData, setPlanetData] = useState<PlanetProps | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Wait for canvas to be created
    const timer = setTimeout(() => {
      const canvas = canvasRef.current || document.querySelector('canvas');
      
      if (canvas) {
        const handleContextLost = (e: Event) => {
          e.preventDefault();
          console.log('WebGL context lost - preventing default behavior');
          setContextLost(true);
        };
        
        const handleContextRestored = () => {
          console.log('WebGL context restored - scene should recover automatically');
          setContextLost(false);
        };
        
        canvas.addEventListener('webglcontextlost', handleContextLost);
        canvas.addEventListener('webglcontextrestored', handleContextRestored);
        
        return () => {
          canvas.removeEventListener('webglcontextlost', handleContextLost);
          canvas.removeEventListener('webglcontextrestored', handleContextRestored);
        };
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (contextLost) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'white',
        backgroundColor: 'black'
      }}>
        WebGL Context Lost - Please refresh the page
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      
      {/* Left Column: Text Information */}
      {/* {selectedPlanet && planetData ? (
          <PlanetText {...planetData} />
      ) : <SolarSystemText />} */}

      {/* Right Column: Three.js Scene */}
      <div style={{ flex: 2, position: 'relative' }}>
        <Canvas
          ref={canvasRef}
          camera={{ position: [0, 10, 40], fov: 60 }}
          gl={{
            powerPreference: 'default',
            antialias: false,
            stencil: false,
            depth: true,
            alpha: false,
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: false,
          }}
        >
          <ambientLight intensity={0.2} />
          <pointLight position={[0, 0, 0]} intensity={5000} />
          <Stars radius={500} depth={50} count={500} factor={4} fade />
          <SolarSystem
            setSelectedPlanet={(planetName: string | null, planetDetails: PlanetProps | null) => {
              setSelectedPlanet(planetName);
              setPlanetData(planetDetails); // Pass planet details
            }}
          />
          <OrbitControls />
        </Canvas>
      </div>
    </div>
  )
}