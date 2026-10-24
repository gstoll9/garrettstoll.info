import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { LOCAL_GROUP_VIEW_POSITION, LOCAL_GROUP_VIEW_TARGET, MILKY_WAY_SUN_SCENE, orbitalPosition, OrbitProps, scaleTransition, simulationState } from '../utils'

import { getPlanetSize } from '../data/planets'
import { moonElements } from '../data/moonElements'
import { PLANET_EQUATORIAL_RADIUS_KM } from '../data/moonAppearance'
import type { PlanetProps } from './Planet'

type CameraControllerProps = {
  focus: string;
  planetData: {
    name: string;
    orbitData: OrbitProps;
    orbitMode: string;
    moons?: PlanetProps['moons'];
    size?: number;
    realDiameter?: number;
  } | null;
  orbitControlsRef: React.RefObject<OrbitControlsImpl | null>;
  useSimplifiedDistance: boolean;
  useRealisticSizes?: boolean;
}

// Arrival framings when scroll-zooming between models (components/ScaleTransitions.tsx)
const SOLAR_ARRIVAL_DIRECTION: [number, number, number] = [0, 0.243, 0.970] // the default view's (0, 150, 600)
const SOLAR_ARRIVAL_DISTANCE = 18000 // 1,500 AU, inside ScaleTransitions' 30,000 exit
const GALAXY_ARRIVAL_DIRECTION: [number, number, number] = [0.42, 0.62, 0.66] // above the disk, from the Sun's side
const MILKY_WAY_ARRIVAL_NEAR = 3 // 0.3 kpc from the Sun (enter-Solar-System threshold is 1.2)
const MILKY_WAY_ARRIVAL_FAR = 450 // 45 kpc (exit-to-Local-Group threshold is 700)
const MILKY_WAY_OVERVIEW = 300 // 30 kpc: the whole disk, seen mostly face-on so the arms read
const MILKY_WAY_OVERVIEW_DIRECTION: [number, number, number] = [0.2, 0.88, 0.43]
const LOCAL_GROUP_ARRIVAL_DISTANCE = 9 // 90 kpc (back-into-the-Milky-Way threshold is 5)

export default function CameraController({ focus, planetData, orbitControlsRef, useSimplifiedDistance, useRealisticSizes = false }: CameraControllerProps) {
  const { camera } = useThree()
  const isFollowing = useRef(false)
  // null until the first effect run: the canvas content can mount late (it suspends while
  // textures load), possibly already focused on a planet — starting at `focus` would then
  // skip that planet's initial camera jump and leave the camera wherever it was.
  const prevFocus = useRef<string | null>(null)
  const isJumpPending = useRef(false)

  useEffect(() => {
    const entry = scaleTransition.entry
    scaleTransition.entry = null
    if (focus !== 'solarsystem' && focus !== 'Sun' && focus !== 'cosmic' && focus !== 'milkyway') {
      // a planet: its framing distance is set when the jump happens below
    } else {
      scaleTransition.planetFrameDistance = null
    }
    if (focus === 'solarsystem' || focus === 'Sun') {
      isFollowing.current = false
      isJumpPending.current = false
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.set(0, 0, 0)

        if (entry === 'fromOuter') {
          // zoomed in from the Milky Way: arrive far out, looking back at the Sun
          camera.position.set(...SOLAR_ARRIVAL_DIRECTION).multiplyScalar(SOLAR_ARRIVAL_DISTANCE)
        } else if (prevFocus.current !== null && prevFocus.current !== 'solarsystem' && prevFocus.current !== 'Sun') {
          // Return to wide view if we were following
          camera.position.set(0, 10, 40)
        }
        orbitControlsRef.current.update()
      }
      // Revert the near-plane tightening below — the wide solar-system view doesn't need it,
      // and keeping it that small there would waste depth-buffer precision at long range.
      if ((camera as THREE.PerspectiveCamera).near !== 0.1) {
        (camera as THREE.PerspectiveCamera).near = 0.1;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
    } else if (focus === 'cosmic') {
      // Cosmic Web is a "warp cut" to a different scale, not a continuous zoom — just
      // hard-reset the camera to a framing that fits the Local Group once, then let
      // OrbitControls take over (nothing to follow at this scale).
      isFollowing.current = false
      isJumpPending.current = false
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.set(...LOCAL_GROUP_VIEW_TARGET)
        if (entry === 'fromInner') {
          // zoomed out of the Milky Way: arrive just outside it (the view is centred on it)
          camera.position.set(...GALAXY_ARRIVAL_DIRECTION).multiplyScalar(LOCAL_GROUP_ARRIVAL_DISTANCE)
        } else if (prevFocus.current !== 'cosmic') {
          camera.position.set(...LOCAL_GROUP_VIEW_POSITION)
        }
        orbitControlsRef.current.update()
      }
      if ((camera as THREE.PerspectiveCamera).near !== 0.1) {
        (camera as THREE.PerspectiveCamera).near = 0.1;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
    } else if (focus === 'milkyway') {
      // The Milky Way model: arriving from the Solar System starts zoomed in on the Sun,
      // from the Local Group zoomed out on the whole disk; a tab click shows the whole disk.
      // MilkyWayField eases the pivot between the Sun and the Galactic Centre with zoom.
      isFollowing.current = false
      isJumpPending.current = false
      if (orbitControlsRef.current && prevFocus.current !== 'milkyway') {
        const dir = new THREE.Vector3(...GALAXY_ARRIVAL_DIRECTION)
        if (entry === 'fromInner') {
          orbitControlsRef.current.target.set(...MILKY_WAY_SUN_SCENE)
          camera.position.copy(dir.multiplyScalar(MILKY_WAY_ARRIVAL_NEAR)).add(orbitControlsRef.current.target)
        } else if (entry === 'fromOuter') {
          orbitControlsRef.current.target.set(0, 0, 0)
          camera.position.copy(dir.multiplyScalar(MILKY_WAY_ARRIVAL_FAR))
        } else {
          orbitControlsRef.current.target.set(0, 0, 0)
          camera.position.set(...MILKY_WAY_OVERVIEW_DIRECTION).normalize().multiplyScalar(MILKY_WAY_OVERVIEW)
        }
        orbitControlsRef.current.update()
      }
      if ((camera as THREE.PerspectiveCamera).near !== 0.01) {
        (camera as THREE.PerspectiveCamera).near = 0.01;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
    } else if (focus && planetData) {
      isFollowing.current = true
      if (prevFocus.current !== focus) {
          isJumpPending.current = true
      }
      // Tighten the near plane so scroll-zooming in close on a true-to-scale thin layer
      // (e.g. a planet's crust or atmosphere shell) doesn't get clipped by the camera's
      // near plane before the shell fills a meaningful part of the view.
      if ((camera as THREE.PerspectiveCamera).near !== 0.001) {
        (camera as THREE.PerspectiveCamera).near = 0.001;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
    }
    prevFocus.current = focus
  }, [focus, planetData, orbitControlsRef, camera])

  useFrame(() => {
    if (isFollowing.current && planetData && orbitControlsRef.current) {
      const [x, y, z] = orbitalPosition(
        planetData.orbitMode,
        simulationState.elapsed,
        planetData.orbitData,
        useSimplifiedDistance,
        planetData.name,
        simulationState.dateMs
      )
      const pPos = new THREE.Vector3(x, y, z)
      
      if (isJumpPending.current) {
        // Calculate max radius including moons
        let planetSize = 1;
        if (planetData.size !== undefined && planetData.realDiameter !== undefined) {
          planetSize = useRealisticSizes ? getPlanetSize({ size: planetData.size, realDiameter: planetData.realDiameter }, true) : planetData.size;
        }
        
        // Moons are at true distance now (Earth's Moon is 60 Earth radii out), so framing
        // them all would shrink the planet cutaway to a dot. Fit only the inner moons that sit
        // within ~8 planet radii; the rest are a scroll-out away, with labels and orbit lines.
        const FRAME_LIMIT_RADII = 8;
        let fitRadius = planetSize;
        for (const name of planetData.moons ?? []) {
          const el = moonElements[name];
          const planetKm = PLANET_EQUATORIAL_RADIUS_KM[planetData.name];
          if (!el || !planetKm) continue;
          const apoapsisRadii = el.semimajorAxisKm * (1 + el.eccentricity) / planetKm;
          if (apoapsisRadii <= FRAME_LIMIT_RADII) fitRadius = Math.max(fitRadius, apoapsisRadii * planetSize);
        }

        // fov 60 => tan(30deg) ~ 0.577, so ~1.7x the radius fits vertically; 1.6 is enough
        // since the (wider) horizontal extent carries the orbit.
        const zoomDist = Math.max(fitRadius * 1.6, planetSize * 6);

        // Fixed camera direction looking into the top-half 1/8th slice chunk
        // A lower, more direct angle helps show off the cross-section layers without being too top-down
        // Rotated an additional 20 degrees to the left for better visibility
        const camDir = new THREE.Vector3(-1.0, 0.35, -1.0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -40 * Math.PI / 180)
          .normalize();
        
        camera.position.copy(pPos.clone().add(camDir.multiplyScalar(zoomDist)));
        scaleTransition.planetFrameDistance = zoomDist;
        // Update target NOW so the motion-tracking block below adds zero delta this frame
        orbitControlsRef.current.target.copy(pPos);
        orbitControlsRef.current.update();
        isJumpPending.current = false;
      }

      // Update target and follow planet motion each frame
      const currentTarget = orbitControlsRef.current.target.clone()
      const motionDelta = pPos.clone().sub(currentTarget)
      
      orbitControlsRef.current.target.copy(pPos)
      // Keep camera exactly same relative distance if dragging occurred, or if simulation advanced
      camera.position.add(motionDelta)
      orbitControlsRef.current.update()
    }
  })

  return null
}
