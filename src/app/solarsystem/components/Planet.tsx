import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef } from 'react'
import Label from './Label'
import { orbitalPosition } from '../utils'
import { getPlanetSize } from '../data/planets'

export type PlanetProps = {
  name: string
  size: number
  realDiameter: number
  color?: string
  texture?: string
  rotationalSpeed?: number
  orbitData: {
    semimajorAxis: number
    semimajorAxisSimplified: number
    eccentricity: number
    inclination: number
    longitudeOfAscendingNode: number
    argumentOfPerihelion: number
    meanAnomaly: number
    orbitalPeriod: number
  }
  orbitMode?: string
  onClick?: (name: string) => void
  useSimplifiedDistance?: boolean
  useRealisticSizes?: boolean
}

export default function Planet({
  name,
  size,
  realDiameter,
  color = 'white',
  texture,
  rotationalSpeed = 0,
  orbitData,
  orbitMode = "Simple",
  onClick,
  useSimplifiedDistance = false,
  useRealisticSizes = false,
}: PlanetProps) {
  const ref = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)

  const textureUrl = useLoader(
    THREE.TextureLoader,
    texture ?? '/solarstsremImages/UranusTexture.jpg'
  );

  const planetSize = useRealisticSizes ? getPlanetSize({ size, realDiameter } as any, true) : size;

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Orbit calculation
      const elapsedTime = performance.now() / 1000; // Time in seconds      
      let position: [number, number, number];
      position = orbitalPosition(orbitMode, elapsedTime, orbitData, useSimplifiedDistance)
      groupRef.current.position.set(...position); // Update position
    }
    if (ref.current) {
      ref.current.rotation.y += rotationalSpeed * delta // self-rotation speed
    }
  })

  return (
    <group ref={groupRef}>

      {/* Planet Mesh */}
      <mesh
        ref={ref}
        onClick={() => onClick?.(name)}
      >
        <sphereGeometry args={[planetSize, 32, 32]} />
        <meshStandardMaterial 
          map={textureUrl}
          color={color}
          transparent={false}
          depthWrite={true}
          depthTest={true}
        />
      </mesh>

      {/* Saturn's Rings */}
      {name === 'Saturn' && (
        <mesh 
          rotation={[Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[planetSize + 2, planetSize + 4, 64]} />
          <meshBasicMaterial
            color="goldenrod"
            side={THREE.DoubleSide}
            transparent
            opacity={0.5}
          />
        </mesh>
      )}

      {/* Label */}
      <Label text={name} position={[0, planetSize+1, 0]} />
    </group>
  )
}

