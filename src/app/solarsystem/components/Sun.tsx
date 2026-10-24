import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { getBodyAxis, simulationState } from '../utils'

type SunProps = {
  size: number
  textureUrl?: string
  rotationalSpeed?: number
  onClick?: () => void
}

// Soft radial glow (corona + scattered light) drawn as a camera-facing sprite. Purely visual:
// the real corona is ~a million times fainter than the photosphere and only seen in eclipses.
function makeGlowTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255, 244, 214, 1)')
  g.addColorStop(0.18, 'rgba(255, 214, 140, 0.85)')
  g.addColorStop(0.35, 'rgba(255, 170, 70, 0.35)')
  g.addColorStop(0.6, 'rgba(255, 130, 40, 0.08)')
  g.addColorStop(1, 'rgba(255, 110, 30, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
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
      textureUrl ?? '/solarsystemImages/SunTexture.jpg'
    );

  const glow = useMemo(makeGlowTexture, [])
  useEffect(() => () => glow.dispose(), [glow])

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
    <>
    <sprite scale={[size * 7, size * 7, 1]} renderOrder={-2}>
      <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
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
    </>
  )
}
