'use client'
import dynamic from 'next/dynamic'

const UniverseCanvas = dynamic(() => import('./components/UniverseCanvas').then(mod => mod.UniverseCanvas), {
  ssr: false
})

export default function Home() {
  return (
    <main style={{ height: '100vh', backgroundColor: 'black' }}>
      <UniverseCanvas />
    </main>
  )
}
