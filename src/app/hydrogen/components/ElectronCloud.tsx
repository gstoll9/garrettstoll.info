"use client"
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  generateProbabilityGrid,
  findProbabilityThreshold,
  marchingCubes,
  wavefunction
} from '../utils/hydrogenCloud';
import { effectiveNuclearCharge, approximateOrbitalEnergyEV, outermostSubshell } from '../utils/slater';
import { Subshell } from '../data/elements';

const HYDROGEN_CONFIG: Subshell[] = [{ n: 1, l: 0, electrons: 1 }];

interface ElectronCloudProps {
  n?: number;
  l?: number;
  m?: number;
  onStateChange?: (state: { n: number; l: number; m: number }) => void;
  gridResolution?: number;
  probabilityThreshold?: number;
  // The selected element (defaults to hydrogen, Z=1, so this component behaves exactly as
  // before when used without these props). `configuration` is that element's ground-state
  // electron configuration, used to compute each subshell's Slater effective nuclear charge.
  Z?: number;
  elementSymbol?: string;
  configuration?: Subshell[];
  realIonizationEnergyEV?: number;
}

// Projects a world-space length (along X at origin) to screen pixels each frame
// and reports it via onWidth, throttled to only fire when it changes by >1px
function ScaleBarMeasure({ scaleLen, onWidth }: { scaleLen: number; onWidth: (w: number) => void }) {
  const { camera, size } = useThree();
  const lastPx = useRef(0);
  const v1 = useMemo(() => new THREE.Vector3(-scaleLen / 2, 0, 0), [scaleLen]);
  const v2 = useMemo(() => new THREE.Vector3( scaleLen / 2, 0, 0), [scaleLen]);
  useFrame(() => {
    const p1 = v1.clone().project(camera);
    const p2 = v2.clone().project(camera);
    const px = Math.abs((p2.x - p1.x) / 2 * size.width);
    if (Math.abs(px - lastPx.current) > 1) {
      lastPx.current = px;
      onWidth(px);
    }
  });
  return null;
}

// Camera auto-framing: orbital radius scales as n²a₀, so pull back proportionally
function CameraRig({ n, controlsRef }: { n: number; controlsRef: React.RefObject<any> }) {
  const { camera } = useThree();
  useEffect(() => {
    const dist = Math.max(5, n * n * 3.2);
    const far = dist * 16;
    camera.position.set(dist * 0.78, dist * 0.5, dist * 0.64);
    camera.lookAt(0, 0, 0);
    (camera as THREE.PerspectiveCamera).far = far;
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [camera, n, controlsRef]);
  return null;
}

export default function ElectronCloud({
  n: initialN = 2,
  l: initialL = 1,
  m: initialM = 0,
  onStateChange,
  gridResolution = 48,
  probabilityThreshold = 0.50,
  Z = 1,
  elementSymbol = 'H',
  configuration = HYDROGEN_CONFIG,
  realIonizationEnergyEV,
}: ElectronCloudProps) {
  const [n, setN] = useState(initialN);
  const [l, setL] = useState(initialL);
  const [m, setM] = useState(initialM);
  const [threshold, setThreshold] = useState(probabilityThreshold);
  const [showPhase, setShowPhase] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLowerOrbital, setShowLowerOrbital] = useState(false);
  const orbitControlsRef = useRef<any>(null);

  // Keep local controls in sync when parent-selected state changes from the text panel.
  useEffect(() => {
    const nextN = Math.max(1, Math.floor(initialN) || 1);
    const nextL = Math.max(0, Math.min(Math.floor(initialL) || 0, nextN - 1));
    const nextM = Math.max(-nextL, Math.min(Math.floor(initialM) || 0, nextL));
    setN(nextN);
    setL(nextL);
    setM(nextM);
  }, [initialN, initialL, initialM]);

  const orbitalNames = ['s', 'p', 'd', 'f', 'g'];

  // The selected (n,l,m) rendered as a hydrogenic orbital with this subshell's Slater
  // effective nuclear charge — this is the approximation at the heart of the "all atoms"
  // model: no exact multi-electron solution exists, so each subshell is modeled as a
  // hydrogen-like orbital with Z_eff = Z - sigma instead of the real Z=1 hydrogen orbital.
  const renderN = n;
  const renderL = l;
  const renderM = m;
  const renderZ = effectiveNuclearCharge(Z, configuration, n, l);

  const outermost = useMemo(() => outermostSubshell(configuration), [configuration]);
  const isOutermostSelected = outermost.n === n && outermost.l === l;
  const approxOrbitalEnergyEV = approximateOrbitalEnergyEV(Z, configuration, n, l);

  const [scaleBarPx, setScaleBarPx] = useState(80);

  // Compute nice round scale length for renderN
  const scaleLen = useMemo(() => {
    const raw = renderN * renderN * 5 / 3;
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 0.1))));
    const niceVals = [1, 2, 5, 10];
    return (niceVals.find(v => v * mag >= raw) ?? 10) * mag;
  }, [renderN]);

  // Lower orbital preview: the (n-1) shell, rendered with *its own* Slater Z_eff (inner
  // subshells are screened less, so they're always more tightly bound than the outer one).
  const canShowLower = renderN > 1;
  const lowerN = renderN - 1;
  // For s orbitals (l=0) show the highest-l of the lower shell (e.g. 4s → 3d, 3s → 2p)
  // For other orbitals keep the same l, clamped to the lower shell's max
  const lowerL = renderL === 0 ? lowerN - 1 : Math.min(renderL, lowerN - 1);
  const lowerM = Math.abs(renderM) <= lowerL ? renderM : 0;
  const lowerZ = effectiveNuclearCharge(Z, configuration, lowerN, lowerL);

  const lowerGeometry = useMemo(() => {
    if (!showLowerOrbital || !canShowLower) return null;
    const { values, gridSize, extent } = generateProbabilityGrid(lowerN, lowerL, lowerM, gridResolution, lowerZ);
    const isovalue = findProbabilityThreshold(values, threshold);
    const { positions, indices } = marchingCubes(values, gridSize, extent, isovalue);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }, [showLowerOrbital, canShowLower, lowerN, lowerL, lowerM, gridResolution, threshold, lowerZ]);

  // Generate the isosurface mesh with phase colors
  const surfaceGeometry = useMemo(() => {
    setIsGenerating(true);
    
    // Generate probability density grid
    const { values, gridSize, extent } = generateProbabilityGrid(renderN, renderL, renderM, gridResolution, renderZ);
    
    // Find the isovalue that encloses the target probability
    const isovalue = findProbabilityThreshold(values, threshold);
    
    // Extract isosurface using marching cubes
    const { positions, indices } = marchingCubes(values, gridSize, extent, isovalue);
    
    // Compute per-vertex phase colors
    const colors: number[] = [];
    // Colorblind-safe cyclic palette (blue–orange, safe for deuteranopia/protanopia/tritanopia)
    // Stops at t=[0, 0.25, 0.5, 0.75, 1.0] where t = (phase / (2π) + 0.5)
    const cbStops: [number, number, number][] = [
      [0.106, 0.165, 0.541], // #1B2A8A deep blue       t=0.00  (phase = -π)
      [0.533, 0.800, 0.933], // #88CCEE light cyan-blue  t=0.25  (phase = -π/2)
      [0.902, 0.478, 0.000], // #E67A00 deep orange      t=0.50  (phase = 0)
      [0.988, 0.800, 0.604], // #FCCD9A pale peach       t=0.75  (phase = +π/2)
      [0.106, 0.165, 0.541], // #1B2A8A deep blue       t=1.00  (phase = +π, wraps)
    ];

    function phaseToColor(phase: number): [number, number, number] {
      const t = (phase / (2 * Math.PI) + 0.5); // 0 to 1
      const scaled = t * (cbStops.length - 1);
      const lo = Math.floor(scaled);
      const hi = Math.min(lo + 1, cbStops.length - 1);
      const frac = scaled - lo;
      const a = cbStops[lo];
      const b = cbStops[hi];
      return [
        a[0] + (b[0] - a[0]) * frac,
        a[1] + (b[1] - a[1]) * frac,
        a[2] + (b[2] - a[2]) * frac,
      ];
    }

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      const r = Math.sqrt(x * x + y * y + z * z);
      const theta = r > 0 ? Math.acos(Math.max(-1, Math.min(1, z / r))) : 0;
      const phi = Math.atan2(y, x);
      const psi = wavefunction(r, theta, phi, renderN, renderL, renderM, renderZ);
      const phase = Math.atan2(psi.imag, psi.real); // -π to π
      const [cr, cg, cb] = phaseToColor(phase);
      colors.push(cr, cg, cb);
    }
    
    // Create Three.js geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    setIsGenerating(false);
    return geometry;
  }, [renderN, renderL, renderM, gridResolution, threshold, renderZ]);

  const orbitalName = renderL < orbitalNames.length ? orbitalNames[renderL] : `l${renderL}`;
  const stateLabel = `${renderN}${orbitalName}${renderM !== 0 ? ` (m=${renderM})` : ''}`;

  const handleNChange = (newN: number) => {
    const nextN = newN;
    const nextL = l >= newN ? newN - 1 : l;
    const nextM = Math.abs(m) > nextL ? 0 : m;
    setN(nextN);
    setL(nextL);
    setM(nextM);
    onStateChange?.({ n: nextN, l: nextL, m: nextM });
  };

  const handleLChange = (newL: number) => {
    const nextL = newL;
    const nextM = Math.abs(m) > newL ? 0 : m;
    setL(nextL);
    setM(nextM);
    onStateChange?.({ n, l: nextL, m: nextM });
    if (n > 1) setShowLowerOrbital(true);
  };

  return (
    <div className="hydrogenCloudRoot">
      {/* Controls */}
      <div className="hydrogenCloudControls">
        <h3 style={{ margin: '0 0 6px 0', fontSize: '14px' }}>
          {elementSymbol} (Z={Z}) — {stateLabel}
        </h3>

        {/* Approximation vs. real-measurement comparison — the core of the all-atoms
            model: this subshell modeled as a hydrogenic orbital with Slater's Z_eff,
            compared against the element's real measured first ionization energy. */}
        <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '12px', lineHeight: '1.6' }}>
          Z<sub>eff</sub> (Slater) = <strong>{renderZ.toFixed(3)}</strong><br />
          Approx. orbital energy = <strong>{approxOrbitalEnergyEV.toFixed(2)} eV</strong>
          {isOutermostSelected && realIonizationEnergyEV !== undefined && (
            <>
              <br />
              Approx. ionization energy ≈ <strong>{(-approxOrbitalEnergyEV).toFixed(2)} eV</strong>
              {' '}(real: <strong>{realIonizationEnergyEV.toFixed(3)} eV</strong>)
            </>
          )}
        </div>

        {/* Quantum number dot-track selectors */}
        {(() => {
          const lLocked = n === 1;
          const mLocked = l === 0;

          function DotTrack({
            label, values, selected, onSelect, locked, hint,
          }: {
            label: string;
            values: number[];
            selected: number;
            onSelect: (v: number) => void;
            locked: boolean;
            hint?: string;
          }) {
            const R = 6; // circle radius px
            const GAP = 22; // centre-to-centre spacing px
            const trackW = Math.max(0, (values.length - 1) * GAP);
            const svgW = trackW + R * 2;
            const svgH = R * 2 + 2;
            return (
              <div style={{ marginBottom: '12px', opacity: locked ? 0.35 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
                <div style={{ marginBottom: '5px', fontSize: '12px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span>{label}:</span>
                  <span style={{ fontWeight: 'bold' }}>{selected}</span>
                  {hint && <span style={{ fontSize: '10px', opacity: 0.55, fontStyle: 'italic' }}>{hint}</span>}
                </div>
                <svg width={svgW} height={svgH} style={{ display: 'block', overflow: 'visible' }}>
                  {/* connecting line */}
                  {values.length > 1 && (
                    <line
                      x1={R} y1={R + 1}
                      x2={R + trackW} y2={R + 1}
                      stroke="white" strokeWidth={1.5} strokeOpacity={0.4}
                    />
                  )}
                  {values.map((v, i) => {
                    const cx = R + i * GAP;
                    const cy = R + 1;
                    const active = v === selected;
                    return (
                      <circle
                        key={v}
                        cx={cx} cy={cy} r={R}
                        fill={active ? 'white' : 'transparent'}
                        stroke="white"
                        strokeWidth={active ? 0 : 1.5}
                        strokeOpacity={active ? 1 : 0.5}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onSelect(v)}
                      />
                    );
                  })}
                </svg>
              </div>
            );
          }

          const nValues = [1, 2, 3, 4];
          const lValues = Array.from({ length: n }, (_, i) => i);
          const mValues = Array.from({ length: 2 * l + 1 }, (_, i) => -l + i);

          return (
            <>
              <DotTrack
                label="n" values={nValues} selected={n}
                onSelect={handleNChange} locked={false}
              />
              <DotTrack
                label="l" values={lValues} selected={l}
                onSelect={handleLChange} locked={lLocked}
                hint={n === 1 ? 's only' : undefined}
              />
              <DotTrack
                label="m" values={mValues} selected={m}
                onSelect={(newM) => {
                  setM(newM);
                  onStateChange?.({ n, l, m: newM });
                }} locked={mLocked}
                hint={l === 0 ? 'm=0' : undefined}
              />
            </>
          );
        })()}

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

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: canShowLower ? 'pointer' : 'default', opacity: canShowLower ? 1 : 0.35 }}>
            <input
              type="checkbox"
              checked={showLowerOrbital}
              disabled={!canShowLower}
              onChange={(e) => setShowLowerOrbital(e.target.checked)}
            />
            Show lower orbital
            {canShowLower && (
              <span style={{ opacity: 0.6, fontSize: '11px' }}>
                ({lowerN}{orbitalNames[lowerL] ?? `l${lowerL}`})
              </span>
            )}
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showPhase}
              onChange={(e) => setShowPhase(e.target.checked)}
            />
            Show Phase
          </label>
        </div>

        {showPhase && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', marginBottom: '4px', opacity: 0.8 }}>Phase (arg ψ):</div>
            <div style={{
              height: '12px',
              borderRadius: '4px',
              background: 'linear-gradient(to right, #1B2A8A, #88CCEE, #E67A00, #FCCD9A, #1B2A8A)',
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>
              <span>−π</span><span>−π/2</span><span>0</span><span>+π/2</span><span>+π</span>
            </div>
          </div>
        )}

        <div style={{ fontSize: '12px', opacity: 0.8 }}>
          {isGenerating ? 'Generating surface...' : `Grid: ${gridResolution}³`}
        </div>
      </div>

      {/* 2D scale bar overlay */}
      <div style={{
        position: 'absolute',
        bottom: '18px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3px',
        pointerEvents: 'none',
      }}>
        {/* bar with end ticks */}
        <svg
          width={scaleBarPx + 2}
          height={14}
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* left tick */}
          <line x1={1} y1={0} x2={1} y2={13} stroke="white" strokeWidth={1.5} strokeOpacity={0.7} />
          {/* horizontal bar */}
          <line x1={1} y1={7} x2={scaleBarPx + 1} y2={7} stroke="white" strokeWidth={1.5} strokeOpacity={0.7} />
          {/* right tick */}
          <line x1={scaleBarPx + 1} y1={0} x2={scaleBarPx + 1} y2={13} stroke="white" strokeWidth={1.5} strokeOpacity={0.7} />
        </svg>
        <span style={{
          color: 'white', fontSize: '11px', fontFamily: 'monospace',
          opacity: 0.75, whiteSpace: 'nowrap',
        }}>
          {scaleLen} a₀ &nbsp;({(scaleLen * 0.529).toFixed(2)} Å)
        </span>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [10, 4, 10], far: 180 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#02060f'), 1);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
        style={{ background: 'radial-gradient(circle at 50% 28%, #08162a 0%, #040b16 45%, #010307 100%)' }}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={['#03070f', 50, 220]} />
          <CameraRig n={renderN} controlsRef={orbitControlsRef} />
          <ScaleBarMeasure scaleLen={scaleLen} onWidth={setScaleBarPx} />
          <OrbitControls
            ref={orbitControlsRef}
            enableDamping
            dampingFactor={0.08}
            minDistance={Math.max(3.5, renderN * renderN * 1.8)}
            maxDistance={renderN * renderN * 16}
          />

          {/* Lower orbital — two passes:
               1. renderOrder=0 depthTest=false: faint tint visible everywhere (outside)
               2. renderOrder=3 GreaterEqualDepth: bright only where it is BEHIND the
                  already-drawn main orbital surface (inside the volume) */}
          {lowerGeometry && (
            <>
              {/* faint outside pass */}
              <mesh geometry={lowerGeometry} renderOrder={0}>
                <meshStandardMaterial
                  color="#FFB347"
                  emissive="#FFB347"
                  emissiveIntensity={0.1}
                  transparent
                  opacity={0.08}
                  side={THREE.DoubleSide}
                  depthTest={false}
                  depthWrite={false}
                />
              </mesh>
              {/* bright inside pass — draws only where fragment depth >= stored depth */}
              <mesh geometry={lowerGeometry} renderOrder={3}>
                <meshStandardMaterial
                  color="#FFB347"
                  emissive="#FFB347"
                  emissiveIntensity={0.3}
                  transparent
                  opacity={0.55}
                  side={THREE.DoubleSide}
                  depthFunc={THREE.GreaterEqualDepth}
                  depthWrite={false}
                />
              </mesh>
            </>
          )}

          {/* Orbital Surface */}
          <mesh geometry={surfaceGeometry}>
            <meshPhysicalMaterial
              vertexColors={showPhase}
              color={showPhase ? '#b8d6ff' : '#72d9ff'}
              emissive={showPhase ? '#36527c' : '#4dc6ef'}
              emissiveIntensity={showPhase ? 0.22 : 0.34}
              transparent
              opacity={0.86}
              side={THREE.DoubleSide}
              metalness={0.03}
              roughness={0.26}
              clearcoat={0.45}
              clearcoatRoughness={0.42}
            />
          </mesh>

          {/* Wireframe overlay for better visibility */}
          <lineSegments geometry={surfaceGeometry}>
            <lineBasicMaterial color="white" opacity={0.08} transparent />
          </lineSegments>

          {/* Nucleus */}
          <mesh>
            <sphereGeometry args={[Math.min(0.3 + Z * 0.01, 0.6), 16, 16]} />
            <meshPhysicalMaterial
              color={Z === 1 ? 'red' : '#FFC107'}
              roughness={0.32}
              metalness={0.08}
            />
          </mesh>

          {/* Lighting */}
          <ambientLight intensity={0.42} />
          <hemisphereLight args={['#9dc4ff', '#05080f', 0.42]} />
          <pointLight position={[14, 12, 18]} intensity={0.95} color="#c8ddff" />
          <pointLight position={[-16, -10, -12]} intensity={0.38} color="#98b8ff" />

        </Suspense>
      </Canvas>
    </div>
  );
}
