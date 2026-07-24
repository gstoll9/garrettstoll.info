import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef } from 'react'
import { getBodyAxis, simulationState } from '../utils'

type SunProps = {
  size: number
  textureUrl?: string
  rotationalSpeed?: number
  onClick?: () => void
  timeScale?: number
}

export default function Sun({
  size,
  textureUrl,
  rotationalSpeed = 0.01,
  onClick,
  timeScale = 1,
}: SunProps) {
  const ref = useRef<THREE.Mesh>(null!)
  const texture = useLoader(
      THREE.TextureLoader,
      textureUrl ?? '/solarsystemImages/SunTexture.jpg'
    );

  useFrame((_, delta) => {
    if (ref.current) {
      const axis = getBodyAxis('Sun', simulationState.dateMs);
      if (axis) {
        const tiltQuat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(...axis.northThree).normalize()
        );
        const spinQuat = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          THREE.MathUtils.degToRad(axis.spinDegrees)
        );
        ref.current.quaternion.copy(tiltQuat).multiply(spinQuat);
      } else {
        ref.current.rotation.y += rotationalSpeed * delta;
      }
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