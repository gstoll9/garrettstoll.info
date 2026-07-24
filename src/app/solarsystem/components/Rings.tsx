import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RINGS_BY_PLANET, MIN_RING_THICKNESS, RingData } from '../data/rings'
import { BodyAxis } from '../utils'

export type RingSpec = RingData;

type RingsProps = {
  planetName: string
  planetSize: number
  axisRef: React.RefObject<BodyAxis | null>
}

export default function Rings({ planetName, planetSize, axisRef }: RingsProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const rings = RINGS_BY_PLANET[planetName]

  useFrame(() => {
    if (groupRef.current && axisRef.current) {
      // Rings lie in the planet's equatorial plane: orient this group's local +Y
      // (the axis each flat ring mesh below is drawn around) to the real north-pole
      // direction, same as the planet's own axial tilt.
      const north = axisRef.current.northThree
      groupRef.current.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(...north).normalize()
      )
    }
  })

  if (!rings) return null

  return (
    <group ref={groupRef}>
      {rings.map(ring => {
        const outer = Math.max(ring.outerRadius, ring.innerRadius + MIN_RING_THICKNESS);
        return (
          <mesh key={ring.name} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[planetSize * ring.innerRadius, planetSize * outer, 64]} />
            <meshBasicMaterial color={ring.color} side={THREE.DoubleSide} transparent opacity={ring.opacity} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  )
}
