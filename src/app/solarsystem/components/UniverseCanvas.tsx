'use client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import SolarSystem from './SolarSystem'
import { useEffect } from 'react'


export function UniverseCanvas() {
  useEffect(() => {
    // Handle WebGL context loss and restoration
    const handleContextLost = (e: Event) => {
      e.preventDefault()
      console.log('WebGL context lost - preventing default behavior')
    }
    
    const handleContextRestored = () => {
      console.log('WebGL context restored - scene should recover automatically')
    }
    
    // Add event listeners
    const canvas = document.querySelector('canvas')
    canvas?.addEventListener('webglcontextlost', handleContextLost)
    canvas?.addEventListener('webglcontextrestored', handleContextRestored)
    
    // Cleanup function
    return () => {
      canvas?.removeEventListener('webglcontextlost', handleContextLost)
      canvas?.removeEventListener('webglcontextrestored', handleContextRestored)
    }
  }, [])

  return (
    <Canvas 
      camera={{ position: [0, 10, 40], fov: 60 }}
      // Add these props for better WebGL stability
      gl={{ 
        powerPreference: 'high-performance',
        antialias: false, // Disable for better performance
        stencil: false,
        depth: false,
        logarithmicDepthBuffer: true,
      }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={2} />
      <Stars radius={200} depth={50} count={1000} factor={4} fade />
      <SolarSystem />
      <OrbitControls />
    </Canvas>
  )
}
