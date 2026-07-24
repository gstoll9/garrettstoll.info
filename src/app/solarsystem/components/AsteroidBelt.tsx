import { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'

const ASTEROID_COUNT = 300
const REALISTIC_RADIUS = 35 // Between Mars and Jupiter (realistic scale)
const SIMPLIFIED_RADIUS = 5.1 * 8 // Position 4.5 in even spacing (36 units)
const ASTEROID_SPREAD = 2 // Spread around the base radius

type AsteroidBeltProps = {
  useSimplifiedDistance?: boolean
}

export function AsteroidBelt({ useSimplifiedDistance = false }: AsteroidBeltProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)

  const positions = useMemo(() => {
    const baseRadius = useSimplifiedDistance ? SIMPLIFIED_RADIUS : REALISTIC_RADIUS
    const coords: [number, number, number][] = []
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const angle = Math.random() * 2 * Math.PI
      const radius = baseRadius + (Math.random() - 0.5) * ASTEROID_SPREAD * 2
      coords.push([radius * Math.cos(angle), 0, radius * Math.sin(angle)])
    }
    return coords
  }, [useSimplifiedDistance])

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    positions.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [positions])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, ASTEROID_COUNT]}>
      <sphereGeometry args={[0.1, 6, 6]} />
      <meshStandardMaterial color="gray" />
    </instancedMesh>
  )
}
