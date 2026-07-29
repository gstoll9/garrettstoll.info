import { useMemo } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { OrbitProps, orbitalPosition } from '../utils'

type OrbitComponentProps = {
  orbitMode: string;
  orbitData: OrbitProps;
  segments?: number;
  useSimplifiedDistance?: boolean;
  color?: string | number;
  lineWidth?: number;
};

export default function Orbit({ orbitMode, orbitData, segments = 128, useSimplifiedDistance = false, color = 0xffffff, lineWidth = 1 }: OrbitComponentProps) {
  const points = useMemo(() => {
    const orbitPoints: THREE.Vector3[] = []
    
    if (orbitMode === "Elliptical" || orbitMode === "RealLive") {
      
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * orbitData.orbitalPeriod; // Time step
        // Pass 'Elliptical' so we get the theoretical full path from orbitalPosition
        const [x, y, z] = orbitalPosition("Elliptical", t, orbitData, useSimplifiedDistance);
        orbitPoints.push(new THREE.Vector3(x, y, z))
      }
    } else {
      // Circular orbit
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * orbitData.orbitalPeriod; // Time step
        const [x, , z] = orbitalPosition(orbitMode, t, orbitData, useSimplifiedDistance);
        // const angle = (i / segments) * Math.PI * 2
        // const x = radius * Math.cos(angle)
        // const z = radius * Math.sin(angle)
        orbitPoints.push(new THREE.Vector3(x, 0, z))
      }
    }
    
    return orbitPoints
  }, [orbitMode, orbitData, useSimplifiedDistance, segments])

  return (
    <Line points={points} color={color} lineWidth={lineWidth} transparent opacity={0.4} />
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
