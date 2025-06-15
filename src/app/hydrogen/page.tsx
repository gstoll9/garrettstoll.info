'use client'
import './styles/HydrogenAtom.css';
import ElectronCloud from './components/ElectronCloud';
import SchrodingEquation from './components/text/SchrodingEquation';
import Hydrogen from './components/text/Hydrogen';
import HydrogenSpectrum from './components/HydrogenSpectrum';
import StandardLayout from '@/layouts/StandardLayout';
import { useState } from 'react';


export default function Home() {
  const [text, setText] = useState("Schrodinger Equation");


  const main = (
    <div className="container">
      <div className="leftPane">
        {text === "Hydrogen" ? <Hydrogen /> : <SchrodingEquation />}
      </div>
      <div className="rightPane">
        <ElectronCloud />
        <HydrogenSpectrum />
      </div>
    </div>
  );

  return StandardLayout({title: "Hydrogen Atom", main });
}
