import { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { asteroids } from '../data/asteroids'
import { orbitalPosition } from '../utils'

const ASTEROID_COUNT = 2000

// Hektor is a Jupiter Trojan, not a main-belt object (see data/asteroids.ts) — its orbit
// would skew the belt's shape way out toward Jupiter, so it's excluded from the templates
// used to approximate the belt's 3D extent.
const BELT_ORBIT_TEMPLATES = asteroids.filter((a) => a.name !== 'Hektor').map((a) => a.orbitData)

type AsteroidBeltProps = {
  useSimplifiedDistance?: boolean
}

export function AsteroidBelt({ useSimplifiedDistance = false }: AsteroidBeltProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)

  const positions = useMemo(() => {
    const coords: [number, number, number][] = []
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      // Each particle borrows one real asteroid's orbital shape (semimajor axis,
      // eccentricity, inclination, node/perihelion angles) and lands at a random point
      // along that ellipse — so across all templates the cloud approximates the belt's
      // real 3D shape (its inclination and eccentricity spread) instead of a flat ring.
      const orbitData = BELT_ORBIT_TEMPLATES[i % BELT_ORBIT_TEMPLATES.length]
      const t = Math.random() * orbitData.orbitalPeriod
      coords.push(orbitalPosition('Elliptical', t, orbitData, useSimplifiedDistance))
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
