import './styles/HydrogenAtom.css';
import ElectronCloud from './components/ElectronCloud';
import SchrodingEquation from './components/SchrodingEquation';
import HydrogenSpectrum from './components/HydrogenSpectrum';
import StandardLayout from '@/layouts/standardLayout';

export default function Home() {
  const main = (
    <div className="container">
      <div className="leftPane">
        <SchrodingEquation />
      </div>
      <div className="rightPane">
        <ElectronCloud />
        <HydrogenSpectrum />
      </div>
    </div>
  );

  return StandardLayout({title: "Hydrogen Atom", main });
}
