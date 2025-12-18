"use client"
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useState, useMemo } from 'react';
import * as THREE from 'three';
import { 
  generateProbabilityGrid, 
  findProbabilityThreshold, 
  marchingCubes 
} from '../utils/hydrogenCloud';

interface ElectronCloudProps {
  n?: number;
  l?: number;
  m?: number;
  gridResolution?: number;
  probabilityThreshold?: number;
}

export default function ElectronCloud({ 
  n: initialN = 2, 
  l: initialL = 1, 
  m: initialM = 0,
  gridResolution = 48,
  probabilityThreshold = 0.90
}: ElectronCloudProps) {
  const [n, setN] = useState(initialN);
  const [l, setL] = useState(initialL);
  const [m, setM] = useState(initialM);
  const [threshold, setThreshold] = useState(probabilityThreshold);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate the isosurface mesh
  const surfaceGeometry = useMemo(() => {
    setIsGenerating(true);
    
    // Generate probability density grid
    const { values, gridSize, extent } = generateProbabilityGrid(n, l, m, gridResolution);
    
    // Find the isovalue that encloses the target probability
    const isovalue = findProbabilityThreshold(values, threshold);
    
    // Extract isosurface using marching cubes
    const { positions, indices } = marchingCubes(values, gridSize, extent, isovalue);
    
    // Create Three.js geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals(); // For proper lighting
    
    setIsGenerating(false);
    return geometry;
  }, [n, l, m, gridResolution, threshold]);

  const orbitalNames = ['s', 'p', 'd', 'f', 'g'];
  const orbitalName = l < orbitalNames.length ? orbitalNames[l] : `l${l}`;
  const stateLabel = `${n}${orbitalName}${m !== 0 ? ` (m=${m})` : ''}`;

  const handleNChange = (newN: number) => {
    setN(newN);
    if (l >= newN) setL(newN - 1);
    if (Math.abs(m) > l) setM(0);
  };

  const handleLChange = (newL: number) => {
    setL(newL);
    if (Math.abs(m) > newL) setM(0);
  };

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      {/* Controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 10,
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace',
        maxWidth: '250px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
          Quantum State: {stateLabel}
        </h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Principal (n): {n}
          </label>
          <input
            type="range"
            min="1"
            max="4"
            value={n}
            onChange={(e) => handleNChange(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Angular (l): {l}
          </label>
          <input
            type="range"
            min="0"
            max={n - 1}
            value={l}
            onChange={(e) => handleLChange(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Magnetic (m): {m}
          </label>
          <input
            type="range"
            min={-l}
            max={l}
            value={m}
            onChange={(e) => setM(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Probability: {(threshold * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.5"
            max="0.99"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ fontSize: '12px', opacity: 0.8 }}>
          {isGenerating ? 'Generating surface...' : `Grid: ${gridResolution}³`}
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas camera={{ position: [80, 0, 0], far: 500 }} style={{ backgroundColor: "black" }}>
        <Suspense fallback={null}>
          <OrbitControls maxDistance={200} />

          {/* Orbital Surface */}
          <mesh geometry={surfaceGeometry}>
            <meshStandardMaterial 
              color="cyan" 
              emissive="cyan"
              emissiveIntensity={0.2}
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>

          {/* Wireframe overlay for better visibility */}
          <lineSegments geometry={surfaceGeometry}>
            <lineBasicMaterial color="white" opacity={0.1} transparent />
          </lineSegments>

          {/* Nucleus */}
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.8} />
          </mesh>

          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <pointLight position={[20, 20, 20]} intensity={0.8} />
          <pointLight position={[-20, -20, -20]} intensity={0.4} />

        </Suspense>
      </Canvas>
    </div>
  );
}
