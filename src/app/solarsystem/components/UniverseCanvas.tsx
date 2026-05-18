import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { Stars } from '@react-three/drei'
import SolarSystem from './SolarSystem'
import { useEffect, useState, useRef } from 'react'
import {PlanetProps} from './Planet';
import OrbitControlsMenu from './OrbitControls';
import CameraController from './CameraController';
import { OrbitControls } from '@react-three/drei';
import { simulationState } from '../utils';

type OrbitMode = 'Simple' | 'Elliptical' | 'RealLive';

function StarMapBackground({ visible }: { visible: boolean }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const imagePath = isMobile ? '/solarsystemImages/StarMap_2k.jpg' : '/solarsystemImages/StarMap_8k.jpg';
  const texture = useLoader(THREE.TextureLoader, imagePath);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  if (!visible) return null;
  return <primitive attach="background" object={texture} />;
}

function ConstellationsOverlay({ visible }: { visible: boolean }) {
  const texture = useLoader(THREE.TextureLoader, '/solarsystemImages/constellation_figures.jpg');
  texture.colorSpace = THREE.SRGBColorSpace;
  if (!visible) return null;
  return (
    <mesh>
      <sphereGeometry args={[9000, 64, 64]} />
      <meshBasicMaterial 
        map={texture} 
        side={THREE.BackSide} 
        transparent={true} 
        opacity={0.3} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function TimeUpdater({ timeScale }: { timeScale: number }) {
  useEffect(() => {
    simulationState.dateMs = Date.now();
    simulationState.elapsed = performance.now() / 1000;
  }, []);

  useFrame((_, delta) => {
    simulationState.elapsed += delta * timeScale;
    simulationState.dateMs += delta * 1000 * timeScale;
  });
  
  return null;
}

type UniverseCanvasProps = {
  focus: string;
  focusedPlanet: PlanetProps | null;
  setFocus: (focus: string, planetData: PlanetProps | null) => void;
};

export function UniverseCanvas({ focus, focusedPlanet, setFocus }: UniverseCanvasProps) {
  const [contextLost, setContextLost] = useState(false);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showBackground, setShowBackground] = useState(false);
  const [orbitMode, setOrbitMode] = useState<OrbitMode>('Simple');
  const [useSimplifiedDistance, setUseSimplifiedDistance] = useState(true);
  const [useRealisticSizes, setUseRealisticSizes] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
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
        timeScale={timeScale}
        setTimeScale={setTimeScale}
        showBackground={showBackground}
        setShowBackground={setShowBackground}
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
        <ambientLight intensity={focus === 'solarsystem' ? 0.22 : 1.0} />
        <pointLight position={[0, 0, 0]} intensity={focus === 'solarsystem' ? 5000 : 500} />

        <TimeUpdater timeScale={timeScale} />

        {/* background */}
        <StarMapBackground visible={showBackground} />
        <ConstellationsOverlay visible={showBackground} />
        
        <CameraController 
          focus={focus}
          planetData={focusedPlanet ? {
            name: focusedPlanet.name,
            orbitData: focusedPlanet.orbitData,
            orbitMode: orbitMode,
            moons: focusedPlanet.moons,
            size: focusedPlanet.size,
            realDiameter: focusedPlanet.realDiameter
          } : null}
          orbitControlsRef={orbitControlsRef}
          useSimplifiedDistance={useSimplifiedDistance}
          useRealisticSizes={useRealisticSizes}
        />
        <SolarSystem
          setFocus={(focus: string, planetData: PlanetProps | null) => {
            setFocus(focus, planetData);
          }}
          focus={focus}
          showOrbits={showOrbits}
          orbitMode={orbitMode}
          useSimplifiedDistance={useSimplifiedDistance}
          useRealisticSizes={useRealisticSizes}
          timeScale={timeScale}
        />
        <OrbitControls ref={orbitControlsRef} />
      </Canvas>
    </div>
  )
}