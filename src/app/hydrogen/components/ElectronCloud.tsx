"use client"
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import { generateCloudData } from '../utils/hydrogenCloud';


export default function ElectronCloud() {
  const points = generateCloudData(2, 1, 0); // n=2, l=0, m=0

  return (
    <Canvas camera={{ position: [50, 0, 0] }} style={{ backgroundColor: "black" }}>
      <Suspense fallback={null}>
        <OrbitControls />

        {/* Electron Cloud */}
        <points>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(points), 3]}
            />
          </bufferGeometry>
          <pointsMaterial size={0.01} color="cyan" />
        </points>

        {/* Nucleus */}
        <mesh>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
        </mesh>

        {/* 0Add lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />

      </Suspense>
    </Canvas>
  );
}
