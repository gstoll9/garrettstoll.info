import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import SolarSystem from './SolarSystem'
import GalaxyField from './GalaxyField'
import MilkyWayField, { type MarkerKind } from './MilkyWayField'
import MilkyWayMenu from './MilkyWayMenu'
import ScaleTransitions, { SOLAR_EXIT_DISTANCE } from './ScaleTransitions'
import { useEffect, useState, useRef } from 'react'
import {PlanetProps, HoveredLayer} from './Planet';
import OrbitControlsMenu from './OrbitControls';
import ObjectVisibilityMenu from './ObjectVisibilityMenu';
import LayerVisibilityControls from './LayerVisibilityControls';
import LayerCrossSection from './LayerCrossSection';
import AtmosphereCrossSection from './AtmosphereCrossSection';
import CameraController from './CameraController';
import { OrbitControls } from '@react-three/drei';
import { SUN_GALACTIC_VELOCITY_SCENE_PER_YEAR, simulationState } from '../utils';
import { dwarfPlanets } from '../data/dwarfPlanets';
import { asteroids } from '../data/asteroids';
import { smallBodies } from '../data/smallBodies.display';

// All dwarf planets and individual named asteroids start hidden — only the "Asteroid
// Belt" instanced-mesh visualization itself is visible by default.
const DEFAULT_HIDDEN_BODIES = [
  ...dwarfPlanets.map((d) => d.name),
  ...asteroids.map((a) => a.name),
  ...smallBodies.map((b) => b.name),
];

const YEAR_SECONDS = 31536000; // the Orbital Speed slider's maximum (1 yr/sec)

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
  const [galacticTrailYears, setGalacticTrailYears] = useState(0);
  const [hiddenBodies, setHiddenBodies] = useState<Set<string>>(() => new Set(DEFAULT_HIDDEN_BODIES));
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [showCrust, setShowCrust] = useState(true);
  const [hoveredLayer, setHoveredLayer] = useState<HoveredLayer>(null);
  // A layer clicked in the cross-section panel stays selected (shown in the panel and
  // highlighted in 3D) whenever nothing is being hovered.
  const [selectedLayer, setSelectedLayer] = useState<HoveredLayer>(null);
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);
  const [hiddenMilkyWayKinds, setHiddenMilkyWayKinds] = useState<Set<MarkerKind>>(() => new Set());
  const toggleMilkyWayKind = (kind: MarkerKind) => setHiddenMilkyWayKinds((prev) => {
    const next = new Set(prev);
    if (next.has(kind)) next.delete(kind); else next.add(kind);
    return next;
  });
  const isGalaxyScale = focus === 'cosmic' || focus === 'milkyway';
  // The Galactic Objects menu mounts a moment after the Milky Way view does: swapping the
  // menu stack's contents in the same commit as the scene switch reliably lost the WebGL
  // context (reproduced in Chromium even with a bare <div> in the menu's place).
  const [milkyWayMenuReady, setMilkyWayMenuReady] = useState(false);
  useEffect(() => {
    setMilkyWayMenuReady(false);
    if (focus !== 'milkyway') return;
    const timer = setTimeout(() => setMilkyWayMenuReady(true), 1500);
    return () => clearTimeout(timer);
  }, [focus]);
  // zooming out past the Solar System's edge moves to the Milky Way — but not before the
  // longest galactic tracer is in view
  const solarExitDistance = Math.max(SOLAR_EXIT_DISTANCE, Math.hypot(...SUN_GALACTIC_VELOCITY_SCENE_PER_YEAR) * galacticTrailYears * 1.5);

  // A layer hovered on one planet shouldn't stay "hovered" once the focus target changes.
  useEffect(() => {
    setHoveredLayer(null);
    setSelectedLayer(null);
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
        {focus === 'milkyway' && milkyWayMenuReady && (
          <MilkyWayMenu hiddenKinds={hiddenMilkyWayKinds} toggleKind={toggleMilkyWayKind} />
        )}
        {!isGalaxyScale && (
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
          galacticTrailYears={isGalaxyScale ? undefined : galacticTrailYears}
          setGalacticTrailYears={(years) => {
            // a path through the Galaxy only reads in motion: if time is standing at Live,
            // start it running (1 yr/sec, the speed slider's top) so the tracers draw themselves
            if (years > 0 && galacticTrailYears === 0 && timeScale <= 1) setTimeScale(YEAR_SECONDS);
            setGalacticTrailYears(years);
          }}
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
            selectedLayer={selectedLayer}
            setSelectedLayer={setSelectedLayer}
          />
          {showAtmosphere && (
            <AtmosphereCrossSection atmosphere={focusedPlanet.structure.atmosphere} />
          )}
        </div>
      )}
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 150, 600], fov: 60, near: 0.1, far: 2000000 }}
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
          // standard depth buffer loses precision badly across that near/far (0.001/2e6)
          // ratio, which shows up as z-fighting between adjacent shell boundaries.
          logarithmicDepthBuffer: true,
        }}
      >
        {/* lighting */}
        <ambientLight intensity={focus === 'solarsystem' ? 0.22 : 1.0} />
        <pointLight position={[0, 0, 0]} intensity={focus === 'solarsystem' ? 5000 : 500} />

        <TimeUpdater timeScale={timeScale} />

        {/* background */}
        {/* The star map is the Milky Way's sky as seen from inside it — meaningless from
            the Local Group vantage point outside the galaxy, so that view gets black space. */}
        <StarMapBackground visible={showBackground && !isGalaxyScale} />


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
        {/* The Solar System stays mounted (hidden) in the galaxy-scale views: unmounting its
            dozens of drei <Line> orbits and rendering straight on reliably lost the WebGL
            context (the same failure Moon.tsx avoids). Its overlays already hide themselves
            outside the Solar System / planet views. */}
        <group visible={!isGalaxyScale}>
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
            hoveredLayer={hoveredLayer ?? selectedLayer}
            setHoveredLayer={setHoveredLayer}
            galacticTrailYears={galacticTrailYears}
          />
        </group>
        {/* Cosmic Web is a "warp cut" to a different scale — rendered inside the same
            persistent Canvas/WebGL context as the planetary scene (rather than a separate
            <Canvas>) since mounting a second Canvas here caused WebGL context loss. */}
        {focus === 'cosmic' && <GalaxyField />}
        {focus === 'milkyway' && <MilkyWayField orbitControlsRef={orbitControlsRef} hiddenKinds={hiddenMilkyWayKinds} />}
        <ScaleTransitions
          focus={focus}
          setFocus={(next) => setFocus(next, null)}
          orbitControlsRef={orbitControlsRef}
          solarExitDistance={solarExitDistance}
        />
        {/* each wheel step zooms by 0.95^zoomSpeed: faster across the Solar System's huge
            range so reaching its edge (and the Milky Way beyond) takes a few dozen steps */}
        <OrbitControls ref={orbitControlsRef} zoomSpeed={focus === 'solarsystem' || focus === 'Sun' || isGalaxyScale ? 3 : 1} />
      </Canvas>
    </div>
  )
}