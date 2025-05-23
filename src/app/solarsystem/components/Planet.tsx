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
  onClick,
}: PlanetProps) {
  const ref = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const texture = textureUrl ? useLoader(THREE.TextureLoader, textureUrl) : null

  useFrame((_, delta) => {
  if (groupRef.current) {
    groupRef.current.rotation.y += orbitSpeed * delta
  }
  if (ref.current) {
    ref.current.rotation.y += rotationalSpeed * delta // self-rotation speed
  }
})

  return (
    <group ref={groupRef}>
      <mesh
        ref={ref}
        position={[distance, 0, 0]}
        onClick={() => onClick?.(name)}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial map={texture} color={color} />
      </mesh>
      {name === 'Saturn' && (
        <mesh position={[distance, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[size + 2, size + 4, 64]} />
            <meshBasicMaterial color="goldenrod" side={THREE.DoubleSide} transparent opacity={0.5} />
        </mesh>
    )}
      <Label text={name} position={[distance, size + 1.2, 0]} />
    </group>
  )
}
function useThree(): { camera: any } {
    throw new Error('Function not implemented.')
}

