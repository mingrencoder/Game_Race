import React, { useEffect, useRef } from 'react';

interface VehiclePreviewProps {
  vehicleType: string;
  color?: string;
  liveryData?: { isGradient: boolean; colors: string[] };
  width?: number;
  height?: number;
  scale?: number;
}

export default function VehiclePreview({ 
  vehicleType, 
  color = '#ffffff', 
  liveryData, 
  width = 100, 
  height = 100,
  scale = 1
}: VehiclePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    
    // Rotate to point right or up? Up looks better in UI
    ctx.rotate(-Math.PI / 2);

    let fillStyle: string | CanvasGradient = color || '#ffffff';
    if (liveryData && Array.isArray(liveryData.colors) && liveryData.colors.length > 0) {
      if (liveryData.isGradient) {
        const grad = ctx.createLinearGradient(-30, -16, 30, 16);
        const colors = liveryData.colors;
        colors.forEach((c, idx) => {
          if (c) grad.addColorStop(idx / (colors.length - 1 || 1), c);
        });
        fillStyle = grad;
      } else {
        fillStyle = liveryData.colors[0] || color || '#ffffff';
      }
    }

    ctx.shadowColor = (liveryData && Array.isArray(liveryData.colors) && liveryData.colors.length > 0 && liveryData.colors[0]) ? liveryData.colors[0] : (color || '#ffffff');
    ctx.shadowBlur = 15;

    const drawWheels = () => {
      const prevShadowBlur = ctx.shadowBlur;
      const prevShadowColor = ctx.shadowColor;
      ctx.fillStyle = '#111';
      ctx.shadowBlur = 0;
      ctx.fillRect(-24, -20, 12, 8);
      ctx.fillRect(12, -20, 12, 8);
      ctx.fillRect(-24, 12, 12, 8);
      ctx.fillRect(12, 12, 12, 8);
      ctx.shadowBlur = prevShadowBlur;
      ctx.shadowColor = prevShadowColor;
    };

    if (vehicleType === 'f1') {
      drawWheels();
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.moveTo(-40, -10);
      ctx.lineTo(-10, -10);
      ctx.lineTo(40, -4);
      ctx.lineTo(40, 4);
      ctx.lineTo(-10, 10);
      ctx.lineTo(-40, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, -8, 12, 16);
    } else if (vehicleType === 'muscle') {
      drawWheels();
      ctx.fillStyle = fillStyle;
      ctx.fillRect(-35, -14, 70, 28);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(5, -10, 20, 20);
    } else if (vehicleType === 'tank') {
      drawWheels();
      ctx.fillStyle = fillStyle;
      ctx.fillRect(-40, -20, 80, 40);
      ctx.fillStyle = '#111';
      ctx.fillRect(-15, -10, 30, 20);
      ctx.fillRect(15, -4, 30, 8);
    } else if (vehicleType === 'ninja') {
      ctx.fillStyle = '#0a0a0a';
      ctx.shadowBlur = 0;
      ctx.fillRect(-22, -18, 10, 6);
      ctx.fillRect(14, -18, 10, 6);
      ctx.fillRect(-22, 12, 10, 6);
      ctx.fillRect(14, 12, 10, 6);
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.moveTo(-35, -5);
      ctx.lineTo(-10, -12);
      ctx.lineTo(35, -4);
      ctx.lineTo(45, 0); 
      ctx.lineTo(35, 4);
      ctx.lineTo(-10, 12);
      ctx.lineTo(-35, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.fillRect(-10, -6, 15, 12); 
    } else if (vehicleType === 'cyber') {
      drawWheels();
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.moveTo(-35, -16);
      ctx.lineTo(10, -16);
      ctx.lineTo(30, -10);
      ctx.lineTo(35, -6);
      ctx.lineTo(35, 6);
      ctx.lineTo(30, 10);
      ctx.lineTo(10, 16);
      ctx.lineTo(-35, 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0ff';
      ctx.shadowColor = '#0ff';
      ctx.shadowBlur = 10;
      ctx.fillRect(-30, -8, 15, 16);
      ctx.shadowBlur = 0;
    } else if (vehicleType === 'boss') {
      ctx.fillStyle = '#222';
      ctx.shadowBlur = 0;
      ctx.fillRect(-45, -25, 90, 50); 
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.moveTo(-40, -15);
      ctx.lineTo(-20, -25);
      ctx.lineTo(20, -25);
      ctx.lineTo(45, -10);
      ctx.lineTo(45, 10);
      ctx.lineTo(20, 25);
      ctx.lineTo(-20, 25);
      ctx.lineTo(-40, 15);
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = typeof color === 'string' ? color : '#fff';
      if (liveryData && Array.isArray(liveryData.colors) && liveryData.colors.length > 0) ctx.shadowColor = liveryData.colors[0];
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(10, 0, 6, 0, Math.PI * 2);
      ctx.fill(); 
      ctx.shadowBlur = 0;
    } else if (vehicleType === 'legend') {
      ctx.fillStyle = '#111';
      ctx.shadowBlur = 0;
      ctx.fillRect(-28, -24, 14, 10);
      ctx.fillRect(16, -22, 12, 8);
      ctx.fillRect(-28, 14, 14, 10);
      ctx.fillRect(16, 14, 12, 8);
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.moveTo(-45, -8);
      ctx.lineTo(-15, -8);
      ctx.lineTo(50, -3);
      ctx.lineTo(50, 3);
      ctx.lineTo(-15, 8);
      ctx.lineTo(-45, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-45, -20, 8, 40); 
      ctx.fillRect(40, -15, 6, 30); 
      ctx.fillStyle = '#ffb700'; 
      ctx.fillRect(-5, -6, 16, 12);
    } else {
      drawWheels();
      ctx.fillStyle = fillStyle;
      ctx.fillRect(-30, -16, 60, 32);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(10, -12, 10, 24);
      ctx.fillStyle = fillStyle;
      ctx.fillRect(-26, -12, 6, 24);
    }

    ctx.restore();
  }, [vehicleType, color, liveryData, width, height, scale]);

  return <canvas ref={canvasRef} width={width} height={height} className="block mx-auto" />;
}
