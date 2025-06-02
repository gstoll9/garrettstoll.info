'use client'
import StandardLayout from '@/layouts/StandardLayout';
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
// 
const UniverseCanvas = dynamic(() => import('./components/UniverseCanvas').then(mod => mod.UniverseCanvas), {
  ssr: false,
  loading: () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: 'black',
      color: 'white' 
    }}>
      Loading Solar System...
    </div>
  )
})

export default function Home() {
  const main =(
    <main style={{ height: '100vh', backgroundColor: 'black' }}>
      <Suspense fallback={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          backgroundColor: 'black',
          color: 'white' 
        }}>
          Initializing 3D Scene...
        </div>
      }>
        <UniverseCanvas />
      </Suspense>
    </main>
  );

  return StandardLayout({title: "Solar System", main });
}