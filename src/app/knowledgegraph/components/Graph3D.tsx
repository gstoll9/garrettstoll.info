'use client'
import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

export type GraphNode = { id: string; x: number; y: number; z: number; vx: number; vy: number; vz: number };
export type GraphLink = { source: string; target: string; relation: string };

function GraphPhysics({ nodes, links, isSimulating }: { nodes: GraphNode[], links: GraphLink[], isSimulating: boolean }) {
  useFrame(() => {
    if (!isSimulating) return;
    const damping = 0.85;
    const ctrStrength = 0.05;

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const n1 = nodes[i];
            const n2 = nodes[j];
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            const dz = n1.z - n2.z;
            const distSq = dx*dx + dy*dy + dz*dz || 0.1;
            if (distSq < 2500) { // Limit repulsion distance
                const dist = Math.sqrt(distSq);
                const force = 150 / distSq;
                n1.vx += (dx/dist) * force; n1.vy += (dy/dist) * force; n1.vz += (dz/dist) * force;
                n2.vx -= (dx/dist) * force; n2.vy -= (dy/dist) * force; n2.vz -= (dz/dist) * force;
            }
        }
    }

    // Attraction
    links.forEach(link => {
        const s = nodes.find(n => n.id === link.source);
        const t = nodes.find(n => n.id === link.target);
        if (s && t) {
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dz = t.z - s.z;
            const distSq = dx*dx + dy*dy + dz*dz || 0.1;
            const dist = Math.sqrt(distSq);
            const force = (dist - 15) * 0.05;
            s.vx += (dx/dist) * force; s.vy += (dy/dist) * force; s.vz += (dz/dist) * force;
            t.vx -= (dx/dist) * force; t.vy -= (dy/dist) * force; t.vz -= (dz/dist) * force;
        }
    });

    // Update coordinates
    nodes.forEach(n => {
        // Gravity to origin
        n.vx -= n.x * ctrStrength; n.vy -= n.y * ctrStrength; n.vz -= n.z * ctrStrength;
        n.vx *= damping; n.vy *= damping; n.vz *= damping;
        n.x += n.vx; n.y += n.vy; n.z += n.vz;
    });
  });
  return null;
}

function GraphRender({ nodes, links, filterText, hiddenNodes, hiddenRelations, relationColors }: { nodes: GraphNode[], links: GraphLink[], filterText: string, hiddenNodes: Set<string>, hiddenRelations: Set<string>, relationColors: Record<string, string> }) {
  const nodesRef = useRef<Record<string, THREE.Group | null>>({});
  const lineRefs = useRef<Record<string, THREE.Line | null>>({});
  const textRefs = useRef<Record<string, THREE.Group | null>>({});

  const visibleNodes = useMemo(() => {
    let filtered = nodes;
    if (filterText) {
      const ft = filterText.toLowerCase();
      const connectedNodes = new Set<string>();
      links.forEach(l => {
        if (l.relation.toLowerCase().includes(ft) || l.source.toLowerCase().includes(ft) || l.target.toLowerCase().includes(ft)) {
          connectedNodes.add(l.source);
          connectedNodes.add(l.target);
        }
      });
      filtered = filtered.filter(n => n.id.toLowerCase().includes(ft) || connectedNodes.has(n.id));
    }
    return filtered.filter(n => !hiddenNodes.has(n.id));
  }, [nodes, links, filterText, hiddenNodes]);

  const visibleLinks = useMemo(() => {
    let filtered = links;
    if (filterText) {
      const ft = filterText.toLowerCase();
      filtered = filtered.filter(l => l.relation.toLowerCase().includes(ft) || l.source.toLowerCase().includes(ft) || l.target.toLowerCase().includes(ft));
    }
    return filtered.filter(l => !hiddenNodes.has(l.source) && !hiddenNodes.has(l.target) && !hiddenRelations.has(l.relation));
  }, [links, filterText, hiddenNodes, hiddenRelations]);

  // Keep arrays of typed geometry attributes to avoid remounting lines
  useFrame(() => {
    visibleNodes.forEach(node => {
        const el = nodesRef.current[node.id];
        if (el) el.position.set(node.x, node.y, node.z);
    });
    
    visibleLinks.forEach((link, idx) => {
        const s = nodes.find(n => n.id === link.source);
        const t = nodes.find(n => n.id === link.target);
        
        const lineEl = lineRefs.current[`${link.source}-${link.target}-${idx}`];
        if (s && t && lineEl && lineEl.geometry) {
             const geom = lineEl.geometry;
             const positions = geom.attributes.position.array as Float32Array;
             positions[0] = s.x; positions[1] = s.y; positions[2] = s.z;
             positions[3] = t.x; positions[4] = t.y; positions[5] = t.z;
             geom.attributes.position.needsUpdate = true;
        }

        const textEl = textRefs.current[`${link.source}-${link.target}-${idx}`];
        if (s && t && textEl) {
             textEl.position.set((s.x + t.x) / 2, (s.y + t.y) / 2, (s.z + t.z) / 2);
        }
    });
  });

  return (
    <group>
      {visibleNodes.map(node => (
        <group key={node.id} ref={(el) => {nodesRef.current[node.id] = el;}}>
          <mesh>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color="#4488ff" />
          </mesh>
          <Text position={[0, 1.5, 0]} fontSize={1} color="white" outlineWidth={0.05} outlineColor="black">{node.id}</Text>
        </group>
      ))}
      {visibleLinks.map((link, idx) => {
         const lineKey = `${link.source}-${link.target}-${idx}`;
         const color = relationColors[link.relation] || "#ffffff";
         return (
            <group key={lineKey}>
              <line ref={(el) => {lineRefs.current[lineKey] = el as any;}}>
                <bufferGeometry>
                  <bufferAttribute attach="attributes-position" args={[new Float32Array(6), 3]} />
                </bufferGeometry>
                <lineBasicMaterial color={color} opacity={0.5} transparent />
              </line>
              <Text ref={(el) => {textRefs.current[lineKey] = el;}} fontSize={0.6} color={color} outlineWidth={0.05} outlineColor="black">
                {link.relation}
              </Text>
            </group>
         );
      })}
    </group>
  );
}

export default function Graph3D({ nodes, links, filterText, isSimulating, hiddenNodes, hiddenRelations, relationColors }: { nodes: GraphNode[], links: GraphLink[], filterText: string, isSimulating: boolean, hiddenNodes: Set<string>, hiddenRelations: Set<string>, relationColors: Record<string, string> }) {
  return (
    <Canvas camera={{ position: [0, 0, 80], fov: 60 }}>
      {/* Background */}
      <color attach="background" args={['#050505']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[20, 20, 20]} intensity={1.5} />
      <GraphPhysics nodes={nodes} links={links} isSimulating={isSimulating} />
      <GraphRender nodes={nodes} links={links} filterText={filterText} hiddenNodes={hiddenNodes} hiddenRelations={hiddenRelations} relationColors={relationColors} />
      <OrbitControls makeDefault />
    </Canvas>
  );
}