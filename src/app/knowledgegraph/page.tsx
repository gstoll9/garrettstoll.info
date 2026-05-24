'use client'
import { useState, useRef, useEffect } from 'react';
import StandardLayout from '@/layouts/standardLayout';
import Graph3D, { GraphNode, GraphLink } from './components/Graph3D';
import './styles/knowledgegraph.css';

export default function KnowledgeGraphPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [filterText, setFilterText] = useState('');
  const [isSimulating, setIsSimulating] = useState(true);
  
  const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set());
  const [hiddenRelations, setHiddenRelations] = useState<Set<string>>(new Set());
  const [relationColors, setRelationColors] = useState<Record<string, string>>({});

  // Form states
  const [newNodeName, setNewNodeName] = useState('');
  const [newRel, setNewRel] = useState('');
  const [newSub, setNewSub] = useState('');
  const [newObj, setNewObj] = useState('');

  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const parseFOL = (content: string) => {
    const lines = content.split('\n');
    const nMap = new Map<string, GraphNode>();
    const parsedLinks: GraphLink[] = [];
    const regex = /^([^\s(]+)\s*\(\s*([^()]+)\s*,\s*([^()]+)\s*\)/i;

    lines.forEach(line => {
      const match = line.trim().match(regex);
      if (match) {
        const rel = match[1].trim();
        const sub = match[2].trim();
        const obj = match[3].trim();
        
        if (!nMap.has(sub)) nMap.set(sub, { id: sub, x: Math.random()*20-10, y: Math.random()*20-10, z: Math.random()*20-10, vx: 0, vy: 0, vz: 0 });
        if (!nMap.has(obj)) nMap.set(obj, { id: obj, x: Math.random()*20-10, y: Math.random()*20-10, z: Math.random()*20-10, vx: 0, vy: 0, vz: 0 });
        
        parsedLinks.push({ source: sub, target: obj, relation: rel });
      }
    });

    setNodes(Array.from(nMap.values()));
    setLinks(parsedLinks);
    setIsSimulating(true);
  };

  // Sync relation colors whenever links change
  useEffect(() => {
    setRelationColors(prev => {
      let changed = false;
      const newColors = { ...prev };
      links.forEach(l => {
        if (!newColors[l.relation]) {
          newColors[l.relation] = getRandomColor();
          changed = true;
        }
      });
      return changed ? newColors : prev;
    });
  }, [links]);

  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      fetch('/knowledgegraph/planets.fol')
        .then(res => res.text())
        .then(text => {
          if (text) parseFOL(text);
        })
        .catch(err => console.error("Failed to load default FOL graph", err));
    }
  }, []); // Run parseFOL once on mount

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) parseFOL(evt.target.result as string);
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    const text = links.map(l => `${l.relation}(${l.source}, ${l.target})`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'knowledge_graph.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddNode = () => {
    if (!newNodeName.trim()) return;
    const name = newNodeName.trim();
    if (!nodes.find(n => n.id === name)) {
      setNodes([...nodes, { id: name, x: Math.random()*10, y: Math.random()*10, z: Math.random()*10, vx: 0, vy: 0, vz: 0 }]);
    }
    setNewNodeName('');
  };

  const handleAddLink = () => {
    if (!newRel.trim() || !newSub.trim() || !newObj.trim()) return;
    const sub = newSub.trim();
    const obj = newObj.trim();
    const rel = newRel.trim();
    
    const newNodes = [...nodes];
    if (!newNodes.find(n => n.id === sub)) newNodes.push({ id: sub, x: Math.random()*10, y: Math.random()*10, z: Math.random()*10, vx: 0, vy: 0, vz: 0 });
    if (!newNodes.find(n => n.id === obj)) newNodes.push({ id: obj, x: Math.random()*10, y: Math.random()*10, z: Math.random()*10, vx: 0, vy: 0, vz: 0 });
    
    setNodes(newNodes);
    setLinks([...links, { source: sub, target: obj, relation: rel }]);
    setNewRel(''); setNewSub(''); setNewObj('');
    setIsSimulating(true);
  };

  const toggleNodeVisibility = (id: string, isVisible: boolean) => {
    const newHidden = new Set(hiddenNodes);
    if (isVisible) newHidden.delete(id);
    else newHidden.add(id);
    setHiddenNodes(newHidden);
  };

  const toggleRelationVisibility = (rel: string, isVisible: boolean) => {
    const newHidden = new Set(hiddenRelations);
    if (isVisible) newHidden.delete(rel);
    else newHidden.add(rel);
    setHiddenRelations(newHidden);
  };

  const handleColorChange = (rel: string, color: string) => {
    setRelationColors(prev => ({ ...prev, [rel]: color }));
  };

  const mainContent = (
    <div className="kg-page">
      <div className="kg-sidebar">
        <h2>Knowledge Graph Tools</h2>
        
        <div className="kg-form-group">
          <strong>Upload & Download (FOL)</strong>
          <input type="file" accept=".txt" ref={fileInputRef} onChange={handleFileUpload} style={{ fontSize: '0.8rem' }} />
          <button className="kg-button kg-button-primary" onClick={handleDownload} disabled={links.length === 0}>
            Download Graph File
          </button>
        </div>

        <div className="kg-form-group">
          <strong>Add Node</strong>
          <input className="kg-input" placeholder="Node Name (e.g. Earth)" value={newNodeName} onChange={e => setNewNodeName(e.target.value)} />
          <button className="kg-button" onClick={handleAddNode}>Create Node</button>
        </div>

        <div className="kg-form-group">
          <strong>Add Connection (Predicate)</strong>
          <input className="kg-input" placeholder="Predicate (e.g. orbits)" value={newRel} onChange={e => setNewRel(e.target.value)} />
          <input className="kg-input" placeholder="Subject (e.g. Earth)" value={newSub} onChange={e => setNewSub(e.target.value)} />
          <input className="kg-input" placeholder="Object (e.g. Sun)" value={newObj} onChange={e => setNewObj(e.target.value)} />
          <button className="kg-button" onClick={handleAddLink}>Create Connection</button>
        </div>

        <div className="kg-form-group">
          <strong>Filter Graph</strong>
          <input className="kg-input" placeholder="Search a node or relation..." value={filterText} onChange={e => setFilterText(e.target.value)} />
        </div>

        <div className="kg-form-group">
          <strong>Variables Visibility</strong>
          <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {nodes.map(n => (
              <label key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={!hiddenNodes.has(n.id)} 
                  onChange={(e) => toggleNodeVisibility(n.id, e.target.checked)} 
                />
                {n.id}
              </label>
            ))}
          </div>
        </div>

        <div className="kg-form-group">
          <strong>Relations Visibility & Colors</strong>
          <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {Array.from(new Set(links.map(l => l.relation))).map(rel => (
              <div key={rel} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={!hiddenRelations.has(rel)} 
                    onChange={(e) => toggleRelationVisibility(rel, e.target.checked)} 
                  />
                  {rel}
                </label>
                <input 
                  type="color" 
                  value={relationColors[rel] || '#ffffff'} 
                  onChange={(e) => handleColorChange(rel, e.target.value)} 
                  style={{ width: '25px', height: '25px', padding: '0', border: 'none', background: 'transparent', cursor: 'pointer' }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="kg-form-group">
          <strong>Layout Engine</strong>
          <button className="kg-button" onClick={() => setIsSimulating(!isSimulating)}>
            {isSimulating ? 'Stop Reorganizing' : 'Start Reorganize'}
          </button>
        </div>
      </div>

      <div className="kg-canvas-container">
        <Graph3D nodes={nodes} links={links} filterText={filterText} isSimulating={isSimulating} hiddenNodes={hiddenNodes} hiddenRelations={hiddenRelations} relationColors={relationColors} />
      </div>
    </div>
  );

  return StandardLayout({ title: "Knowledge Graph", main: mainContent, headerMode: "tyro-only" });
}
