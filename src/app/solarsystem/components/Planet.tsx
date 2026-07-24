import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef, useState } from 'react'
import { Html, Edges } from '@react-three/drei'
import { GeoMoon, JupiterMoons, Rotation_EQJ_ECL, RotateVector, Vector } from 'astronomy-engine'
import Label from './Label'
import { orbitalPosition, getBodyAxis, moonOrbitalPosition, MoonOrbitProps, BodyAxis } from '../utils'
import { getPlanetSize } from '../data/planets'
import { simulationState } from '../utils'
import Rings, { RingSpec } from './Rings'

export type PlanetProps = {
  name: string
  size: number
  realDiameter: number
  color?: string
  texture?: string
  rotationalSpeed?: number
  structure?: {
    coreRadius: number; // 0 to 1 fraction of crust
    mantleRadius: number; // 0 to 1 fraction of crust
    atmosphereRadius?: number; // > 1 fraction of crust
    coreColor?: string;
    mantleColor?: string;
    atmosphereColor?: string;
  }
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
    distance: number // display-scale target distance; used for the exact-ephemeris moons' scale-fit (Earth's Moon, Jupiter's Galilean four)
    orbitSpeed: number // legacy circular-orbit fallback speed; only used when neither exact ephemeris nor orbitData is available
    color: string
    orbitData?: MoonOrbitProps // real Kepler elements (see utils.tsx) — used instead of the circular fallback when present
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
  structure,
}: PlanetProps) {
  const ref = useRef<THREE.Group>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null)
  // Real axial tilt/spin for this body (see getBodyAxis in utils.tsx); shared with
  // Moon children below so their orbital planes can be tilted to match, and with Rings.
  const axisRef = useRef<BodyAxis | null>(null)

  const textureUrl = useLoader(
    THREE.TextureLoader,
    texture ?? '/solarsystemImages/UranusTexture.jpg'
  );

  const planetSize = useRealisticSizes ? getPlanetSize({ size, realDiameter } as any, true) : size;

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Orbit calculation uses the globally accumulated time
      const position = orbitalPosition(orbitMode, simulationState.elapsed, orbitData, useSimplifiedDistance, name, simulationState.dateMs)
      
      groupRef.current.position.set(...position); // Update position
    }
    if (ref.current) {
      if (isFocused) {
        // Freeze and align the cut to face our specific camera angle
        ref.current.rotation.y = 0;
        ref.current.rotation.x = 0;
        ref.current.rotation.z = 0;
        ref.current.quaternion.identity();
      } else if (orbitMode === 'RealLive') {
        const axis = getBodyAxis(name, simulationState.dateMs);
        axisRef.current = axis;
        if (axis) {
          // Real IAU pole orientation + prime-meridian angle: tilt the sphere's local
          // +Y (its "up") to the real north-pole direction, then spin it about that
          // now-tilted axis by the real instantaneous prime-meridian angle.
          const tiltQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(...axis.northThree).normalize()
          );
          const spinQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            THREE.MathUtils.degToRad(axis.spinDegrees)
          );
          ref.current.quaternion.copy(tiltQuat).multiply(spinQuat);
        } else {
          ref.current.rotation.y += rotationalSpeed * delta;
        }
      } else {
        ref.current.rotation.y += rotationalSpeed * delta; // self-rotation speed
      }
    }
  })

  return (
    <group ref={groupRef}>

      {/* Planet Mesh/Group */}
      <group
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(name);
        }}
      >
        {/* Layer Groups and Tooltip */}
        {isFocused && structure ? (
          <>
            {hoveredLayer && (
              <Html position={[0, planetSize + (hoveredLayer === 'atmosphere' ? (structure.atmosphereRadius || 1) * 0.5 : 0.5), 0]} center zIndexRange={[100, 0]}>
                <div style={{
                  background: 'rgba(18,18,22,0.96)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderTop: `2px solid ${hoveredLayer === 'core' ? (structure.coreColor || '#ececec') : hoveredLayer === 'mantle' ? (structure.mantleColor || '#ffaa00') : hoveredLayer === 'crust' ? '#66AAFF' : (structure.atmosphereColor || '#aaaaaa')}`,
                  borderRadius: '6px',
                  padding: '10px 14px 12px',
                  color: 'white',
                  fontFamily: 'system-ui, sans-serif',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                  width: '180px',
                  pointerEvents: 'none',
                  zIndex: 10
                }}>
                  <div style={{ color: hoveredLayer === 'core' ? (structure.coreColor || '#ececec') : hoveredLayer === 'mantle' ? (structure.mantleColor || '#ffaa00') : hoveredLayer === 'crust' ? '#66AAFF' : (structure.atmosphereColor || '#aaaaaa'), fontWeight: 600, fontSize: '13px', letterSpacing: '0.01em', marginBottom: '8px', textTransform: 'capitalize' }}>
                    {hoveredLayer}
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: '5px', columnGap: '12px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>Radius</span>
                    <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: '11px', textAlign: 'right' }}>
                      {
                        hoveredLayer === 'core' ? (structure.coreRadius * realDiameter/2).toLocaleString(undefined, {maximumFractionDigits: 0}) :
                        hoveredLayer === 'mantle' ? (structure.mantleRadius * realDiameter/2).toLocaleString(undefined, {maximumFractionDigits: 0}) :
                        hoveredLayer === 'crust' ? (realDiameter/2).toLocaleString(undefined, {maximumFractionDigits: 0}) :
                        (structure.atmosphereRadius! * realDiameter/2).toLocaleString(undefined, {maximumFractionDigits: 0})
                      } km
                    </span>
                  </div>
                </div>
              </Html>
            )}

            {/* Atmosphere (Optional) */}
            {structure.atmosphereRadius && (
              <group
                onPointerOver={(e) => { e.stopPropagation(); setHoveredLayer('atmosphere'); }}
                onPointerOut={(e) => { e.stopPropagation(); setHoveredLayer(null); }}
              >
                <mesh>
                  <sphereGeometry args={[planetSize * structure.atmosphereRadius, 32, 16, 0, Math.PI * 1.5, 0, Math.PI / 2]} />
                  <meshStandardMaterial color={structure.atmosphereColor || "#aaaaaa"} emissive={structure.atmosphereColor || "#aaaaaa"} emissiveIntensity={hoveredLayer === 'atmosphere' ? 0.3 : 0.05} transparent opacity={hoveredLayer === 'atmosphere' ? 0.3 : 0.15} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                <mesh>
                  <sphereGeometry args={[planetSize * structure.atmosphereRadius, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                  <meshStandardMaterial color={structure.atmosphereColor || "#aaaaaa"} emissive={structure.atmosphereColor || "#aaaaaa"} emissiveIntensity={hoveredLayer === 'atmosphere' ? 0.3 : 0.05} transparent opacity={hoveredLayer === 'atmosphere' ? 0.3 : 0.15} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>

                {/* Flat cut faces - Atmosphere portion */}
                <mesh rotation={[0, Math.PI, 0]} position={[0, 0, 0]}>
                  <ringGeometry args={[planetSize, planetSize * structure.atmosphereRadius, 32, 1, 0, Math.PI / 2]} />
                  <meshStandardMaterial color={structure.atmosphereColor || "#aaaaaa"} emissive={structure.atmosphereColor || "#aaaaaa"} emissiveIntensity={hoveredLayer === 'atmosphere' ? 0.3 : 0.05} transparent opacity={hoveredLayer === 'atmosphere' ? 0.3 : 0.15} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                <mesh rotation={[0, Math.PI / 2, 0]} position={[0, 0, 0]}>
                  <ringGeometry args={[planetSize, planetSize * structure.atmosphereRadius, 32, 1, 0, Math.PI / 2]} />
                  <meshStandardMaterial color={structure.atmosphereColor || "#aaaaaa"} emissive={structure.atmosphereColor || "#aaaaaa"} emissiveIntensity={hoveredLayer === 'atmosphere' ? 0.3 : 0.05} transparent opacity={hoveredLayer === 'atmosphere' ? 0.3 : 0.15} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                  <ringGeometry args={[planetSize, planetSize * structure.atmosphereRadius, 32, 1, Math.PI / 2, Math.PI / 2]} />
                  <meshStandardMaterial color={structure.atmosphereColor || "#aaaaaa"} emissive={structure.atmosphereColor || "#aaaaaa"} emissiveIntensity={hoveredLayer === 'atmosphere' ? 0.3 : 0.05} transparent opacity={hoveredLayer === 'atmosphere' ? 0.3 : 0.15} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
              </group>
            )}

            {/* Crust */}
            <group
              onPointerOver={(e) => { e.stopPropagation(); setHoveredLayer('crust'); }}
              onPointerOut={(e) => { e.stopPropagation(); setHoveredLayer(null); }}
            >
              <mesh>
                <sphereGeometry 
                  args={[planetSize, 32, 16, 0, Math.PI * 1.5, 0, Math.PI / 2]} 
                  onUpdate={(geom) => {
                    if (geom.userData.uvsFixed) return;
                    geom.userData.uvsFixed = true;
                    const uv = geom.attributes.uv;
                    for (let i = 0; i < uv.count; i++) {
                      uv.setXY(i, uv.getX(i) * 0.75, uv.getY(i) * 0.5 + 0.5);
                    }
                    uv.needsUpdate = true;
                  }}
                />
                <meshStandardMaterial map={textureUrl} color={color} side={THREE.DoubleSide} emissive={color} emissiveIntensity={0.05} />
              </mesh>
              <mesh>
                <sphereGeometry 
                  args={[planetSize, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} 
                  onUpdate={(geom) => {
                    if (geom.userData.uvsFixed) return;
                    geom.userData.uvsFixed = true;
                    const uv = geom.attributes.uv;
                    for (let i = 0; i < uv.count; i++) {
                      uv.setY(i, uv.getY(i) * 0.5);
                    }
                    uv.needsUpdate = true;
                  }}
                />
                <meshStandardMaterial map={textureUrl} color={color} side={THREE.DoubleSide} emissive={color} emissiveIntensity={0.05} />
              </mesh>

              {/* Flat cut faces - Crust portion */}
              <mesh rotation={[0, Math.PI, 0]} position={[0, 0, 0]}>
                <ringGeometry args={[planetSize * structure.mantleRadius, planetSize, 32, 1, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#8b5a2b" side={THREE.DoubleSide} emissive="#8b5a2b" emissiveIntensity={0.05} />
                <Edges color={hoveredLayer === 'crust' ? "#ffffff" : "#8B5A2B"} threshold={15} />
              </mesh>
              <mesh rotation={[0, Math.PI / 2, 0]} position={[0, 0, 0]}>
                <ringGeometry args={[planetSize * structure.mantleRadius, planetSize, 32, 1, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#8b5a2b" side={THREE.DoubleSide} emissive="#8b5a2b" emissiveIntensity={0.05} />
                <Edges color={hoveredLayer === 'crust' ? "#ffffff" : "#8B5A2B"} threshold={15} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <ringGeometry args={[planetSize * structure.mantleRadius, planetSize, 32, 1, Math.PI / 2, Math.PI / 2]} />
                <meshStandardMaterial color="#8b5a2b" side={THREE.DoubleSide} emissive="#8b5a2b" emissiveIntensity={0.05} />
                <Edges color={hoveredLayer === 'crust' ? "#ffffff" : "#8B5A2B"} threshold={15} />
              </mesh>
            </group>

            {/* Mantle */}
            <group
              onPointerOver={(e) => { e.stopPropagation(); setHoveredLayer('mantle'); }}
              onPointerOut={(e) => { e.stopPropagation(); setHoveredLayer(null); }}
            >
              <mesh>
                <sphereGeometry args={[planetSize * structure.mantleRadius, 32, 16, 0, Math.PI * 1.5, 0, Math.PI / 2]} />
                <meshStandardMaterial color={structure.mantleColor || "#ffaa00"} emissive={structure.mantleColor || "#ffaa00"} emissiveIntensity={0.2} side={THREE.DoubleSide} />
                <Edges color={hoveredLayer === 'mantle' ? "#ffffff" : (structure.mantleColor || "#ffaa00")} threshold={15} />
              </mesh>
              <mesh>
                <sphereGeometry args={[planetSize * structure.mantleRadius, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                <meshStandardMaterial color={structure.mantleColor || "#ffaa00"} emissive={structure.mantleColor || "#ffaa00"} emissiveIntensity={0.2} side={THREE.DoubleSide} />
                <Edges color={hoveredLayer === 'mantle' ? "#ffffff" : (structure.mantleColor || "#ffaa00")} threshold={15} />
              </mesh>

              {/* Flat cut faces - Mantle portion */}
              <mesh rotation={[0, Math.PI, 0]} position={[0, 0, 0]}>
                <ringGeometry args={[planetSize * structure.coreRadius, planetSize * structure.mantleRadius, 32, 1, 0, Math.PI / 2]} />
                <meshStandardMaterial color={structure.mantleColor || "#ffaa00"} emissive={structure.mantleColor || "#ffaa00"} emissiveIntensity={0.2} side={THREE.DoubleSide} />
                <Edges color={hoveredLayer === 'mantle' ? "#ffffff" : (structure.mantleColor || "#ffaa00")} threshold={15} />
              </mesh>
              <mesh rotation={[0, Math.PI / 2, 0]} position={[0, 0, 0]}>
                <ringGeometry args={[planetSize * structure.coreRadius, planetSize * structure.mantleRadius, 32, 1, 0, Math.PI / 2]} />
                <meshStandardMaterial color={structure.mantleColor || "#ffaa00"} emissive={structure.mantleColor || "#ffaa00"} emissiveIntensity={0.2} side={THREE.DoubleSide} />
                <Edges color={hoveredLayer === 'mantle' ? "#ffffff" : (structure.mantleColor || "#ffaa00")} threshold={15} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <ringGeometry args={[planetSize * structure.coreRadius, planetSize * structure.mantleRadius, 32, 1, Math.PI / 2, Math.PI / 2]} />
                <meshStandardMaterial color={structure.mantleColor || "#ffaa00"} emissive={structure.mantleColor || "#ffaa00"} emissiveIntensity={0.2} side={THREE.DoubleSide} />
                <Edges color={hoveredLayer === 'mantle' ? "#ffffff" : (structure.mantleColor || "#ffaa00")} threshold={15} />
              </mesh>
            </group>

            {/* Core */}
            <group
              onPointerOver={(e) => { e.stopPropagation(); setHoveredLayer('core'); }}
              onPointerOut={(e) => { e.stopPropagation(); setHoveredLayer(null); }}
            >
              <mesh>
                <sphereGeometry args={[planetSize * structure.coreRadius, 32, 16, 0, Math.PI * 1.5, 0, Math.PI / 2]} />
                <meshStandardMaterial color={structure.coreColor || "#ececec"} emissive={structure.coreColor || "#ececec"} emissiveIntensity={0.2} side={THREE.DoubleSide} />
                <Edges color={hoveredLayer === 'core' ? "#ffffff" : (structure.coreColor || "#ececec")} threshold={15} />
              </mesh>
              <mesh>
                <sphereGeometry args={[planetSize * structure.coreRadius, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                <meshStandardMaterial color={structure.coreColor || "#ececec"} emissive={structure.coreColor || "#ececec"} emissiveIntensity={0.2} side={THREE.DoubleSide} />
                <Edges color={hoveredLayer === 'core' ? "#ffffff" : (structure.coreColor || "#ececec")} threshold={15} />
              </mesh>

              {/* Flat cut faces - Core portion */}
              <mesh rotation={[0, Math.PI, 0]} position={[0, 0, 0]}>
                <circleGeometry args={[planetSize * structure.coreRadius, 32, 0, Math.PI / 2]} />
                <meshStandardMaterial color={structure.coreColor || "#ececec"} emissive={structure.coreColor || "#ececec"} emissiveIntensity={0.2} side={THREE.DoubleSide} />
                <Edges color={hoveredLayer === 'core' ? "#ffffff" : (structure.coreColor || "#ececec")} threshold={15} />
              </mesh>
              <mesh rotation={[0, Math.PI / 2, 0]} position={[0, 0, 0]}>
                <circleGeometry args={[planetSize * structure.coreRadius, 32, 0, Math.PI / 2]} />
                <meshStandardMaterial color={structure.coreColor || "#ececec"} emissive={structure.coreColor || "#ececec"} emissiveIntensity={0.2} side={THREE.DoubleSide} />
                <Edges color={hoveredLayer === 'core' ? "#ffffff" : (structure.coreColor || "#ececec")} threshold={15} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <circleGeometry args={[planetSize * structure.coreRadius, 32, Math.PI / 2, Math.PI / 2]} />
                <meshStandardMaterial color={structure.coreColor || "#ececec"} emissive={structure.coreColor || "#ececec"} emissiveIntensity={0.2} side={THREE.DoubleSide} />
                <Edges color={hoveredLayer === 'core' ? "#ffffff" : (structure.coreColor || "#ececec")} threshold={15} />
              </mesh>
            </group>
          </>
        ) : (
          <group
            onPointerOver={(e) => { e.stopPropagation(); setHoveredLayer('total_crust'); }}
            onPointerOut={(e) => { e.stopPropagation(); setHoveredLayer(null); }}
          >
            <mesh>
              <sphereGeometry args={[planetSize, 32, 32]} />
              {/* Bodies with no real texture (e.g. dwarf planets) render as a flat color
                  instead of falling back to the shared placeholder texture image, which
                  would otherwise show a mismatched Uranus texture on them. */}
              <meshStandardMaterial map={texture ? textureUrl : undefined} color={color} />
              {hoveredLayer === 'total_crust' && <Edges color="#66AAFF" threshold={15} />}
            </mesh>
          </group>
        )}
      </group>

      {/* Ring systems (Jupiter/Saturn/Uranus/Neptune) */}
      <Rings planetName={name} planetSize={planetSize} axisRef={axisRef} />

      {/* Moons */}
      {isFocused && moons && moons.map(moon => (
        <Moon key={moon.name} moon={moon} planetSize={planetSize} planetName={name} orbitMode={orbitMode} axisRef={axisRef} />
      ))}

      {/* Label */}
      <Label text={name} position={[0, planetSize + (isFocused ? 0.5 : 1), 0]} fontSize={isFocused ? 0.3 : 1} />
    </group>
  )
}

function Moon({ moon, planetSize, planetName, orbitMode, axisRef }: { moon: any, planetSize: number, planetName: string, orbitMode: string, axisRef: React.RefObject<BodyAxis | null> }) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    if (ref.current) {
        if (orbitMode === 'RealLive') {
           try {
               const now = new Date(simulationState.dateMs ?? Date.now());

               let vecEqj: Vector | null = null;

               if (planetName === 'Earth' && moon.name === 'Moon') {
                   vecEqj = GeoMoon(now);
               } else if (planetName === 'Jupiter') {
                   const jm = JupiterMoons(now);
                   vecEqj = (jm as any)[moon.name.toLowerCase()] ?? null;
               }

               if (vecEqj) {
                   const rotMatrix = Rotation_EQJ_ECL();
                   const vecEcl = RotateVector(rotMatrix, vecEqj);

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

           if (moon.orbitData) {
               // Real Kepler elements, tilted into the parent planet's real equatorial plane
               const [x, y, z] = moonOrbitalPosition(
                   simulationState.elapsed,
                   moon.orbitData,
                   planetSize,
                   axisRef.current?.northThree ?? null
               );
               ref.current.position.set(x, y, z);
               return;
           }
        }

        // Simple fallback for moons without real orbital elements
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
