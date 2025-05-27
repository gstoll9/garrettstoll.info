import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef, useState } from 'react'
import Label from './Label'
import { orbitalPosition } from '../utils'

type PlanetProps = {
  name: string
  size: number
  distance: number
  color?: string
  texture?: string
  orbitSpeed?: number
  rotationalSpeed?: number
  orbitData: {
    semimajorAxis: number
    eccentricity: number
    inclination: number
    longitudeOfAscendingNode: number
    argumentOfPerihelion: number
    meanAnomaly: number
    orbitalPeriod: number
  }
  orbitMode?: string
  onClick?: (name: string) => void
}

export default function Planet({
  name,
  size,
  distance,
  color = 'white',
  texture,
  orbitSpeed = 0,
  rotationalSpeed = 0,
  orbitData,
  orbitMode = "Simple",
  onClick,
}: PlanetProps) {
  const ref = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const textureUrl = texture ? useLoader(THREE.TextureLoader, texture) : null

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Orbit calculation
      const elapsedTime = performance.now() / 1000; // Time in seconds
      const angle = elapsedTime * orbitSpeed; // Angle based on orbital speed
      
      let x: number, z: number;
      let position: [number, number, number];
      if (orbitMode === "Elliptical") {

        position = orbitalPosition(elapsedTime, orbitData)
        // // Elliptical orbit calculation
        // const a = distance; // Semi-major axis
        // const e = eccentricity; // Eccentricity
        // const b = a * Math.sqrt(1 - e * e); // Semi-minor axis
        
        // // Calculate elliptical position
        // const r = (a * (1 - e * e)) / (1 + e * Math.cos(angle));
        // x = r * Math.cos(angle);
        // z = r * Math.sin(angle) * (b / a); // Scale z by b/a ratio
      } else {

        // Circular orbit
        x = distance * Math.cos(angle);
        z = distance * Math.sin(angle);
        position = [x,0,z];
      }

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
        <sphereGeometry args={[size, 32, 32]} />
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

