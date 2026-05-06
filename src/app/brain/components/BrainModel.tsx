import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useState, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { ViewMode } from '../page';

// ── Define Procedural Parts ─────────────────────────────────────────────

interface PartProps {
  name: string;
  desc: string;
  color: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  geometry: React.ReactNode;
  clippingPlanes: THREE.Plane[];
  onHover: (hovered: boolean, info: any) => void;
  visible?: boolean;
}

function BrainPart({ name, desc, color, position, rotation = [0, 0, 0], scale = [1, 1, 1], geometry, clippingPlanes, onHover, visible = true }: PartProps) {
  const [hovered, setHover] = useState(false);

  return (
    <mesh
      position={new THREE.Vector3(...position)}
      rotation={new THREE.Euler(...rotation)}
      scale={new THREE.Vector3(...scale)}
      visible={visible}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); onHover(true, { name, desc }); }}
      onPointerOut={(e) => { e.stopPropagation(); setHover(false); onHover(false, { name, desc }); }}
    >
      {geometry}
      <meshStandardMaterial 
        color={hovered ? '#ffffff' : color} 
        emissive={hovered ? color : '#000000'}
        emissiveIntensity={hovered ? 0.3 : 0}
        side={THREE.DoubleSide}
        clippingPlanes={clippingPlanes}
        clipIntersection={false}
      />
      {hovered && (
        <Text
          position={[0, 1.2, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        //   depthTest={false} // render over other things
        >
          {name}
        </Text>
      )}
    </mesh>
  );
}

// ── The Main Brain Model Component ──────────────────────────────────────

export default function BrainModel({ viewMode = 'full' }: { viewMode?: ViewMode }) {
  const handleHover = (hovered: boolean, info: any) => {
    const infoPanel = document.getElementById('brain-region-info');
    if (infoPanel) {
      if (hovered) {
        infoPanel.innerHTML = `<h3>${info.name}</h3><p style="color: #aaa; margin-top: 0.5rem">${info.desc}</p>`;
      } else {
        infoPanel.innerHTML = `<h3>Region Info</h3><p style="color: #aaa; margin-top: 0.5rem">Select or hover a region to view details.</p>`;
      }
    }
  };

  // Determine clipping planes based on viewMode
  const clippingPlanes = useMemo(() => {
    const planes: THREE.Plane[] = [];
    if (viewMode === 'sagittal') {
      // Sagittal crosses at X=0 so we'll clip everything with X > 0 (or X < 0)
      // Let's clip right hemisphere: normal points in -X direction
      planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.01));
    } else if (viewMode === 'coronal') {
      // Coronal crosses at Z=0. Let's clip the front half (Z > 0)
      // Normal points in -Z direction
      planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), 0));
    }
    return planes;
  }, [viewMode]);

  return (
    <Canvas camera={{ position: [4, 2, 5], fov: 45 }} gl={{ localClippingEnabled: true }}>
      <color attach="background" args={['#111111']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-10, 5, -5]} intensity={0.5} />
      
      <group position={[0, 0.5, 0]}>
        
        {/* === CEREBRUM (Left and Right Hemispheres) === */}
        {/* Right Hemishpere */}
        <BrainPart 
          name="Frontal Lobe (Right)" 
          desc="Cognitive functions, decision making, and voluntary movement."
          color="#d95f5f" 
          position={[0.6, 0.8, 1.2]} 
          scale={[1, 1, 1.2]}
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<sphereGeometry args={[1, 32, 32]} />}
        />
        <BrainPart 
          name="Parietal Lobe (Right)" 
          desc="Processes sensory information for touch, temperature, and pain."
          color="#5fd95f" 
          position={[0.7, 1.4, -0.2]} 
          scale={[1, 1.1, 1]}
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<sphereGeometry args={[0.9, 32, 32]} />}
        />
        <BrainPart 
          name="Occipital Lobe (Right)" 
          desc="Visual processing center."
          color="#5f5fd9" 
          position={[0.5, 0.5, -1.5]} 
          scale={[0.8, 0.9, 1.1]}
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<sphereGeometry args={[0.8, 32, 32]} />}
        />
        <BrainPart 
          name="Temporal Lobe (Right)" 
          desc="Processes memories, integrating them with sensations."
          color="#d9d95f" 
          position={[1.2, 0.1, 0.2]} 
          scale={[1.1, 0.7, 1.2]}
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<sphereGeometry args={[0.8, 32, 32]} />}
        />

        {/* Left Hemishpere */}
        <BrainPart 
          name="Frontal Lobe (Left)" 
          desc="Cognitive functions, decision making, and voluntary movement."
          color="#e07a7a" 
          position={[-0.6, 0.8, 1.2]} 
          scale={[1, 1, 1.2]}
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<sphereGeometry args={[1, 32, 32]} />}
        />
        <BrainPart 
          name="Parietal Lobe (Left)" 
          desc="Processes sensory information for touch, temperature, and pain."
          color="#7ae07a" 
          position={[-0.7, 1.4, -0.2]} 
          scale={[1, 1.1, 1]}
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<sphereGeometry args={[0.9, 32, 32]} />}
        />
        <BrainPart 
          name="Occipital Lobe (Left)" 
          desc="Visual processing center."
          color="#7a7ae0" 
          position={[-0.5, 0.5, -1.5]} 
          scale={[0.8, 0.9, 1.1]}
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<sphereGeometry args={[0.8, 32, 32]} />}
        />
        <BrainPart 
          name="Temporal Lobe (Left)" 
          desc="Processes memories, integrating them with sensations."
          color="#e0e07a" 
          position={[-1.2, 0.1, 0.2]} 
          scale={[1.1, 0.7, 1.2]}
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<sphereGeometry args={[0.8, 32, 32]} />}
        />

        {/* === CEREBELLUM === */}
        <BrainPart 
          name="Cerebellum" 
          desc="Coordinates voluntary movements, posture, balance."
          color="#d95fd9" 
          position={[0, -0.8, -1.6]} 
          scale={[1.4, 0.6, 0.8]}
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<sphereGeometry args={[0.8, 32, 32]} />}
        />

        {/* === INTERIOR STRUCTURES === */}
        {/* Brainstem */}
        <BrainPart 
          name="Brainstem" 
          desc="Controls basic body functions such as breathing, swallowing, heart rate."
          color="#b0b0b0" 
          position={[0, -1.2, -0.7]} 
          rotation={[0.2, 0, 0]}
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<cylinderGeometry args={[0.3, 0.25, 1.5, 32]} />}
        />

        {/* Thalamus */}
        <BrainPart 
          name="Thalamus" 
          desc="Relays motor and sensory signals to the cerebral cortex."
          color="#ffa600" 
          position={[0, 0.2, -0.3]} 
          scale={[0.8, 0.6, 0.8]}
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<sphereGeometry args={[0.4, 32, 32]} />}
        />

        {/* Pineal Gland */}
        <BrainPart 
          name="Pineal Gland" 
          desc="A small endocrine gland that produces melatonin, regulating sleep patterns."
          color="#00ffcc" 
          position={[0, 0.15, -0.7]} 
          scale={[0.8, 1, 0.8]}
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<sphereGeometry args={[0.12, 16, 16]} />}
        />

        {/* Hippocampus (Left & Right curves) */}
        <BrainPart 
          name="Hippocampus (Right)" 
          desc="Essential for learning and memory formation."
          color="#00a6ff" 
          position={[0.4, -0.1, -0.1]} 
          rotation={[1.57, 0.2, -0.2]}
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<capsuleGeometry args={[0.15, 0.8, 16, 16]} />}
        />
        <BrainPart 
          name="Hippocampus (Left)" 
          desc="Essential for learning and memory formation."
          color="#00a6ff" 
          position={[-0.4, -0.1, -0.1]} 
          rotation={[1.57, -0.2, 0.2]}
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<capsuleGeometry args={[0.15, 0.8, 16, 16]} />}
        />

        {/* Amygdala (Left & Right) */}
        <BrainPart 
          name="Amygdala (Right)" 
          desc="Involved in emotion processing and responses."
          color="#ff0044" 
          position={[0.5, -0.2, 0.4]} 
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<sphereGeometry args={[0.18, 32, 32]} />}
        />
        <BrainPart 
          name="Amygdala (Left)" 
          desc="Involved in emotion processing and responses."
          color="#ff0044" 
          position={[-0.5, -0.2, 0.4]} 
          clippingPlanes={clippingPlanes} onHover={handleHover}
          geometry={<sphereGeometry args={[0.18, 32, 32]} />}
        />

      </group>

      <OrbitControls 
        enablePan={true}
        minDistance={2}
        maxDistance={20}
        autoRotate={false}
      />
    </Canvas>
  );
}