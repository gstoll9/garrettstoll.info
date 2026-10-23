import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { Bvh, OrbitControls, useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ViewMode } from '../page';
import { GROUPS, GroupId, PARTS } from '../data/regions';

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
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}

function Brain({ viewMode, hiddenGroups, hoveredId, selectedId, onHover, onSelect }: Props) {
  const { scene } = useGLTF(MODEL_URL);

  // One material per mesh so each can be highlighted on its own. Normals aren't stored in the GLB.
  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const part = PARTS[obj.name];
      obj.geometry.computeVertexNormals();
      obj.material = new THREE.MeshStandardMaterial({
        color: part ? GROUPS[part.group].color : '#888888',
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
    const thalamus = meshes.find((m) => m.name === 'FMA258716');
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
      const part = PARTS[mesh.name];
      mesh.visible = !part || !hiddenGroups.has(part.group);
      mat.clippingPlanes = clippingPlanes;
      const lit = mesh.name === hoveredId || mesh.name === selectedId;
      mat.emissive.set(lit ? mat.color : '#000000');
      mat.emissiveIntensity = mesh.name === selectedId ? 0.55 : 0.35;
      mat.needsUpdate = true;
    }
  }, [meshes, hiddenGroups, clippingPlanes, hoveredId, selectedId]);

  // Ignore hits on the clipped-away part of a mesh.
  const firstVisibleHit = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    e.intersections.find((hit) => clippingPlanes.every((p) => p.distanceToPoint(hit.point) >= 0))?.object.name ?? null;

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

function CameraRig({ viewMode }: { viewMode: ViewMode }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  useEffect(() => {
    camera.position.set(...CAMERA[viewMode]);
    controls?.target.set(0, 0, 0);
    controls?.update();
  }, [camera, controls, viewMode]);
  return null;
}

export default function BrainModel(props: Props) {
  return (
    <Canvas
      camera={{ position: CAMERA.full, fov: 40, near: 0.05, far: 50 }}
      gl={{ localClippingEnabled: true }}
      onPointerMissed={() => props.onSelect(null)}
    >
      <color attach="background" args={['#111111']} />
      <hemisphereLight args={['#ffffff', '#303040', 1.1]} />
      <directionalLight position={[-3, 4, 3]} intensity={1.6} />
      <directionalLight position={[3, -1, -3]} intensity={0.6} />
      <Bvh firstHitOnly={false}>
        <Brain {...props} />
      </Bvh>
      <CameraRig viewMode={props.viewMode} />
      <OrbitControls makeDefault enablePan minDistance={1} maxDistance={8} />
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);
