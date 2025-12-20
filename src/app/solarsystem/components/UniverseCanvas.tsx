'use client'
import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import SolarSystem from './SolarSystem'
import { useEffect, useState, useRef } from 'react'
import {PlanetProps} from './Planet';
import OrbitControlsMenu from './OrbitControls';
import CameraController from './CameraController';
import { OrbitControls } from '@react-three/drei';

type OrbitMode = 'Simple' | 'Elliptical';

type UniverseCanvasProps = {
  focus: string;
  focusedPlanet: PlanetProps | null;
  setFocus: (focus: string, planetData: PlanetProps | null) => void;
};

export function UniverseCanvas({ focus, focusedPlanet, setFocus }: UniverseCanvasProps) {
  const [contextLost, setContextLost] = useState(false);
  const [showOrbits, setShowOrbits] = useState(true);
  const [orbitMode, setOrbitMode] = useState<OrbitMode>('Simple');
  const [useSimplifiedDistance, setUseSimplifiedDistance] = useState(true);
  const [useRealisticSizes, setUseRealisticSizes] = useState(false);
  const orbitControlsRef = useRef<any>(null);

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
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <OrbitControlsMenu
        orbitMode={orbitMode}
        setOrbitMode={setOrbitMode}
        showOrbits={showOrbits}
        setShowOrbits={setShowOrbits}
        useSimplifiedDistance={useSimplifiedDistance}
        setUseSimplifiedDistance={setUseSimplifiedDistance}
        useRealisticSizes={useRealisticSizes}
        setUseRealisticSizes={setUseRealisticSizes}
      />
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 10, 40], fov: 60, near: 0.1, far: 10000 }}
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
        {/* lighting */}
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 0]} intensity={5000} />

        {/* background */}
        <CameraController 
          focus={focus}
          planetData={focusedPlanet ? {
            name: focusedPlanet.name,
            orbitData: focusedPlanet.orbitData,
            orbitMode: orbitMode
          } : null}
          orbitControlsRef={orbitControlsRef}
          useSimplifiedDistance={useSimplifiedDistance}
        />
        <SolarSystem
          setFocus={(focus: string, planetData: PlanetProps | null) => {
            setFocus(focus, planetData);
          }}
          showOrbits={showOrbits}
          orbitMode={orbitMode}
          useSimplifiedDistance={useSimplifiedDistance}
          useRealisticSizes={useRealisticSizes}
        />
        <OrbitControls ref={orbitControlsRef} />
      </Canvas>
    </div>
  )
}