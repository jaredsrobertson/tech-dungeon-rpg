// src/engine/renderer/renderHelpers.js
import { PERSPECTIVE } from '../../game/constants';

// Reusable objects to reduce Garbage Collection
const _proj = { x: 0, y: 0, scale: 0 };

export const lerp = (start, end, factor) => start + (end - start) * factor;

export const lerp2D = (p1, p2, t) => ({
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t
});

export const project3D = (x, y, z, centerX, centerY, out = _proj) => {
  const safeZ = Math.max(0.1, PERSPECTIVE + z);
  const scale = PERSPECTIVE / safeZ;
  out.x = centerX + x * scale;
  out.y = centerY + y * scale;
  out.scale = scale;
  return out; 
};

export const drawShapeFaces = (ctx, projectedVerts, faces, color, alpha, strokeColor = null) => {
    const prevAlpha = ctx.globalAlpha;
    const prevFill = ctx.fillStyle;
    const prevStroke = ctx.strokeStyle;
    const prevLineWidth = ctx.lineWidth;

    ctx.fillStyle = color;
    ctx.strokeStyle = strokeColor || color;
    ctx.lineWidth = 1;

    // Fill
    faces.forEach(faceDef => {
        const indices = faceDef.indices || faceDef; 
        if (indices.length < 3) return;

        ctx.beginPath();
        const start = projectedVerts[indices[0]];
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < indices.length; i++) {
            const p = projectedVerts[indices[i]];
            ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.globalAlpha = alpha; 
        ctx.fill();
    });

    // Stroke (Batched)
    ctx.beginPath();
    faces.forEach(faceDef => {
        const indices = faceDef.indices || faceDef; 
        if (indices.length < 3) return;
        const start = projectedVerts[indices[0]];
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < indices.length; i++) {
            const p = projectedVerts[indices[i]];
            ctx.lineTo(p.x, p.y);
        }
        ctx.closePath(); 
    });
    
    ctx.globalAlpha = 0.6;
    ctx.stroke(); 

    ctx.globalAlpha = prevAlpha;
    ctx.fillStyle = prevFill;
    ctx.strokeStyle = prevStroke;
    ctx.lineWidth = prevLineWidth;
};