import * as THREE from 'three'

type OrbitProps = {
  radius: number
}

export default function Orbit({ radius }: OrbitProps) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.02, radius + 0.02, 64]} />
      <meshBasicMaterial color="white" side={THREE.DoubleSide} transparent opacity={0.2} />
    </mesh>
  )
}
