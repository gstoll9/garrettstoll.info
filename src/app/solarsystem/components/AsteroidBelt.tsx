import { useMemo } from 'react'

const ASTEROID_COUNT = 300

export function AsteroidBelt() {
  const asteroids = useMemo(() => {
    const meshData = []
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const angle = Math.random() * 2 * Math.PI
      const radius = 35 + Math.random() * 4
      const x = radius * Math.cos(angle)
      const z = radius * Math.sin(angle)
      meshData.push({ position: [x, 0, z] as [number, number, number] })
    }
    return meshData
  }, [])

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
