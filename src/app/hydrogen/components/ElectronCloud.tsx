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

interface ElectronCloudProps {
  n?: number;
  l?: number;
  m?: number;
  gridResolution?: number;
  probabilityThreshold?: number;
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
function CameraRig({ n }: { n: number }) {
  const { camera } = useThree();
  useEffect(() => {
    const dist = n * n * 5;      // orbital maxRadius = n²×5; 6.5 gives tighter framing
    const far  = dist * 6;
    camera.position.set(dist, 0, 0);
    (camera as THREE.PerspectiveCamera).far = far;
    camera.updateProjectionMatrix();
  }, [camera, n]);
  return null;
}

export default function ElectronCloud({ 
  n: initialN = 2, 
  l: initialL = 1, 
  m: initialM = 0,
  gridResolution = 48,
  probabilityThreshold = 0.90
}: ElectronCloudProps) {
  const [n, setN] = useState(initialN);
  const [l, setL] = useState(initialL);
  const [m, setM] = useState(initialM);
  const [threshold, setThreshold] = useState(probabilityThreshold);
  const [showPhase, setShowPhase] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [nucleus, setNucleus] = useState<'H' | 'He'>('H');
  const [showLowerOrbital, setShowLowerOrbital] = useState(false);

  // Helium excited-state controls — outer electron quantum numbers
  const [heExcited, setHeExcited] = useState(false);
  const [nOuter, setNOuter] = useState(2);
  const [lOuter, setLOuter] = useState(0);
  const [mOuter, setMOuter] = useState(0);

  // Variational Z_eff for helium ground state: minimises ⟨E⟩ for ψ = ψ_{1s}^{Z_eff}(r₁)ψ_{1s}^{Z_eff}(r₂)
  // Optimal Z_eff = Z − 5/16 = 2 − 5/16 = 27/16 ≈ 1.6875
  const Z_EFF_HE = 27 / 16;

  // What to actually render:
  // Ground He  → 1s orbital with Z_eff = 27/16
  // Excited He → outer electron (nOuter, lOuter, mOuter) with Z_eff ≈ 1
  //              (inner 1s electron fully screens one unit of charge)
  const isHeExcited = nucleus === 'He' && heExcited;
  const renderN = isHeExcited ? nOuter : n;
  const renderL = isHeExcited ? lOuter : l;
  const renderM = isHeExcited ? mOuter : m;
  const renderZ = nucleus === 'He' ? (heExcited ? 1.0 : Z_EFF_HE) : 1;

  // Approximate energy for display
  const heEnergy = heExcited
    ? (-54.4 - 13.6 / (nOuter * nOuter)).toFixed(1)
    : '-77.5';

  const orbitalNames = ['s', 'p', 'd', 'f', 'g'];
  const heConfig = heExcited
    ? `1s ${nOuter}${orbitalNames[lOuter] ?? `l${lOuter}`}${mOuter !== 0 ? ` (m=${mOuter})` : ''}`
    : '1s²';

  const handleNucleusChange = (newNucleus: 'H' | 'He') => {
    setNucleus(newNucleus);
    if (newNucleus === 'He') {
      setN(1); setL(0); setM(0);
      setHeExcited(false);
    }
  };

  const handleNOuterChange = (newN: number) => {
    setNOuter(newN);
    if (lOuter >= newN) setLOuter(newN - 1);
    if (Math.abs(mOuter) > lOuter) setMOuter(0);
  };

  const handleLOuterChange = (newL: number) => {
    setLOuter(newL);
    if (Math.abs(mOuter) > newL) setMOuter(0);
    setShowLowerOrbital(true);
  };

  const [scaleBarPx, setScaleBarPx] = useState(80);

  // Compute nice round scale length for renderN
  const scaleLen = useMemo(() => {
    const raw = renderN * renderN * 5 / 3;
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 0.1))));
    const niceVals = [1, 2, 5, 10];
    return (niceVals.find(v => v * mag >= raw) ?? 10) * mag;
  }, [renderN]);

  // Lower orbital: for H show (n-1) shell; for He excited show inner 1s (Z=2)
  const canShowLower = (nucleus === 'H' && renderN > 1) || isHeExcited;
  const lowerN = isHeExcited ? 1 : renderN - 1;
  // For s orbitals (l=0) show the highest-l of the lower shell (e.g. 4s → 3d, 3s → 2p)
  // For other orbitals keep the same l, clamped to the lower shell's max
  const lowerL = isHeExcited ? 0 : (renderL === 0 ? lowerN - 1 : Math.min(renderL, lowerN - 1));
  const lowerM = isHeExcited ? 0 : (Math.abs(renderM) <= lowerL ? renderM : 0);
  const lowerZ = isHeExcited ? 2.0 : 1.0;

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
    setN(newN);
    if (l >= newN) setL(newN - 1);
    if (Math.abs(m) > l) setM(0);
  };

  const handleLChange = (newL: number) => {
    setL(newL);
    if (Math.abs(m) > newL) setM(0);
    if (n > 1) setShowLowerOrbital(true);
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '600px', position: 'relative' }}>
      {/* Controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 10,
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace',
        maxWidth: '250px'
      }}>
        {/* Atom selector */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {(['H', 'He'] as const).map((atom) => (
            <button
              key={atom}
              onClick={() => handleNucleusChange(atom)}
              style={{
                flex: 1,
                padding: '4px 0',
                borderRadius: '4px',
                border: `1px solid ${nucleus === atom ? '#fff' : '#555'}`,
                background: nucleus === atom ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '13px',
              }}
            >
              {atom}
            </button>
          ))}
        </div>

        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
          {nucleus === 'He' ? `He  ${heConfig}` : `Quantum State: ${stateLabel}`}
        </h3>

        {nucleus === 'He' && (
          <>
            {/* Ground / Excited toggle */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {([false, true] as const).map((exc) => (
                <button
                  key={String(exc)}
                  onClick={() => setHeExcited(exc)}
                  style={{
                    flex: 1,
                    padding: '3px 0',
                    borderRadius: '4px',
                    border: `1px solid ${heExcited === exc ? '#fff' : '#555'}`,
                    background: heExcited === exc ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                >
                  {exc ? 'Excited' : 'Ground'}
                </button>
              ))}
            </div>

            {/* Energy info */}
            <div style={{ fontSize: '11px', opacity: 0.75, marginBottom: '10px', lineHeight: '1.6' }}>
              {heExcited ? (
                <>
                  Outer e⁻: Z<sub>eff</sub> = 1<br />
                  (inner 1s screens one charge unit)<br />
                  E ≈ −54.4 − 13.6/n² = <strong>{heEnergy} eV</strong>
                </>
              ) : (
                <>
                  ψ(r₁,r₂) = ψ<sub>1s</sub><sup>Z</sup>(r₁) ψ<sub>1s</sub><sup>Z</sup>(r₂)<br />
                  Z<sub>eff</sub> = 27/16 = <strong>{Z_EFF_HE.toFixed(4)}</strong><br />
                  E = −77.5 eV&nbsp;(exact: −79.0 eV)
                </>
              )}
            </div>

            {/* Outer electron sliders (excited only) */}
            {heExcited && (
              <>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>
                    Outer n: {nOuter}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="4"
                    value={nOuter}
                    onChange={(e) => handleNOuterChange(parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>
                    Outer l: {lOuter}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={nOuter - 1}
                    value={lOuter}
                    onChange={(e) => handleLOuterChange(parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>
                    Outer m: {mOuter}
                  </label>
                  <input
                    type="range"
                    min={-lOuter}
                    max={lOuter}
                    value={mOuter}
                    onChange={(e) => setMOuter(parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* Hydrogen quantum number dot-track selectors */}
        {(() => {
          const heDisabled = nucleus === 'He';
          const lLocked = heDisabled || n === 1;
          const mLocked = heDisabled || l === 0;

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
                onSelect={handleNChange} locked={heDisabled}
              />
              <DotTrack
                label="l" values={lValues} selected={l}
                onSelect={handleLChange} locked={lLocked}
                hint={n === 1 && !heDisabled ? 's only' : undefined}
              />
              <DotTrack
                label="m" values={mValues} selected={m}
                onSelect={setM} locked={mLocked}
                hint={l === 0 && !heDisabled ? 'm=0' : undefined}
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
      <Canvas camera={{ position: [9, 0, 0], far: 54 }} style={{ backgroundColor: "black" }}>
        <Suspense fallback={null}>
          <CameraRig n={renderN} />
          <ScaleBarMeasure scaleLen={scaleLen} onWidth={setScaleBarPx} />
          <OrbitControls maxDistance={renderN * renderN * 30} />

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
            <meshStandardMaterial 
              vertexColors={showPhase}
              color={showPhase ? undefined : "cyan"}
              emissive={showPhase ? undefined : "cyan"}
              emissiveIntensity={showPhase ? 0 : 0.2}
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
              metalness={0.1}
              roughness={0.5}
            />
          </mesh>

          {/* Wireframe overlay for better visibility */}
          <lineSegments geometry={surfaceGeometry}>
            <lineBasicMaterial color="white" opacity={0.08} transparent />
          </lineSegments>

          {/* Nucleus */}
          <mesh>
            <sphereGeometry args={[nucleus === 'He' ? 0.4 : 0.3, 16, 16]} />
            <meshStandardMaterial
              color={nucleus === 'He' ? '#FFC107' : 'red'}
              emissive={nucleus === 'He' ? '#FFC107' : 'red'}
              emissiveIntensity={0.8}
            />
          </mesh>

          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <pointLight position={[20, 20, 20]} intensity={0.8} />
          <pointLight position={[-20, -20, -20]} intensity={0.4} />

        </Suspense>
      </Canvas>
    </div>
  );
}
