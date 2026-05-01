import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { orbitalPosition, OrbitProps, simulationState } from '../utils'

import { getPlanetSize } from '../data/planets'

type CameraControllerProps = {
  focus: string;
  planetData: {
    name: string;
    orbitData: OrbitProps;
    orbitMode: string;
    moons?: any[];
    size?: number;
    realDiameter?: number;
  } | null;
  orbitControlsRef: React.RefObject<any>;
  useSimplifiedDistance: boolean;
  useRealisticSizes?: boolean;
}

export default function CameraController({ focus, planetData, orbitControlsRef, useSimplifiedDistance, useRealisticSizes = false }: CameraControllerProps) {
  const { camera } = useThree()
  const isFollowing = useRef(false)
  const prevFocus = useRef(focus)
  const isJumpPending = useRef(false)

  useEffect(() => {
    if (focus === 'solarsystem' || focus === 'Sun') {
      isFollowing.current = false
      isJumpPending.current = false
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.set(0, 0, 0)
        
        // Return to wide view if we were following
        if (prevFocus.current !== 'solarsystem' && prevFocus.current !== 'Sun') {
            camera.position.set(0, 10, 40)
        }
        orbitControlsRef.current.update()
      }
    } else if (focus && planetData) {
      isFollowing.current = true
      if (prevFocus.current !== focus) {
          isJumpPending.current = true
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
          planetSize = useRealisticSizes ? getPlanetSize({ size: planetData.size, realDiameter: planetData.realDiameter } as any, true) : planetData.size;
        }
        
        let maxRadius = planetSize;
        if (planetData.moons && planetData.moons.length > 0) {
          const maxMoonDist = Math.max(...planetData.moons.map(m => m.distance));
          maxRadius = planetSize + maxMoonDist;
        }

        // We want the zoom distance to comfortably fit maxRadius
        // Typical fov is 60. So tan(30deg) ~ 0.577. Dist = maxRadius / 0.577 ~ maxRadius * 1.7
        // Add some padding to envelop everything.
        const zoomDist = Math.max(maxRadius * 2.5, planetSize * 4);

        // Fixed camera direction looking into the top-half 1/8th slice chunk
        // A lower, more direct angle helps show off the cross-section layers without being too top-down
        // Rotated an additional 20 degrees to the left for better visibility
        const camDir = new THREE.Vector3(-1.0, 0.35, -1.0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -40 * Math.PI / 180)
          .normalize();
        
        camera.position.copy(pPos.clone().add(camDir.multiplyScalar(zoomDist)));
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
