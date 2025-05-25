"use client"
import { useEffect, useRef } from 'react';

interface SpectralLine {
  wavelength: number; // in nm
  frequency: number;  // in Hz
  energy: number;     // in eV
  series: string;     // Lyman, Balmer, Paschen, etc.
  transition: string; // n=2→1, n=3→2, etc.
  color: string;      // RGB color
}

const hydrogenLines: SpectralLine[] = [
  // Lyman Series (UV)
  { wavelength: 121.6, frequency: 2.47e15, energy: 10.2, series: 'Lyman', transition: 'n=2→1', color: '#8B00FF' },
  { wavelength: 102.6, frequency: 2.92e15, energy: 12.1, series: 'Lyman', transition: 'n=3→1', color: '#9400D3' },
  { wavelength: 97.3, frequency: 3.08e15, energy: 12.7, series: 'Lyman', transition: 'n=4→1', color: '#9932CC' },
  
  // Balmer Series (Visible)
  { wavelength: 656.3, frequency: 4.57e14, energy: 1.89, series: 'Balmer', transition: 'n=3→2', color: '#FF0000' }, // Red
  { wavelength: 486.1, frequency: 6.17e14, energy: 2.55, series: 'Balmer', transition: 'n=4→2', color: '#00FFFF' }, // Cyan
  { wavelength: 434.0, frequency: 6.91e14, energy: 2.86, series: 'Balmer', transition: 'n=5→2', color: '#0000FF' }, // Blue
  { wavelength: 410.2, frequency: 7.31e14, energy: 3.02, series: 'Balmer', transition: 'n=6→2', color: '#8A2BE2' }, // Violet
  
  // Paschen Series (Near-IR)
  { wavelength: 1875, frequency: 1.60e14, energy: 0.66, series: 'Paschen', transition: 'n=4→3', color: '#FF4500' },
  { wavelength: 1282, frequency: 2.34e14, energy: 0.97, series: 'Paschen', transition: 'n=5→3', color: '#FF6347' },
  
  // Brackett Series (IR)
  { wavelength: 4051, frequency: 7.40e13, energy: 0.31, series: 'Brackett', transition: 'n=5→4', color: '#DC143C' },
];

export default function HydrogenSpectrum() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Define electromagnetic spectrum regions with wavelength ranges (in nm)
    const spectrumRegions = [
      { name: 'Gamma', start: 0.001, end: 0.01, startColor: '#FFFFFF', endColor: '#00FF00' },
      { name: 'X-Ray', start: 0.01, end: 10, startColor: '#C0C0C0', endColor: '#404040' },
      { name: 'UV', start: 10, end: 380, startColor: '#E6E6FA', endColor: '#4B0082' },
      { name: 'Visible', start: 380, end: 750, startColor: '#8A2BE2', endColor: '#FF0000' }, // Violet to Red
      { name: 'Infrared', start: 750, end: 1000000, startColor: '#FF0000', endColor: '#FFA500' },
      { name: 'Microwave', start: 1000000, end: 100000000, startColor: '#FFA500', endColor: '#808080' },
      { name: 'Radio', start: 100000000, end: 1000000000, startColor: '#808080', endColor: '#2F2F2F' }
    ];

    // Create full electromagnetic spectrum gradient
    const fullGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    
    // Calculate positions for each region
    const minLog = Math.log10(0.001); // Gamma ray start
    const maxLog = Math.log10(1000000000); // Radio wave end
    const totalLogRange = maxLog - minLog;
    
    spectrumRegions.forEach((region) => {
      const startPos = (Math.log10(region.start) - minLog) / totalLogRange;
      const endPos = (Math.log10(region.end) - minLog) / totalLogRange;
      
      fullGradient.addColorStop(Math.max(0, Math.min(1, startPos)), region.startColor);
      fullGradient.addColorStop(Math.max(0, Math.min(1, endPos)), region.endColor);
    });

    // Draw full spectrum background
    ctx.fillStyle = fullGradient;
    ctx.fillRect(0, canvas.height - 80, canvas.width, 25);

    // Create visible spectrum gradient for comparison
    const visibleGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    const visibleStart = (Math.log10(380) - minLog) / totalLogRange;
    const visibleEnd = (Math.log10(750) - minLog) / totalLogRange;
    
    // Accurate visible spectrum colors
    visibleGradient.addColorStop(0, '#8A2BE2'); // Violet (380nm)
    visibleGradient.addColorStop(0.15, '#4B0082'); // Indigo (420nm)
    visibleGradient.addColorStop(0.3, '#0000FF'); // Blue (450nm)
    visibleGradient.addColorStop(0.5, '#00FF00'); // Green (550nm)
    visibleGradient.addColorStop(0.7, '#FFFF00'); // Yellow (580nm)
    visibleGradient.addColorStop(0.85, '#FFA500'); // Orange (620nm)
    visibleGradient.addColorStop(1, '#FF0000'); // Red (750nm)

    // Draw visible spectrum section
    const visibleStartX = visibleStart * canvas.width;
    const visibleWidth = (visibleEnd - visibleStart) * canvas.width;
    ctx.fillStyle = visibleGradient;
    ctx.fillRect(visibleStartX, canvas.height - 80, visibleWidth, 25);

    // Draw hydrogen spectral lines
    hydrogenLines.forEach((line) => {
      // Map wavelength to x position (log scale)
      const x = ((Math.log10(line.wavelength) - minLog) / totalLogRange) * canvas.width;

      // Draw emission line
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, canvas.height - 120);
      ctx.lineTo(x, canvas.height - 85);
      ctx.stroke();

      // Draw series labels
      ctx.fillStyle = line.color;
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(line.transition, x, canvas.height - 125);
      
      // Series name
      ctx.font = '8px Arial';
      ctx.fillText(line.series, x, canvas.height - 135);
    });

    // Draw spectrum region labels
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    spectrumRegions.forEach((region) => {
      const startPos = (Math.log10(region.start) - minLog) / totalLogRange;
      const endPos = (Math.log10(region.end) - minLog) / totalLogRange;
      const centerPos = (startPos + endPos) / 2;
      const x = centerPos * canvas.width;
      
      // Only draw label if region is visible on canvas
      if (centerPos >= 0 && centerPos <= 1) {
        ctx.fillText(region.name, x, canvas.height - 40);
      }
    });

    // Draw wavelength scale
    const wavelengthMarkers = [0.01, 0.1, 1, 10, 100, 380, 750, 1000, 10000, 100000, 1000000];
    wavelengthMarkers.forEach(wavelength => {
      const x = ((Math.log10(wavelength) - minLog) / totalLogRange) * canvas.width;
      
      if (x >= 0 && x <= canvas.width) {
        let label = `${wavelength}`;
        if (wavelength >= 1000) {
          label = `${wavelength/1000}μm`;
        } else if (wavelength >= 1) {
          label = `${wavelength}nm`;
        } else {
          label = `${wavelength}nm`;
        }
        
        ctx.fillText(label, x, canvas.height - 20);
        
        // Tick mark
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - 50);
        ctx.lineTo(x, canvas.height - 45);
        ctx.stroke();
      }
    });

    // Main title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Hydrogen Emission Lines in Electromagnetic Spectrum', 10, 25);
    
    // Subtitle
    ctx.font = '12px Arial';
    ctx.fillText('Full EM Spectrum (logarithmic scale)', 10, 45);

  }, []);

  return (
    <div style={{ marginTop: '20px', backgroundColor: '#000', padding: '15px', borderRadius: '8px' }}>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={200}
        style={{ width: '100%', height: 'auto', maxWidth: '800px' }}
      />
      <div style={{ color: 'white', fontSize: '12px', marginTop: '15px' }}>
        <p><strong>Hydrogen Series:</strong></p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
          <span style={{ color: '#8B00FF' }}>■ Lyman (UV)</span>
          <span style={{ color: '#FF0000' }}>■ Balmer (Visible)</span>
          <span style={{ color: '#FF4500' }}>■ Paschen (Near-IR)</span>
          <span style={{ color: '#DC143C' }}>■ Brackett (IR)</span>
        </div>
        <p style={{ marginTop: '10px', fontSize: '10px', opacity: 0.8 }}>
          Note: Only hydrogen lines in UV, Visible, and IR ranges are shown. 
          Gamma, X-ray, Microwave, and Radio regions show background spectrum only.
        </p>
      </div>
    </div>
  );
}