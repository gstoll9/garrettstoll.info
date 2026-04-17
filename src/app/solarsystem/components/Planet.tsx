import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef } from 'react'
import Label from './Label'
import { orbitalPosition } from '../utils'
import { getPlanetSize } from '../data/planets'
import { simulationState } from '../utils'

export type PlanetProps = {
  name: string
  size: number
  realDiameter: number
  color?: string
  texture?: string
  rotationalSpeed?: number
  orbitData: {
    semimajorAxis: number
    semimajorAxisSimplified: number
    eccentricity: number
    inclination: number
    longitudeOfAscendingNode: number
    argumentOfPerihelion: number
    meanAnomaly: number
    orbitalPeriod: number
  }
  moons?: {
    name: string
    size: number
    distance: number
    orbitSpeed: number
    color: string
  }[]
  orbitMode?: string
  onClick?: (name: string) => void
  useSimplifiedDistance?: boolean
  useRealisticSizes?: boolean
  timeScale?: number
  isFocused?: boolean
}

export default function Planet({
  name,
  size,
  realDiameter,
  color = 'white',
  texture,
  rotationalSpeed = 0,
  orbitData,
  moons,
  orbitMode = "Simple",
  onClick,
  useSimplifiedDistance = false,
  useRealisticSizes = false,
  timeScale = 1,
  isFocused = false,
}: PlanetProps) {
  const ref = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)

  const textureUrl = useLoader(
    THREE.TextureLoader,
    texture ?? '/solarstsremImages/UranusTexture.jpg'
  );

  const planetSize = useRealisticSizes ? getPlanetSize({ size, realDiameter } as any, true) : size;

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Orbit calculation uses the globally accumulated time
      const position = orbitalPosition(orbitMode, simulationState.elapsed, orbitData, useSimplifiedDistance, name, simulationState.dateMs)
      
      groupRef.current.position.set(...position); // Update position
    }
    if (ref.current) {
      if (orbitMode === 'RealLive') {
        const realRoationPeriodsDays: Record<string, number> = {
          'Mercury': 58.6,
          'Venus': -243,
          'Earth': 0.997,
          'Mars': 1.026,
          'Jupiter': 0.41,
          'Saturn': 0.44,
          'Uranus': -0.72,
          'Neptune': 0.67
        };
        const period = realRoationPeriodsDays[name];
        if (period) {
            const periodMs = period * 24 * 60 * 60 * 1000;
            // The angular velocity per millisecond:
            const angularVelocity = (2 * Math.PI) / periodMs;
            // Delta is in seconds, so delta ms is delta * 1000
            // DO NOT apply timescale to rotation, keep it real-time or constant visual rate
            ref.current.rotation.y += angularVelocity * (delta * 1000);
        } else {
            ref.current.rotation.y += rotationalSpeed * delta;
        }
      } else {
        ref.current.rotation.y += rotationalSpeed * delta // self-rotation speed
      }
    }
  })

  return (
    <group ref={groupRef}>

      {/* Planet Mesh */}
      <mesh
        ref={ref}
        onClick={() => onClick?.(name)}
      >
        <sphereGeometry args={[planetSize, 32, 32]} />
        <meshStandardMaterial 
          map={textureUrl}
          color={color}
          transparent={false}
          depthWrite={true}
          depthTest={true}
        />
      </mesh>

      {/* Saturn's Rings */}
      {name === 'Saturn' && (
        <mesh 
          rotation={[Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[planetSize + 2, planetSize + 4, 64]} />
          <meshBasicMaterial
            color="goldenrod"
            side={THREE.DoubleSide}
            transparent
            opacity={0.5}
          />
        </mesh>
      )}

      {/* Moons */}
      {isFocused && moons && moons.map(moon => (
        <Moon key={moon.name} moon={moon} planetSize={planetSize} planetName={name} orbitMode={orbitMode} />
      ))}

      {/* Label */}
      <Label text={name} position={[0, planetSize+1, 0]} />
    </group>
  )
}

function Moon({ moon, planetSize, planetName, orbitMode }: { moon: any, planetSize: number, planetName: string, orbitMode: string }) {
  const ref = useRef<THREE.Mesh>(null!)
  
  useFrame((_, delta) => {
    if (ref.current) {
        if (orbitMode === 'RealLive') {
           try {
               const astro = require('astronomy-engine');
               const now = new Date(simulationState.dateMs ?? Date.now());

               let x = null, y = null, z = null;

               if (planetName === 'Earth' && moon.name === 'Moon') {
                   const mm = astro.GeoMoon(now);
                   x = mm.x; y = mm.y; z = mm.z;
               } else if (planetName === 'Jupiter') {
                   const jm = astro.JupiterMoons(now);
                   const ms = jm[moon.name.toLowerCase()];
                   if (ms) {
                       x = ms.x; y = ms.y; z = ms.z;
                   }
               }

               if (x !== null && y !== null && z !== null) {
                   const rotMatrix = astro.Rotation_EQJ_ECL();
                   const vecEqj = { x, y, z };
                   const vecEcl = astro.RotateVector(rotMatrix, vecEqj);
                   
                   let X = vecEcl.x;
                   let Y = vecEcl.z;
                   let Z = -vecEcl.y;

                   const currentDist = Math.sqrt(X * X + Y * Y + Z * Z);
                   if (currentDist > 0) {
                       // Normalize the true astronomical positioning to our visual component scale
                       const scale = (planetSize + moon.distance) / currentDist;
                       ref.current.position.set(X * scale, Y * scale, Z * scale);
                       return;
                   }
               }
           } catch(e) {
               console.error(e);
           }
        }
        
        // Simple fallback for moons without direct astronomy-engine positioning support
        const angle = simulationState.elapsed * moon.orbitSpeed * 0.5
        ref.current.position.set(
            Math.cos(angle) * (planetSize + moon.distance),
            0,
            Math.sin(angle) * (planetSize + moon.distance)
        )
    }
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[moon.size, 16, 16]} />
      <meshStandardMaterial color={moon.color} />
      <Label text={moon.name} position={[0, moon.size + 0.5, 0]} fontSize={0.2} />
    </mesh>
  )
}
