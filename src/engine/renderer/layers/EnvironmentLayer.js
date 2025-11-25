// src/engine/renderer/layers/EnvironmentLayer.js
import { GRID_SPACING, TUNNEL_DEPTH, THEME } from '../../../game/constants';
import { project3D, lerp2D } from '../renderHelpers';

// Reusable objects
const _p1 = { x: 0, y: 0, scale: 0 };
const _p2 = { x: 0, y: 0, scale: 0 };
const _p3 = { x: 0, y: 0, scale: 0 };
const _p4 = { x: 0, y: 0, scale: 0 };

export const drawGrid = (ctx, width, height, depth, gradientCacheRef, time) => {
  ctx.globalAlpha = 1; 
  ctx.shadowBlur = 0;
  
  const centerX = width / 2;
  const centerY = height * 0.35;
  const tunnelHalfW = width / 2;
  const tunnelHalfH = width / 2; 
  const numRings = Math.floor(TUNNEL_DEPTH / GRID_SPACING);

  const sway1 = Math.sin(time * THEME.ENV.TILT_FREQ_1);
  const sway2 = Math.cos(time * THEME.ENV.TILT_FREQ_2);
  const angle = (sway1 + sway2 * 0.5) * THEME.ENV.TILT_AMP;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const cornersRaw = [
      { x: -tunnelHalfW, y: -tunnelHalfH },
      { x: tunnelHalfW,  y: -tunnelHalfH },
      { x: tunnelHalfW,  y: tunnelHalfH },
      { x: -tunnelHalfW, y: tunnelHalfH }
  ];

  const rotCorners = cornersRaw.map(p => ({
      x: p.x * cos - p.y * sin,
      y: p.x * sin + p.y * cos
  }));

  // Draw Rings
  ctx.lineWidth = 1;
  for (let i = -1; i <= numRings; i++) {
    const z = i * GRID_SPACING; 
    if (z > TUNNEL_DEPTH) continue;

    const depthFactor = 1 - (z / TUNNEL_DEPTH);
    const baseOpacity = Math.max(0, Math.pow(depthFactor, 1.5) * 0.6);

    if (baseOpacity < 0.01) continue;

    project3D(rotCorners[0].x, rotCorners[0].y, z, centerX, centerY, _p1);
    project3D(rotCorners[1].x, rotCorners[1].y, z, centerX, centerY, _p2);
    project3D(rotCorners[2].x, rotCorners[2].y, z, centerX, centerY, _p3);
    project3D(rotCorners[3].x, rotCorners[3].y, z, centerX, centerY, _p4);
    
    ctx.strokeStyle = `rgba(0, 255, 65, ${baseOpacity})`;
    ctx.beginPath();
    ctx.moveTo(_p1.x, _p1.y); ctx.lineTo(_p2.x, _p2.y);
    ctx.lineTo(_p3.x, _p3.y); ctx.lineTo(_p4.x, _p4.y);
    ctx.closePath();
    ctx.stroke();
  }
  
  // Draw Longitudinal Lines
  const numLines = 3; 
  ctx.lineWidth = 2;
  let gradIndex = 0; 

  const drawLongLine = (p2D) => {
       project3D(p2D.x, p2D.y, -GRID_SPACING, centerX, centerY, _p1);
       project3D(p2D.x, p2D.y, TUNNEL_DEPTH, centerX, centerY, _p2);
       
       let grad = gradientCacheRef.current[gradIndex];
       if (!grad) {
           grad = ctx.createLinearGradient(_p1.x, _p1.y, _p2.x, _p2.y);
           grad.addColorStop(0, 'rgba(0, 255, 65, 0.6)'); 
           grad.addColorStop(1, 'rgba(0, 255, 65, 0)'); 
           gradientCacheRef.current[gradIndex] = grad;
       }
       
       ctx.strokeStyle = grad;
       ctx.beginPath(); 
       ctx.moveTo(_p1.x, _p1.y); ctx.lineTo(_p2.x, _p2.y); 
       ctx.stroke();
       gradIndex++; 
  };
  
  for (let i = 0; i <= numLines; i++) {
    const t = i / numLines; 
    drawLongLine(lerp2D(rotCorners[0], rotCorners[1], t));
    drawLongLine(lerp2D(rotCorners[3], rotCorners[2], t));
  }

  for (let i = 1; i < numLines; i++) {
    const t = i / numLines;
    drawLongLine(lerp2D(rotCorners[0], rotCorners[3], t));
    drawLongLine(lerp2D(rotCorners[1], rotCorners[2], t));
  }
};