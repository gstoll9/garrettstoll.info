import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef, useState } from 'react'
import Label from './Label'

type PlanetProps = {
  name: string
  size: number
  distance: number
  color?: string
  textureUrl?: string
  orbitSpeed?: number
  rotationalSpeed?: number
  eccentricity?: number
  orbitMode?: string
  onClick?: (name: string) => void
}

export default function Planet({
  name,
  size,
  distance,
  color = 'white',
  textureUrl,
  orbitSpeed = 0,
  rotationalSpeed = 0,
  eccentricity = 0.1,
  orbitMode = "Simple",
  onClick,
}: PlanetProps) {
  const ref = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const texture = textureUrl ? useLoader(THREE.TextureLoader, textureUrl) : null

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Orbit calculation
      const elapsedTime = performance.now() / 1000; // Time in seconds
      const angle = elapsedTime * orbitSpeed; // Angle based on orbital speed
      
      let x: number, z: number;

      if (orbitMode === "Elliptical") {
        // Elliptical orbit calculation
        const a = distance; // Semi-major axis
        const e = eccentricity; // Eccentricity
        const b = a * Math.sqrt(1 - e * e); // Semi-minor axis
        
        // Calculate elliptical position
        const r = (a * (1 - e * e)) / (1 + e * Math.cos(angle));
        x = r * Math.cos(angle);
        z = r * Math.sin(angle) * (b / a); // Scale z by b/a ratio
      } else {

        // Circular orbit
        x = distance * Math.cos(angle);
        z = distance * Math.sin(angle);
      }

      groupRef.current.position.set(x, 0, z); // Update position
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
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial 
          map={texture}
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
          <ringGeometry args={[size + 2, size + 4, 64]} />
          <meshBasicMaterial
            color="goldenrod"
            side={THREE.DoubleSide}
            transparent
            opacity={0.5}
          />
        </mesh>
      )}

      {/* Label */}
      <Label text={name} position={[0, size+1, 0]} />
    </group>
  )
}
function useThree(): { camera: any } {
    throw new Error('Function not implemented.')
}

