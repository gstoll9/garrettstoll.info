"use client"
import { useState } from "react";
import StandardLayout from "@/layouts/standardLayout";
import ThreeBodyVisualizer from "./components/ThreeBodyVisualizer";
import { presets } from "./utils/physics";

function ThreeBody() {
  const [currentPreset, setCurrentPreset] = useState('figure8');
  const [resetKey, setResetKey] = useState(0);
  
  const handlePresetChange = (preset: string) => {
    setCurrentPreset(preset);
    setResetKey(prev => prev + 1);
  };
  
  const initialState = {
    bodies: presets[currentPreset as keyof typeof presets].bodies,
    time: 0
  };

  const page = (
    <div style={{ width: '100%', height: '100vh' }}>
      <ThreeBodyVisualizer 
        key={resetKey}
        initialState={initialState}
        selectedPreset={currentPreset}
        onPresetChange={handlePresetChange}
      />
    </div>
  );

  return StandardLayout({main: page});
}

export default ThreeBody;