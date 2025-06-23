'use client'
import './styles/HydrogenAtom.css';
import ElectronCloud from './components/ElectronCloud';
import SchrodingerEquation from './components/text/SchrodingerEquation';
import Hydrogen from './components/text/Hydrogen';
import HydrogenSpectrum from './components/HydrogenSpectrum';
import StandardLayout from '@/layouts/standardLayout';
import { useState } from 'react';


export default function Home() {
  const [text, setText] = useState("Schrodinger Equation");


  const main = (
    <div className="container">
      <div className="leftPane">
        {text === "Hydrogen" ? <Hydrogen /> : <SchrodingerEquation />}
      </div>
      <div className="rightPane">
        <ElectronCloud />
        <HydrogenSpectrum />
      </div>
    </div>
  );

  return StandardLayout({title: "Hydrogen Atom", main });
}
