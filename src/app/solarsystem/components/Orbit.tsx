import { useMemo } from 'react'
import * as THREE from 'three'

type OrbitProps = {
  radius: number
  orbitMode?: string
  eccentricity?: number
}

export default function Orbit({ radius, orbitMode = "Simple", eccentricity = 0.1 }: OrbitProps) {
  const points = useMemo(() => {
    const orbitPoints: THREE.Vector3[] = []
    const segments = 128
    
    if (orbitMode === "Elliptical") {
      // Elliptical orbit
      const a = radius; // Semi-major axis
      const e = eccentricity; // Eccentricity
      const b = a * Math.sqrt(1 - e * e); // Semi-minor axis
      
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        const r = (a * (1 - e * e)) / (1 + e * Math.cos(angle))
        const x = r * Math.cos(angle)
        const z = r * Math.sin(angle) * (b / a)
        orbitPoints.push(new THREE.Vector3(x, 0, z))
      }
    } else {
      // Circular orbit
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        const x = radius * Math.cos(angle)
        const z = radius * Math.sin(angle)
        orbitPoints.push(new THREE.Vector3(x, 0, z))
      }
    }
    
    return orbitPoints
  }, [radius, orbitMode, eccentricity])

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    return geometry
  }, [points])

  return (
    <primitive object={new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }))} />
  )
}

// import * as THREE from 'three'

// type OrbitProps = {
//   radius: number
// }

// export default function Orbit({ radius }: OrbitProps) {
//   return (
//     <mesh rotation={[-Math.PI / 2, 0, 0]}>
//       <ringGeometry args={[radius - 0.02, radius + 0.02, 64]} />
//       <meshBasicMaterial color="white" side={THREE.DoubleSide} transparent opacity={0.2} />
//     </mesh>
//   )
// }
