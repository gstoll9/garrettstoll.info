'use client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import SolarSystem from './SolarSystem'
import { useEffect, useState, useRef } from 'react'

export function UniverseCanvas() {
  const [contextLost, setContextLost] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Wait for canvas to be created
    const timer = setTimeout(() => {
      const canvas = canvasRef.current || document.querySelector('canvas');
      
      if (canvas) {
        const handleContextLost = (e: Event) => {
          e.preventDefault();
          console.log('WebGL context lost - preventing default behavior');
          setContextLost(true);
        };
        
        const handleContextRestored = () => {
          console.log('WebGL context restored - scene should recover automatically');
          setContextLost(false);
        };
        
        canvas.addEventListener('webglcontextlost', handleContextLost);
        canvas.addEventListener('webglcontextrestored', handleContextRestored);
        
        return () => {
          canvas.removeEventListener('webglcontextlost', handleContextLost);
          canvas.removeEventListener('webglcontextrestored', handleContextRestored);
        };
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (contextLost) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'white',
        backgroundColor: 'black'
      }}>
        WebGL Context Lost - Please refresh the page
      </div>
    );
  }

  return (
    <Canvas 
      ref={canvasRef}
      camera={{ position: [0, 10, 40], fov: 60 }}
      gl={{ 
        powerPreference: 'default', // Changed from 'high-performance'
        antialias: false,
        stencil: false,
        depth: true, // Changed from false
        alpha: false,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
        // Remove logarithmicDepthBuffer as it can cause issues
      }}
      // onCreated={({ gl }) => {
      //   console.log('WebGL Renderer created successfully');
      //   console.log('WebGL Version:', gl.getParameter(gl.VERSION));
      // }}
    >
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 0]} intensity={800} />
      <Stars radius={200} depth={50} count={500} factor={4} fade /> {/* Reduced count */}
      <SolarSystem />
      <OrbitControls />
    </Canvas>
  )
}