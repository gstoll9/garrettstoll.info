import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { orbitalPosition, OrbitProps, simulationState } from '../utils'

type CameraControllerProps = {
  focus: string;
  planetData: {
    name: string;
    orbitData: OrbitProps;
    orbitMode: string;
  } | null;
  orbitControlsRef: React.RefObject<any>;
  useSimplifiedDistance: boolean;
}

export default function CameraController({ focus, planetData, orbitControlsRef, useSimplifiedDistance }: CameraControllerProps) {
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
        // Compute offset from origin or use current camera dir
        const camDir = camera.position.clone().sub(orbitControlsRef.current.target).normalize()
        if (camDir.lengthSq() === 0) camDir.set(0, 0, 1)
        
        const zoomDist = 8
        camera.position.copy(pPos.clone().add(camDir.multiplyScalar(zoomDist)))
        isJumpPending.current = false
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
