import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { Stars } from '@react-three/drei'
import SolarSystem from './SolarSystem'
import GalaxyField from './GalaxyField'
import { useEffect, useState, useRef } from 'react'
import {PlanetProps} from './Planet';
import OrbitControlsMenu from './OrbitControls';
import ObjectVisibilityMenu from './ObjectVisibilityMenu';
import CameraController from './CameraController';
import { OrbitControls } from '@react-three/drei';
import { simulationState } from '../utils';
import { dwarfPlanets } from '../data/dwarfPlanets';
import { ASTEROID_BELT_BODIES } from '../data/regions';

type OrbitMode = 'RealLive';

// Dwarf planets other than Ceres (which lives in the Asteroid Belt group) start hidden.
const DEFAULT_HIDDEN_BODIES = dwarfPlanets
  .filter((d) => !ASTEROID_BELT_BODIES.has(d.name))
  .map((d) => d.name);

function StarMapBackground({ visible }: { visible: boolean }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const imagePath = isMobile ? '/solarsystemImages/StarMap_2k.jpg' : '/solarsystemImages/StarMap_8k.jpg';
  const texture = useLoader(THREE.TextureLoader, imagePath);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  if (!visible) return null;
  return <primitive attach="background" object={texture} />;
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
  const [showOrbits, setShowOrbits] = useState(false);
  const [showBackground, setShowBackground] = useState(true);
  const [useRealisticSizes, setUseRealisticSizes] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [hiddenBodies, setHiddenBodies] = useState<Set<string>>(() => new Set(DEFAULT_HIDDEN_BODIES));
  const orbitControlsRef = useRef<any>(null);

  const toggleBody = (name: string) => {
    setHiddenBodies(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const setBodiesVisible = (names: string[], visible: boolean) => {
    setHiddenBodies(prev => {
      const next = new Set(prev);
      names.forEach(name => {
        if (visible) {
          next.delete(name);
        } else {
          next.add(name);
        }
      });
      return next;
    });
  };

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
      <div className="solarLoading">
        WebGL Context Lost - Please refresh the page
      </div>
    );
  }

  return (
    <div className="universeCanvasShell">
      <div className="solar-menu-stack">
        {focus !== 'cosmic' && (
          <ObjectVisibilityMenu
            hiddenBodies={hiddenBodies}
            toggleBody={toggleBody}
            setBodiesVisible={setBodiesVisible}
          />
        )}
        <OrbitControlsMenu
          showOrbits={showOrbits}
          setShowOrbits={setShowOrbits}
          useRealisticSizes={useRealisticSizes}
          setUseRealisticSizes={setUseRealisticSizes}
          timeScale={timeScale}
          setTimeScale={setTimeScale}
          showBackground={showBackground}
          setShowBackground={setShowBackground}
        />
      </div>
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 150, 600], fov: 60, near: 0.1, far: 50000 }}
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


        <CameraController
          focus={focus}
          planetData={focusedPlanet ? {
            name: focusedPlanet.name,
            orbitData: focusedPlanet.orbitData,
            orbitMode: 'RealLive',
            moons: focusedPlanet.moons,
            size: focusedPlanet.size,
            realDiameter: focusedPlanet.realDiameter
          } : null}
          orbitControlsRef={orbitControlsRef}
          useSimplifiedDistance={false}
          useRealisticSizes={useRealisticSizes}
        />
        {focus === 'cosmic' ? (
          // Cosmic Web is a "warp cut" to a different scale — rendered inside the same
          // persistent Canvas/WebGL context as the planetary scene (rather than a separate
          // <Canvas>) since mounting a second Canvas here caused WebGL context loss.
          <GalaxyField />
        ) : (
          <SolarSystem
            setFocus={(focus: string, planetData: PlanetProps | null) => {
              setFocus(focus, planetData);
            }}
            focus={focus}
            showOrbits={showOrbits}
            orbitMode={'RealLive'}
            useSimplifiedDistance={false}
            useRealisticSizes={useRealisticSizes}
            timeScale={timeScale}
            hiddenBodies={hiddenBodies}
          />
        )}
        <OrbitControls ref={orbitControlsRef} />
      </Canvas>
      {focus === 'cosmic' && (
        <div className="cosmicWebNote">
          Local Group only, real distances &amp; positions. Superclusters and cosmic-web
          filaments are left out for now — those need a real large-scale-structure dataset,
          not an illustrative one.
        </div>
      )}
    </div>
  )
}