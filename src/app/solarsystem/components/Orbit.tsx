import { useMemo } from 'react'
import * as THREE from 'three'
import { OrbitProps, orbitalPosition } from '../utils'

type OrbitComponentProps = {
  orbitMode: string;
  orbitData: OrbitProps;
  segments?: number;
};

export default function Orbit({ orbitMode, orbitData, segments = 128 }: OrbitComponentProps) {
  const points = useMemo(() => {
    const orbitPoints: THREE.Vector3[] = []
    
    if (orbitMode === "Elliptical") {
      
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * orbitData.orbitalPeriod; // Time step
        const [x, y, z] = orbitalPosition(orbitMode, t, orbitData);
        orbitPoints.push(new THREE.Vector3(x, y, z))
      }
    } else {
      // Circular orbit
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * orbitData.orbitalPeriod; // Time step
        const [x, _, z] = orbitalPosition(orbitMode, t, orbitData);
        // const angle = (i / segments) * Math.PI * 2
        // const x = radius * Math.cos(angle)
        // const z = radius * Math.sin(angle)
        orbitPoints.push(new THREE.Vector3(x, 0, z))
      }
    }
    
    return orbitPoints
  }, [orbitMode, orbitData])

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
