import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { Bvh, OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ViewMode } from '../page';
import { GroupId, REGION_COLORS, Side, partFor } from '../data/regions';

const MODEL_URL = '/brainImages/brain.glb';

// Camera position for each view (model units: the brain is ~1.7 across, centered at the origin).
// Cut views look straight at the exposed face.
const CAMERA: Record<ViewMode, [number, number, number]> = {
  full: [-2.2, 1.0, 2.2],
  sagittal: [-3.2, 0.2, 0.01],
  coronal: [0, 0.2, 3.2],
  axial: [0, 3.2, -0.01], // anterior at the top of the screen
};

interface Props {
  viewMode: ViewMode;
  hiddenGroups: Set<GroupId>;
  hemisphere: Side | 'Both';
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}

function Brain({ viewMode, hiddenGroups, hemisphere, hoveredId, selectedId, onHover, onSelect }: Props) {
  const { scene } = useGLTF(MODEL_URL);

  // One material per mesh so each can be highlighted on its own. Normals aren't stored in the GLB.
  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const part = partFor(obj.name);
      obj.geometry.computeVertexNormals();
      obj.material = new THREE.MeshStandardMaterial({
        color: part ? REGION_COLORS[part.regionId] : '#888888',
        roughness: 0.65,
        metalness: 0,
        side: THREE.DoubleSide,
      });
      list.push(obj);
    });
    return list;
  }, [scene]);

  // Cut planes go through the thalamus, so coronal/axial views show the deep structures.
  const clippingPlanes = useMemo(() => {
    const thalamus = meshes.find((m) => m.name === 'L-thalamus');
    const c = thalamus ? new THREE.Box3().setFromObject(thalamus).getCenter(new THREE.Vector3()) : new THREE.Vector3();
    // three.js discards fragments on the plane's negative side.
    if (viewMode === 'sagittal') return [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)]; // keep left hemisphere
    if (viewMode === 'coronal') return [new THREE.Plane(new THREE.Vector3(0, 0, -1), c.z)]; // keep posterior
    if (viewMode === 'axial') return [new THREE.Plane(new THREE.Vector3(0, -1, 0), c.y)]; // keep inferior
    return [];
  }, [meshes, viewMode]);

  useEffect(() => {
    for (const mesh of meshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const part = partFor(mesh.name);
      mesh.visible = !part || (!hiddenGroups.has(part.region.group) && (hemisphere === 'Both' || part.side === hemisphere));
      mat.clippingPlanes = clippingPlanes;
      const lit = mesh.name === hoveredId || mesh.name === selectedId;
      mat.emissive.set(lit ? mat.color : '#000000');
      mat.emissiveIntensity = mesh.name === selectedId ? 0.55 : 0.35;
      // Draw the selection over anything in front of it, so regions picked from the list (often
      // deep or on the far side) are always visible.
      const xray = mesh.name === selectedId;
      mat.depthTest = !xray;
      mat.transparent = xray;
      mat.opacity = xray ? 0.9 : 1;
      mesh.renderOrder = xray ? 1 : 0;
      mat.needsUpdate = true;
    }
  }, [meshes, hiddenGroups, hemisphere, clippingPlanes, hoveredId, selectedId]);

  // Ignore hidden meshes and hits on the clipped-away part of a mesh.
  const firstVisibleHit = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    e.intersections.find((hit) => hit.object.visible && clippingPlanes.every((p) => p.distanceToPoint(hit.point) >= 0))
      ?.object.name ?? null;

  return (
    <primitive
      object={scene}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const id = firstVisibleHit(e);
        if (id !== hoveredId) onHover(id);
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(firstVisibleHit(e));
      }}
    />
  );
}

// Matches the bottom-sheet breakpoint in brain.css.
const NARROW_PX = 768;
// Share of the screen height the info sheet covers on narrow screens (36dvh + margin).
const SHEET_FRACTION = 0.38;

function CameraRig({ viewMode }: { viewMode: ViewMode }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const { width, height } = useThree((s) => s.size);
  const narrow = width <= NARROW_PX;

  // On narrow screens, shift the image up so the brain is centered in the area above the sheet.
  useEffect(() => {
    if (narrow) camera.setViewOffset(width, height, 0, (height * SHEET_FRACTION) / 2, width, height);
    else camera.clearViewOffset();
  }, [camera, narrow, width, height]);

  // Back the camera off until the brain (~1.7 units across, plus margin) fits the screen.
  const aspectBucket = Math.round((width / height) * 10) / 10;
  useEffect(() => {
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const visibleHeight = narrow ? 1 - SHEET_FRACTION : 1;
    const fitDistance = Math.max(0.95 / Math.tan(halfFov) / visibleHeight, 1.15 / (Math.tan(halfFov) * aspectBucket));
    const base = new THREE.Vector3(...CAMERA[viewMode]);
    camera.position.copy(base.setLength(Math.max(base.length(), fitDistance)));
    controls?.target.set(0, 0, 0);
    controls?.update();
  }, [camera, controls, viewMode, aspectBucket, narrow]);
  return null;
}

export default function BrainModel(props: Props) {
  // The GLB loads inside the Canvas, so the page's Suspense fallback never shows for it.
  const { active, progress } = useProgress();
  return (
    <>
      {active && <div className="brainLoading brainLoadingOverlay">Loading brain model… {Math.round(progress)}%</div>}
      <Canvas
        camera={{ position: CAMERA.full, fov: 40, near: 0.05, far: 50 }}
        gl={{ localClippingEnabled: true }}
        onPointerMissed={() => props.onSelect(null)}
      >
        <color attach="background" args={['#111111']} />
        <hemisphereLight args={['#ffffff', '#303040', 1.1]} />
        <directionalLight position={[-3, 4, 3]} intensity={1.2} />
        <directionalLight position={[3, -1, -3]} intensity={0.6} />
        <Bvh firstHitOnly={false}>
          <Brain {...props} />
        </Bvh>
        <CameraRig viewMode={props.viewMode} />
        <OrbitControls makeDefault enablePan minDistance={1} maxDistance={12} />
      </Canvas>
    </>
  );
}

useGLTF.preload(MODEL_URL);
