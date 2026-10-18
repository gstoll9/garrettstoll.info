import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef, useState } from 'react'
import { Edges } from '@react-three/drei'
import { GeoMoon, JupiterMoons, Rotation_EQJ_ECL, RotateVector, Vector, StateVector } from 'astronomy-engine'
import Label from './Label'
import { orbitalPosition, getBodyAxis, moonOrbitalPosition, MoonOrbitProps, BodyAxis } from '../utils'
import { getPlanetSize } from '../data/planets'
import { simulationState } from '../utils'
import { PlanetStructure, LayerFacts, LayerKey } from '../data/planetStructure'
import Rings from './Rings'

// A hover/focus target: any radial layer key, the whole-planet fallback sphere used when
// a body has no `structure` data ('total_crust'), or nothing hovered.
export type HoveredLayer = LayerKey | 'total_crust' | null;

export type PlanetProps = {
  name: string
  size: number
  realDiameter: number
  color?: string
  texture?: string
  rotationalSpeed?: number
  structure?: PlanetStructure
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
  isFocused?: boolean
  showAtmosphere?: boolean // default true — peel back the atmosphere shell in the 3D cutaway
  showCrust?: boolean // default true — peel back the crust shell in the 3D cutaway
  hoveredLayer?: HoveredLayer // lifted state so a DOM sibling (LayerCrossSection) can share it; falls back to local state if omitted
  setHoveredLayer?: (layer: HoveredLayer) => void
}

export type MoonData = NonNullable<PlanetProps['moons']>[number];

// --- Tooltip formatting helpers (exported for reuse by LayerCrossSection.tsx) -----------

export function kelvinToC(k: number): number {
  return Math.round(k - 273.15);
}

export function formatTempK(t?: number | { min?: number; mean?: number; max?: number }): string | null {
  if (t === undefined) return null;
  if (typeof t === 'number') return `${kelvinToC(t)}°C`;
  const { min, mean, max } = t;
  if (min !== undefined && max !== undefined) return `${kelvinToC(min)}°C to ${kelvinToC(max)}°C`;
  if (mean !== undefined) return `${kelvinToC(mean)}°C`;
  return null;
}

export function formatMassKg(kg: number): { mantissa: string; exp: number } {
  const exp = Math.floor(Math.log10(kg));
  const mantissa = (kg / Math.pow(10, exp)).toFixed(2);
  return { mantissa, exp };
}

export function formatDayLength(hours: number): string {
  if (hours >= 48) return `${(hours / 24).toFixed(1)} days`;
  return `${hours.toFixed(1)} hours`;
}

export function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString()} km`;
}

// A label/value row within the tooltip grid.
export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{label}</span>
      <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: '11px', textAlign: 'right' }}>{value}</span>
    </>
  );
}

export type TooltipContent = { title: string; color: string; body: React.ReactNode };

// Shared content builder for any plain radial layer (core/innerCore/outerCore/mantle/
// upperMantle/lowerMantle) — crust and atmosphere have extra fields (whole-planet facts,
// gas composition) and keep their own builders below.
export function layerTooltipContent(layer: LayerFacts, radiusKm: number, fallbackTitle: string): TooltipContent {
  return {
    title: layer.displayName || fallbackTitle,
    color: layer.color || '#ffffff',
    body: (
      <>
        <Row label="Radius" value={formatKm(radiusKm)} />
        <Row label="Material" value={layer.material} />
        {layer.densityGCm3 !== undefined && <Row label="Density" value={`${layer.densityGCm3} g/cm³`} />}
        {formatTempK(layer.tempK) && <Row label="Temp" value={formatTempK(layer.tempK)} />}
        {layer.note && <Row label="" value={layer.note} />}
      </>
    ),
  };
}

export function crustTooltipContent(structure: PlanetStructure): TooltipContent {
  const { crust, facts } = structure;
  const { mantissa, exp } = formatMassKg(facts.massKg);
  return {
    title: crust.displayName || 'Crust',
    color: crust.color || '#66AAFF',
    body: (
      <>
        <Row label="Radius" value={formatKm(facts.meanRadiusKm)} />
        <Row label="Material" value={crust.material} />
        {crust.note && <Row label="" value={crust.note} />}
        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
        <Row label="Mass" value={<>{mantissa} × 10<sup>{exp}</sup> kg</>} />
        <Row label="Gravity" value={`${facts.gravityMs2} m/s²`} />
        <Row label="Day length" value={formatDayLength(facts.dayLengthHours)} />
        <Row label="Axial tilt" value={`${facts.axialTiltDeg}°`} />
        <Row label="Moons" value={String(facts.moonCount)} />
        {facts.funFact && (
          <div style={{ gridColumn: '1 / -1', marginTop: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
            {facts.funFact}
          </div>
        )}
      </>
    ),
  };
}

export function atmosphereTooltipContent(structure: PlanetStructure): TooltipContent | null {
  if (!structure.atmosphere) return null;
  const atmo = structure.atmosphere;
  const topGases = atmo.composition.slice(0, 4);
  return {
    title: atmo.displayName || 'Atmosphere',
    color: atmo.color || '#aaaaaa',
    body: (
      <>
        <Row label="Radius" value={formatKm(atmo.radiusFraction * structure.facts.meanRadiusKm)} />
        {topGases.map(g => (
          <Row key={g.gas} label={g.gas} value={`${g.percent}%`} />
        ))}
        {atmo.composition.length > 4 && <Row label="" value="+ trace gases" />}
        {atmo.surfacePressureKPa !== undefined && (
          <Row label="Pressure" value={`${atmo.surfacePressureKPa.toLocaleString()} kPa`} />
        )}
        {atmo.surfacePressureKPa === undefined && atmo.scaleHeightKm !== undefined && (
          <Row label="Scale height" value={`${atmo.scaleHeightKm} km`} />
        )}
        {formatTempK(atmo.tempK) && <Row label="Temp" value={formatTempK(atmo.tempK)} />}
      </>
    ),
  };
}

// Single entry point for "what should the tooltip show for this layer key" — used by
// LayerCrossSection.tsx's 2D panel.
export function getTooltipContent(structure: PlanetStructure, key: LayerKey): TooltipContent | null {
  switch (key) {
    case 'atmosphere':
      return atmosphereTooltipContent(structure);
    case 'crust':
      return crustTooltipContent(structure);
    case 'innerCore':
      return structure.core.innerCore
        ? layerTooltipContent(structure.core.innerCore, structure.core.innerCore.radiusFraction * structure.facts.meanRadiusKm, 'Inner Core')
        : null;
    case 'outerCore':
    case 'core':
      return layerTooltipContent(structure.core, structure.core.radiusFraction * structure.facts.meanRadiusKm, key === 'outerCore' ? 'Outer Core' : 'Core');
    case 'lowerMantle':
      return structure.mantle.lowerMantle
        ? layerTooltipContent(structure.mantle.lowerMantle, structure.mantle.lowerMantle.radiusFraction * structure.facts.meanRadiusKm, 'Lower Mantle')
        : null;
    case 'upperMantle':
    case 'mantle':
      return layerTooltipContent(structure.mantle, structure.mantle.radiusFraction * structure.facts.meanRadiusKm, key === 'upperMantle' ? 'Upper Mantle' : 'Mantle');
    default:
      return null;
  }
}

// One radial layer's geometry: two outer-surface partial spheres (covering the sphere
// minus the removed octant) plus 3 flat cut-face meshes on the three cutaway planes —
// a ring if this shell has a nonzero inner radius, a circle (solid disk) if it's the
// innermost layer (core/innerCore). Shared by every plain colored layer (core/innerCore/
// outerCore/mantle/upperMantle/lowerMantle); crust (textured) and atmosphere
// (transparent/glowing) keep their own bespoke JSX below since they differ materially.
function Shell({
  innerR,
  outerR,
  color,
  hoverKey,
  hoveredLayer,
  setHoveredLayer,
  emissiveIntensity = 0.2,
}: {
  innerR: number
  outerR: number
  color: string
  hoverKey: LayerKey
  hoveredLayer: HoveredLayer
  setHoveredLayer: (layer: HoveredLayer) => void
  emissiveIntensity?: number
}) {
  const isHollow = innerR > 0;
  const edgeColor = hoveredLayer === hoverKey ? '#ffffff' : color;

  return (
    <group
      onPointerOver={(e) => { e.stopPropagation(); setHoveredLayer(hoverKey); }}
      onPointerOut={(e) => { e.stopPropagation(); setHoveredLayer(null); }}
    >
      <mesh>
        <sphereGeometry args={[outerR, 64, 32, 0, Math.PI * 1.5, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} side={THREE.DoubleSide} />
        <Edges color={edgeColor} threshold={15} />
      </mesh>
      <mesh>
        <sphereGeometry args={[outerR, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} side={THREE.DoubleSide} />
        <Edges color={edgeColor} threshold={15} />
      </mesh>

      {/* Flat cut faces */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0, 0]}>
        {isHollow
          ? <ringGeometry args={[innerR, outerR, 64, 1, 0, Math.PI / 2]} />
          : <circleGeometry args={[outerR, 64, 0, Math.PI / 2]} />}
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} side={THREE.DoubleSide} />
        <Edges color={edgeColor} threshold={15} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0, 0, 0]}>
        {isHollow
          ? <ringGeometry args={[innerR, outerR, 64, 1, 0, Math.PI / 2]} />
          : <circleGeometry args={[outerR, 64, 0, Math.PI / 2]} />}
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} side={THREE.DoubleSide} />
        <Edges color={edgeColor} threshold={15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        {isHollow
          ? <ringGeometry args={[innerR, outerR, 64, 1, Math.PI / 2, Math.PI / 2]} />
          : <circleGeometry args={[outerR, 64, Math.PI / 2, Math.PI / 2]} />}
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} side={THREE.DoubleSide} />
        <Edges color={edgeColor} threshold={15} />
      </mesh>
    </group>
  );
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
  isFocused = false,
  structure,
  showAtmosphere = true,
  showCrust = true,
  hoveredLayer: hoveredLayerProp,
  setHoveredLayer: setHoveredLayerProp,
}: PlanetProps) {
  const ref = useRef<THREE.Group>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  // Falls back to local state when no lifted state is supplied, so Planet stays usable
  // standalone; SolarSystem.tsx normally passes the shared UniverseCanvas-level state.
  const [fallbackHoveredLayer, setFallbackHoveredLayer] = useState<HoveredLayer>(null)
  const hoveredLayer = hoveredLayerProp !== undefined ? hoveredLayerProp : fallbackHoveredLayer;
  const setHoveredLayer = setHoveredLayerProp ?? setFallbackHoveredLayer;
  // Real axial tilt/spin for this body (see getBodyAxis in utils.tsx); shared with
  // Moon children below so their orbital planes can be tilted to match, and with Rings.
  const axisRef = useRef<BodyAxis | null>(null)

  const textureUrl = useLoader(
    THREE.TextureLoader,
    texture ?? '/solarsystemImages/UranusTexture.jpg'
  );

  const planetSize = useRealisticSizes ? getPlanetSize({ size, realDiameter }, true) : size;

  // World-space layer radii, computed once. `EPS` exists purely to keep ring/circle
  // geometry non-degenerate when two boundaries are proportionally very close (e.g. a
  // true-to-scale crust, or Mars's ~613 km inner core, is often <1% of the planet's
  // radius) — it is NOT a visual exaggeration, just a guard against NaN/inverted
  // geometry. It scales with planetSize since that itself ranges from ~3 units down to
  // ~0.008 units depending on the "useRealisticSizes" toggle, so a fixed epsilon would
  // either do nothing or swallow a real gap depending on scale.
  let innerCoreR: number | undefined;
  let coreR = 0, lowerMantleR: number | undefined, mantleR = 0, crustR = planetSize, atmoR: number | undefined;
  if (structure) {
    const EPS = planetSize * 1e-4;
    coreR = planetSize * structure.core.radiusFraction;
    innerCoreR = structure.core.innerCore
      ? Math.max(EPS, Math.min(planetSize * structure.core.innerCore.radiusFraction, coreR - EPS))
      : undefined;
    mantleR = Math.max(planetSize * structure.mantle.radiusFraction, coreR + EPS);
    lowerMantleR = structure.mantle.lowerMantle
      ? Math.min(Math.max(planetSize * structure.mantle.lowerMantle.radiusFraction, coreR + EPS), mantleR - EPS)
      : undefined;
    crustR = Math.max(planetSize, mantleR + EPS);
    atmoR = structure.atmosphere ? Math.max(planetSize * structure.atmosphere.radiusFraction, crustR + EPS) : undefined;
  }

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

  const coreHasSplit = !!structure?.core.innerCore;
  const mantleHasSplit = !!structure?.mantle.lowerMantle;

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
        {/* Layer Groups */}
        {isFocused && structure ? (
          <>
            {/* Atmosphere (Optional) */}
            {structure.atmosphere && atmoR !== undefined && showAtmosphere && (
              <group
                onPointerOver={(e) => { e.stopPropagation(); setHoveredLayer('atmosphere'); }}
                onPointerOut={(e) => { e.stopPropagation(); setHoveredLayer(null); }}
              >
                <mesh>
                  <sphereGeometry args={[atmoR, 64, 32, 0, Math.PI * 1.5, 0, Math.PI / 2]} />
                  <meshStandardMaterial color={structure.atmosphere.color || "#aaaaaa"} emissive={structure.atmosphere.color || "#aaaaaa"} emissiveIntensity={hoveredLayer === 'atmosphere' ? 0.3 : 0.05} transparent opacity={hoveredLayer === 'atmosphere' ? 0.3 : 0.15} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                <mesh>
                  <sphereGeometry args={[atmoR, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                  <meshStandardMaterial color={structure.atmosphere.color || "#aaaaaa"} emissive={structure.atmosphere.color || "#aaaaaa"} emissiveIntensity={hoveredLayer === 'atmosphere' ? 0.3 : 0.05} transparent opacity={hoveredLayer === 'atmosphere' ? 0.3 : 0.15} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>

                {/* Flat cut faces - Atmosphere portion */}
                <mesh rotation={[0, Math.PI, 0]} position={[0, 0, 0]}>
                  <ringGeometry args={[crustR, atmoR, 64, 1, 0, Math.PI / 2]} />
                  <meshStandardMaterial color={structure.atmosphere.color || "#aaaaaa"} emissive={structure.atmosphere.color || "#aaaaaa"} emissiveIntensity={hoveredLayer === 'atmosphere' ? 0.3 : 0.05} transparent opacity={hoveredLayer === 'atmosphere' ? 0.3 : 0.15} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                <mesh rotation={[0, Math.PI / 2, 0]} position={[0, 0, 0]}>
                  <ringGeometry args={[crustR, atmoR, 64, 1, 0, Math.PI / 2]} />
                  <meshStandardMaterial color={structure.atmosphere.color || "#aaaaaa"} emissive={structure.atmosphere.color || "#aaaaaa"} emissiveIntensity={hoveredLayer === 'atmosphere' ? 0.3 : 0.05} transparent opacity={hoveredLayer === 'atmosphere' ? 0.3 : 0.15} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                  <ringGeometry args={[crustR, atmoR, 64, 1, Math.PI / 2, Math.PI / 2]} />
                  <meshStandardMaterial color={structure.atmosphere.color || "#aaaaaa"} emissive={structure.atmosphere.color || "#aaaaaa"} emissiveIntensity={hoveredLayer === 'atmosphere' ? 0.3 : 0.05} transparent opacity={hoveredLayer === 'atmosphere' ? 0.3 : 0.15} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
              </group>
            )}

            {/* Crust */}
            {showCrust && (
              <group
                onPointerOver={(e) => { e.stopPropagation(); setHoveredLayer('crust'); }}
                onPointerOut={(e) => { e.stopPropagation(); setHoveredLayer(null); }}
              >
                <mesh>
                  <sphereGeometry
                    args={[crustR, 64, 32, 0, Math.PI * 1.5, 0, Math.PI / 2]}
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
                    args={[crustR, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
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
                  <ringGeometry args={[mantleR, crustR, 64, 1, 0, Math.PI / 2]} />
                  <meshStandardMaterial color={structure.crust.color || '#8b5a2b'} side={THREE.DoubleSide} emissive={structure.crust.color || '#8b5a2b'} emissiveIntensity={0.05} />
                  <Edges color={hoveredLayer === 'crust' ? "#ffffff" : (structure.crust.color || '#8b5a2b')} threshold={15} />
                </mesh>
                <mesh rotation={[0, Math.PI / 2, 0]} position={[0, 0, 0]}>
                  <ringGeometry args={[mantleR, crustR, 64, 1, 0, Math.PI / 2]} />
                  <meshStandardMaterial color={structure.crust.color || '#8b5a2b'} side={THREE.DoubleSide} emissive={structure.crust.color || '#8b5a2b'} emissiveIntensity={0.05} />
                  <Edges color={hoveredLayer === 'crust' ? "#ffffff" : (structure.crust.color || '#8b5a2b')} threshold={15} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                  <ringGeometry args={[mantleR, crustR, 64, 1, Math.PI / 2, Math.PI / 2]} />
                  <meshStandardMaterial color={structure.crust.color || '#8b5a2b'} side={THREE.DoubleSide} emissive={structure.crust.color || '#8b5a2b'} emissiveIntensity={0.05} />
                  <Edges color={hoveredLayer === 'crust' ? "#ffffff" : (structure.crust.color || '#8b5a2b')} threshold={15} />
                </mesh>
              </group>
            )}

            {/* Mantle: upper mantle if split, otherwise the whole mantle */}
            <Shell
              innerR={lowerMantleR ?? coreR}
              outerR={mantleR}
              color={structure.mantle.color || "#ffaa00"}
              hoverKey={mantleHasSplit ? 'upperMantle' : 'mantle'}
              hoveredLayer={hoveredLayer}
              setHoveredLayer={setHoveredLayer}
            />

            {/* Lower mantle (optional sub-layer) */}
            {mantleHasSplit && lowerMantleR !== undefined && structure.mantle.lowerMantle && (
              <Shell
                innerR={coreR}
                outerR={lowerMantleR}
                color={structure.mantle.lowerMantle.color || "#ffaa00"}
                hoverKey="lowerMantle"
                hoveredLayer={hoveredLayer}
                setHoveredLayer={setHoveredLayer}
              />
            )}

            {/* Core: outer core if split, otherwise the whole core */}
            <Shell
              innerR={innerCoreR ?? 0}
              outerR={coreR}
              color={structure.core.color || "#ececec"}
              hoverKey={coreHasSplit ? 'outerCore' : 'core'}
              hoveredLayer={hoveredLayer}
              setHoveredLayer={setHoveredLayer}
            />

            {/* Inner core (optional sub-layer) */}
            {coreHasSplit && innerCoreR !== undefined && structure.core.innerCore && (
              <Shell
                innerR={0}
                outerR={innerCoreR}
                color={structure.core.innerCore.color || "#ececec"}
                hoverKey="innerCore"
                hoveredLayer={hoveredLayer}
                setHoveredLayer={setHoveredLayer}
              />
            )}
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

function Moon({ moon, planetSize, planetName, orbitMode, axisRef }: { moon: MoonData, planetSize: number, planetName: string, orbitMode: string, axisRef: React.RefObject<BodyAxis | null> }) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (ref.current) {
        if (orbitMode === 'RealLive') {
           try {
               const now = new Date(simulationState.dateMs ?? Date.now());

               let vecEqj: Vector | null = null;

               if (planetName === 'Earth' && moon.name === 'Moon') {
                   vecEqj = GeoMoon(now);
               } else if (planetName === 'Jupiter') {
                   const jm = JupiterMoons(now);
                   const galileanMoons: Record<string, StateVector> = { io: jm.io, europa: jm.europa, ganymede: jm.ganymede, callisto: jm.callisto };
                   const sv = galileanMoons[moon.name.toLowerCase()];
                   vecEqj = sv ? new Vector(sv.x, sv.y, sv.z, sv.t) : null;
               }

               if (vecEqj) {
                   const rotMatrix = Rotation_EQJ_ECL();
                   const vecEcl = RotateVector(rotMatrix, vecEqj);

                   const X = vecEcl.x;
                   const Y = vecEcl.z;
                   const Z = -vecEcl.y;

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
