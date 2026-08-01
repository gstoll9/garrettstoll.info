'use client';
import { useState } from 'react';
import Hydrogen from "./Hydrogen";
import SchrodingerEquation from "./SchrodingerEquation";
import './hydrogenTextToggle.css';

type HydrogenTextProps = {
  n?: number;
  l?: number;
  m?: number;
  onStateChange?: (state: { n: number; l: number; m: number }) => void;
};

export default function HydrogenText({ n, l, m, onStateChange }: HydrogenTextProps) {
  const [text, setText] = useState<'SchrodingerEquation' | 'Hydrogen'>('SchrodingerEquation');

  return (
    <div>
      <div className="hydrogenTextToggle">
        <button
          className={text === 'SchrodingerEquation' ? 'active' : ''}
          onClick={() => setText('SchrodingerEquation')}
        >
          Live State
        </button>
        <button
          className={text === 'Hydrogen' ? 'active' : ''}
          onClick={() => setText('Hydrogen')}
        >
          General Formulas
        </button>
      </div>
      {text === 'SchrodingerEquation'
        ? <SchrodingerEquation n={n} l={l} m={m} onStateChange={onStateChange} />
        : <Hydrogen />}
    </div>
  );
}