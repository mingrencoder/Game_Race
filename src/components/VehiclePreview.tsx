import React, { useEffect, useRef } from 'react';

interface VehiclePreviewProps {
  vehicleType: string;
  color?: string;
  liveryData?: { id?: string; isGradient?: boolean; colors?: string[]; tier?: string };
  width?: number;
  height?: number;
  scale?: number;
}

/**
 * 渲染单辆赛车涂装与外观配置的 Canvas 预览组件
 * 封装了复用的原生 2D 绘图逻辑
 */
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

    let fillStyle: string | CanvasGradient = typeof color === 'string' ? color : '#ffffff';
    let fallbackShadow = typeof color === 'string' ? color : '#ffffff';
    let currentTier = 'BASIC';
    let currentId = '';

    if (liveryData && typeof liveryData === 'object') {
      currentTier = liveryData.tier || 'BASIC';
      currentId = liveryData.id || '';
      const colors = liveryData.colors;
      if (Array.isArray(colors) && colors.length > 0) {
        if (liveryData.isGradient) {
          if (currentId === 'liv_galaxy') {
             // 典藏星空专属径向渐变
             const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
             colors.forEach((c, idx) => { if (c) grad.addColorStop(idx / (colors.length - 1 || 1), c); });
             fillStyle = grad;
          } else {
             const grad = ctx.createLinearGradient(-30, -16, 30, 16);
             colors.forEach((c, idx) => { if (c) grad.addColorStop(idx / (colors.length - 1 || 1), c); });
             fillStyle = grad;
          }
        } else {
          fillStyle = colors[0] || fallbackShadow;
        }
        fallbackShadow = colors[0] || fallbackShadow;
      }
    }

    // 根据阶级设定光晕强度 (核心视觉区分点)
    if (currentTier === 'ELITE') {
        ctx.shadowBlur = 25;
        if (currentId === 'liv_prism') fallbackShadow = '#00ffff'; // 强制红青对比色光晕
    } else if (currentTier === 'ADVANCED') {
        ctx.shadowBlur = 18;
    } else if (currentTier === 'INTERMEDIATE') {
        ctx.shadowBlur = currentId === 'liv_matte_black' ? 0 : 8; // 哑光黑吸光无光晕
    } else {
        // 【核心修改】：剥夺免费基础色的发光特权，使其显得普通
        ctx.shadowBlur = 2;
    }
    ctx.shadowColor = fallbackShadow;

    const applyPremiumDetails = () => {
        if (currentTier === 'ELITE') {
            if (currentId === 'liv_galaxy') {
                ctx.save();
                ctx.shadowBlur = 5; ctx.shadowColor = '#fff'; ctx.fillStyle = '#ffffff';
                [{x:-15,y:-8,r:1}, {x:10,y:12,r:1.5}, {x:22,y:-10,r:0.8}, {x:-25,y:14,r:1.2}, {x:2,y:2,r:2}, {x:30,y:5,r:1}].forEach(s => {
                    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
                });
                ctx.restore();
            } else if (currentId === 'liv_prism') {
                ctx.save();
                ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.moveTo(-30, -15); ctx.lineTo(30, 15);
                ctx.moveTo(-30, 15); ctx.lineTo(30, -15);
                ctx.moveTo(0, -20); ctx.lineTo(0, 20);
                ctx.stroke();
                ctx.restore();
            }
        }
    };

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
      applyPremiumDetails();
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, -8, 12, 16);
    } else if (vehicleType === 'muscle') {
      drawWheels();
      ctx.fillStyle = fillStyle;
      ctx.fillRect(-35, -14, 70, 28);
      applyPremiumDetails();
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(5, -10, 20, 20);
    } else if (vehicleType === 'tank') {
      drawWheels();
      ctx.fillStyle = fillStyle;
      ctx.fillRect(-40, -20, 80, 40);
      applyPremiumDetails();
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
      applyPremiumDetails();
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
      applyPremiumDetails();
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
      applyPremiumDetails();
      ctx.shadowColor = typeof color === 'string' ? color : '#fff';
      if (liveryData && typeof liveryData === 'object' && Array.isArray(liveryData.colors) && liveryData.colors.length > 0) {
        ctx.shadowColor = liveryData.colors[0];
      }
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
      applyPremiumDetails();
      ctx.fillRect(-45, -20, 8, 40); 
      ctx.fillRect(40, -15, 6, 30); 
      ctx.fillStyle = '#ffb700'; 
      ctx.fillRect(-5, -6, 16, 12);
    } else {
      drawWheels();
      ctx.fillStyle = fillStyle;
      ctx.fillRect(-30, -16, 60, 32);
      applyPremiumDetails();
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
