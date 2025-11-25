// src/engine/renderer/layers/BackgroundLayer.js
import { TUNNEL_DEPTH } from '../../../game/constants';
import { project3D } from '../renderHelpers';

export const drawBackground = (ctx, width, height) => {
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, width, height);
};

export const drawStars = (ctx, particles, width, height, warpFactor) => {
  const centerX = width / 2;
  const centerY = height * 0.35;
  ctx.fillStyle = '#00ff41';
  
  particles.forEach(p => {
    p.update(width, height, warpFactor);
    const pos = project3D(p.x, p.y, p.z, centerX, centerY);
    const twinkleFactor = 0.5 + Math.abs(Math.sin(p.twinkle)) * 0.5;
    const depthFade = Math.min(1, (TUNNEL_DEPTH - p.z) / (TUNNEL_DEPTH * 0.5)); 
    const tSize = p.size * pos.scale * 2;
    const tOpacity = p.opacity * twinkleFactor * depthFade;
    
    if (tOpacity > 0.1 && pos.x > 0 && pos.x < width && pos.y > 0 && pos.y < height) {
      ctx.globalAlpha = tOpacity;
      ctx.fillRect(pos.x - tSize/2, pos.y - tSize/2, tSize, tSize);
    }
  });
  ctx.globalAlpha = 1;
};