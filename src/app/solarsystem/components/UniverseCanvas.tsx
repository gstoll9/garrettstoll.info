import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import SolarSystem from './SolarSystem'
import GalaxyField from './GalaxyField'
import { useEffect, useState, useRef } from 'react'
import {PlanetProps, HoveredLayer} from './Planet';
import OrbitControlsMenu from './OrbitControls';
import ObjectVisibilityMenu from './ObjectVisibilityMenu';
import LayerVisibilityControls from './LayerVisibilityControls';
import LayerCrossSection from './LayerCrossSection';
import AtmosphereCrossSection from './AtmosphereCrossSection';
import CameraController from './CameraController';
import { OrbitControls } from '@react-three/drei';
import { simulationState } from '../utils';
import { dwarfPlanets } from '../data/dwarfPlanets';
import { asteroids } from '../data/asteroids';

// All dwarf planets and individual named asteroids start hidden — only the "Asteroid
// Belt" instanced-mesh visualization itself is visible by default.
const DEFAULT_HIDDEN_BODIES = [
  ...dwarfPlanets.map((d) => d.name),
  ...asteroids.map((a) => a.name),
];

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
  const [showOrbits, setShowOrbits] = useState(true);
  const [showBackground, setShowBackground] = useState(true);
  const [useRealisticSizes, setUseRealisticSizes] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [hiddenBodies, setHiddenBodies] = useState<Set<string>>(() => new Set(DEFAULT_HIDDEN_BODIES));
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [showCrust, setShowCrust] = useState(true);
  const [hoveredLayer, setHoveredLayer] = useState<HoveredLayer>(null);
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  // A layer hovered on one planet shouldn't stay "hovered" once the focus target changes.
  useEffect(() => {
    setHoveredLayer(null);
  }, [focus]);

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
      {focusedPlanet?.structure && (
        <div className="solar-menu-stack-right">
          <LayerVisibilityControls
            showAtmosphere={showAtmosphere}
            setShowAtmosphere={setShowAtmosphere}
            showCrust={showCrust}
            setShowCrust={setShowCrust}
          />
          <LayerCrossSection
            structure={focusedPlanet.structure}
            hoveredLayer={hoveredLayer}
            setHoveredLayer={setHoveredLayer}
          />
          {showAtmosphere && (
            <AtmosphereCrossSection atmosphere={focusedPlanet.structure.atmosphere} />
          )}
        </div>
      )}
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
          // Needed once CameraController tightens `near` to 0.001 while focused on a planet
          // (to support scroll-zooming in on true-to-scale thin structure layers) — a
          // standard depth buffer loses precision badly across that near/far (0.001/50000)
          // ratio, which shows up as z-fighting between adjacent shell boundaries.
          logarithmicDepthBuffer: true,
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
            hiddenBodies={hiddenBodies}
            showAtmosphere={showAtmosphere}
            showCrust={showCrust}
            hoveredLayer={hoveredLayer}
            setHoveredLayer={setHoveredLayer}
          />
        )}
        <OrbitControls ref={orbitControlsRef} />
      </Canvas>
    </div>
  )
}