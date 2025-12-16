import { useMemo } from 'react'

const ASTEROID_COUNT = 300
const REALISTIC_RADIUS = 35 // Between Mars and Jupiter (realistic scale)
const SIMPLIFIED_RADIUS = 5.1 * 8 // Position 4.5 in even spacing (36 units)
const ASTEROID_SPREAD = 2 // Spread around the base radius

type AsteroidBeltProps = {
  useSimplifiedDistance?: boolean
}

export function AsteroidBelt({ useSimplifiedDistance = false }: AsteroidBeltProps) {
  const asteroids = useMemo(() => {
    const baseRadius = useSimplifiedDistance ? SIMPLIFIED_RADIUS : REALISTIC_RADIUS
    const meshData = []
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const angle = Math.random() * 2 * Math.PI
      const radius = baseRadius + (Math.random() - 0.5) * ASTEROID_SPREAD * 2 // Spread evenly around center
      const x = radius * Math.cos(angle)
      const z = radius * Math.sin(angle)
      meshData.push({ position: [x, 0, z] as [number, number, number] })
    }
    return meshData
  }, [useSimplifiedDistance])

  return (
    <>
      {asteroids.map((asteroid, i) => (
        <mesh key={i} position={asteroid.position}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshStandardMaterial color="gray" />
        </mesh>
      ))}
    </>
  )
}
