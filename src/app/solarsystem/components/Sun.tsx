import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef } from 'react'

type SunProps = {
  size: number
  textureUrl?: string
  rotationalSpeed?: number
  onClick?: () => void
}

export default function Sun({
  size,
  textureUrl,
  rotationalSpeed = 0.01,
  onClick,
}: SunProps) {
  const ref = useRef<THREE.Mesh>(null!)
  const texture = useLoader(
      THREE.TextureLoader,
      textureUrl ?? '/solarstsremImages/SunTexture.jpg'
    );

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += rotationalSpeed * delta
    }
  })

  return (
    <mesh
      ref={ref}
      position={[0, 0, 0]}
      onClick={onClick}
    >
      <sphereGeometry args={[size, 64, 64]} />
      <meshBasicMaterial 
        map={texture}
        color={texture ? "#FFFFFF" : "#FDB813"} // White if texture exists, yellow if no texture
        toneMapped={false} // Prevent tone mapping from dimming
      />
    </mesh>
  )
}