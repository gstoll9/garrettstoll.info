import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { orbitalPosition, OrbitProps } from '../utils'

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
  const targetPosition = useRef(new THREE.Vector3(0, 10, 40))
  const currentPosition = useRef(new THREE.Vector3(0, 10, 40))
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0))
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const isFollowing = useRef(false)

  useEffect(() => {
    if (focus === 'solarsystem' || focus === 'Sun') {
      isFollowing.current = false
      // Enable OrbitControls and reset target
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = true
        orbitControlsRef.current.target.set(0, 0, 0)
        orbitControlsRef.current.enableRotate = true
        orbitControlsRef.current.enableZoom = true
        orbitControlsRef.current.enablePan = true
        orbitControlsRef.current.update()
      }
    } else if (focus && planetData) {
      isFollowing.current = true
      // Keep OrbitControls enabled for manual control
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = true
        orbitControlsRef.current.enableRotate = true
        orbitControlsRef.current.enableZoom = true
        orbitControlsRef.current.enablePan = true
      }
    }
  }, [focus, planetData, orbitControlsRef])

  useFrame(() => {
    if (isFollowing.current && planetData) {
      // Get the planet's current position
      const elapsedTime = performance.now() / 1000
      const [x, y, z] = orbitalPosition(
        planetData.orbitMode,
        elapsedTime,
        planetData.orbitData,
        useSimplifiedDistance
      )

      // Update OrbitControls target to follow the planet
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.set(x, y, z)
        orbitControlsRef.current.update()
      }
    }
  })

  return null
}
