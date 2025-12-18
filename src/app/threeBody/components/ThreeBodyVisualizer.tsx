"use client"
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { SystemState, rk4Step, calculateEnergy, presets } from '../utils/physics';

interface ThreeBodyVisualizerProps {
  initialState: SystemState;
  selectedPreset: string;
  onPresetChange: (preset: string) => void;
}

function Trail({ points, color }: { points: THREE.Vector3[]; color: string }) {
  if (points.length < 2) return null;
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  return (
    <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ 
      color, 
      transparent: true, 
      opacity: 0.6 
    }))} />
  );
}

function Bodies({ state, trails }: { 
  state: SystemState; 
  trails: Map<number, THREE.Vector3[]>;
}) {
  return (
    <>
      {state.bodies.map((body, index) => (
        <group key={index}>
          {/* Body sphere */}
          <mesh position={body.position}>
            <sphereGeometry args={[Math.cbrt(body.mass) * 0.2, 32, 32]} />
            <meshStandardMaterial 
              color={body.color} 
              emissive={body.color}
              emissiveIntensity={0.5}
            />
          </mesh>
          
          {/* Trail */}
          {trails.has(index) && trails.get(index)!.length > 1 && (
            <Trail points={trails.get(index)!} color={body.color} />
          )}
        </group>
      ))}
    </>
  );
}

function AnimationController({ 
  initialState, 
  isPaused, 
  speed,
  showTrails,
  trailLength,
  onStateUpdate,
  onDivergence
}: {
  initialState: SystemState;
  isPaused: boolean;
  speed: number;
  showTrails: boolean;
  trailLength: number;
  onStateUpdate: (state: SystemState, energy: number) => void;
  onDivergence: () => void;
}) {
  const stateRef = useRef<SystemState>(initialState);
  const trailsRef = useRef<Map<number, THREE.Vector3[]>>(new Map());
  const frameCountRef = useRef(0);
  const hasDivergedRef = useRef(false);
  
  // Reset trails when initialState changes
  useEffect(() => {
    stateRef.current = initialState;
    trailsRef.current.clear();
    hasDivergedRef.current = false;
    initialState.bodies.forEach((_, i) => {
      trailsRef.current.set(i, []);
    });
  }, [initialState]);
  
  // Check for divergence conditions
  const checkDivergence = (state: SystemState): boolean => {
    const MAX_DISTANCE = 100;
    const MIN_DISTANCE = 0.05;
    const MAX_VELOCITY = 50;
    
    // Check each body
    for (const body of state.bodies) {
      const pos = body.position;
      const vel = body.velocity;
      
      // Check if body escaped to infinity
      const distFromOrigin = Math.sqrt(pos[0]**2 + pos[1]**2 + pos[2]**2);
      if (distFromOrigin > MAX_DISTANCE) {
        return true;
      }
      
      // Check if velocity is too high (ejection)
      const speed = Math.sqrt(vel[0]**2 + vel[1]**2 + vel[2]**2);
      if (speed > MAX_VELOCITY) {
        return true;
      }
    }
    
    // Check for collisions (bodies too close)
    for (let i = 0; i < state.bodies.length; i++) {
      for (let j = i + 1; j < state.bodies.length; j++) {
        const dx = state.bodies[j].position[0] - state.bodies[i].position[0];
        const dy = state.bodies[j].position[1] - state.bodies[i].position[1];
        const dz = state.bodies[j].position[2] - state.bodies[i].position[2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (dist < MIN_DISTANCE) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  useFrame(() => {
    if (isPaused) return;
    
    // Update physics multiple times per frame for smoother simulation
    const stepsPerFrame = 5;
    const dt = 0.001 * speed;
    
    for (let i = 0; i < stepsPerFrame; i++) {
      stateRef.current = rk4Step(stateRef.current, dt);
    }
    
    // Check for divergence
    if (!hasDivergedRef.current && checkDivergence(stateRef.current)) {
      hasDivergedRef.current = true;
      onDivergence();
    }
    
    // Update trails every few frames
    frameCountRef.current++;
    if (showTrails && frameCountRef.current % 2 === 0) {
      stateRef.current.bodies.forEach((body, index) => {
        const trail = trailsRef.current.get(index) || [];
        trail.push(new THREE.Vector3(...body.position));
        
        // Limit trail length
        if (trail.length > trailLength) {
          trail.shift();
        }
        
        trailsRef.current.set(index, trail);
      });
    }
    
    // Update parent component periodically
    if (frameCountRef.current % 10 === 0) {
      const energy = calculateEnergy(stateRef.current);
      onStateUpdate(stateRef.current, energy);
    }
  });
  
  return <Bodies state={stateRef.current} trails={trailsRef.current} />;
}

export default function ThreeBodyVisualizer({ initialState, selectedPreset, onPresetChange }: ThreeBodyVisualizerProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showTrails, setShowTrails] = useState(true);
  const [trailLength, setTrailLength] = useState(500);
  const [currentState, setCurrentState] = useState(initialState);
  const [energy, setEnergy] = useState(calculateEnergy(initialState));
  const [divergenceDetected, setDivergenceDetected] = useState(false);
  
  const handleStateUpdate = (state: SystemState, newEnergy: number) => {
    setCurrentState(state);
    setEnergy(newEnergy);
  };
  
  const handleDivergence = () => {
    setIsPaused(true);
    setDivergenceDetected(true);
  };
  
  // Reset divergence flag when preset changes
  useEffect(() => {
    setDivergenceDetected(false);
  }, [initialState]);
  
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', backgroundColor: '#000' }}>
      {/* Controls Panel */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 10,
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '20px',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'monospace',
        maxWidth: '300px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '20px', color: '#44aaff' }}>
          Three-Body Problem
        </h2>
        
        {/* Preset Selection */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Preset Configuration:
          </label>
          <select 
            value={selectedPreset}
            onChange={(e) => onPresetChange(e.target.value)}
            style={{
              width: '100%',
              padding: '5px',
              background: '#222',
              color: 'white',
              border: '1px solid #444',
              borderRadius: '4px'
            }}
          >
            {Object.entries(presets).map(([key, preset]) => (
              <option key={key} value={key}>{preset.name}</option>
            ))}
          </select>
        </div>
        
        {/* Play/Pause */}
        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={() => setIsPaused(!isPaused)}
            style={{
              width: '100%',
              padding: '10px',
              background: isPaused ? '#44aa44' : '#aa4444',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {isPaused ? '▶ Play' : '⏸ Pause'}
          </button>
        </div>
        
        {/* Divergence Warning */}
        {divergenceDetected && (
          <div style={{
            marginBottom: '15px',
            padding: '10px',
            background: 'rgba(255, 165, 0, 0.3)',
            border: '2px solid #ffaa00',
            borderRadius: '5px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#ffaa00',
            textAlign: 'center'
          }}>
            ⚠️ Divergence Detected!
            <div style={{ fontSize: '11px', marginTop: '5px', fontWeight: 'normal' }}>
              System unstable
            </div>
          </div>
        )}
        
        {/* Speed Control */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Speed: {speed.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        
        {/* Trail Toggle */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showTrails}
              onChange={(e) => setShowTrails(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span>Show Trails</span>
          </label>
        </div>
        
        {/* Trail Length */}
        {showTrails && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Trail Length: {trailLength}
            </label>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={trailLength}
              onChange={(e) => setTrailLength(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        )}
        
        {/* System Info */}
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          <div style={{ marginBottom: '5px' }}>
            <strong>Time:</strong> {currentState.time.toFixed(2)}
          </div>
          <div style={{ marginBottom: '5px' }}>
            <strong>Energy:</strong> {energy.toFixed(4)}
          </div>
          {currentState.bodies.map((body, i) => (
            <div key={i} style={{ color: body.color, marginTop: '8px' }}>
              <strong>{body.name}:</strong>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>
                v = {Math.sqrt(
                  body.velocity[0]**2 + 
                  body.velocity[1]**2 + 
                  body.velocity[2]**2
                ).toFixed(3)}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 3D Canvas */}
      <Canvas 
        camera={{ position: [0, 10, 20], fov: 60 }}
        style={{ background: 'radial-gradient(circle, #001122 0%, #000000 100%)' }}
      >
        <Suspense fallback={null}>
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
          
          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />
          
          {/* Animation */}
          <AnimationController
            initialState={initialState}
            isPaused={isPaused}
            speed={speed}
            showTrails={showTrails}
            trailLength={trailLength}
            onStateUpdate={handleStateUpdate}
            onDivergence={handleDivergence}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
