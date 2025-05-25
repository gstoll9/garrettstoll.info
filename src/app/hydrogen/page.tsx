import './styles/HydrogenAtom.css';
import ElectronCloud from './components/ElectronCloud';
import SchrodingEquation from './components/SchrodingEquation';
import HydrogenSpectrum from './components/HydrogenSpectrum';

export default function Home() {
  return (
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
}
