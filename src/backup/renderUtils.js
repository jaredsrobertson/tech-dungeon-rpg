import { GRID_SPACING, TUNNEL_DEPTH, PERSPECTIVE, GLITCH_CHARS, SHAPES, CLASS_MAP, COLOR_PAIRS, THEME } from './constants';
import { rotateVertices } from './math';

// --- HELPER FUNCTIONS ---

export const lerp = (start, end, factor) => start + (end - start) * factor;

const lerp2D = (p1, p2, t) => ({
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t
});

// Reusable objects to reduce Garbage Collection
const _proj = { x: 0, y: 0, scale: 0 };
const _p1 = { x: 0, y: 0, scale: 0 };
const _p2 = { x: 0, y: 0, scale: 0 };
const _p3 = { x: 0, y: 0, scale: 0 };
const _p4 = { x: 0, y: 0, scale: 0 };

export const project3D = (x, y, z, centerX, centerY, out = _proj) => {
  const safeZ = Math.max(0.1, PERSPECTIVE + z);
  const scale = PERSPECTIVE / safeZ;
  out.x = centerX + x * scale;
  out.y = centerY + y * scale;
  out.scale = scale;
  return out; 
};

// --- RENDER FUNCTIONS ---

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

const drawShapeFaces = (ctx, projectedVerts, faces, color, alpha, strokeColor = null) => {
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

export const drawSpeechBubble = (ctx, x, y, text) => {
    const padding = 10;
    const fontSize = 14;
    const font = `${fontSize}px monospace`;
    
    ctx.font = font;
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const boxWidth = Math.max(200, textWidth + padding * 2);
    const boxHeight = fontSize + padding * 2 + 10;

    const boxX = x - boxWidth / 2;
    const boxY = y - boxHeight;

    ctx.save();
    ctx.fillStyle = '#050505';
    ctx.strokeStyle = '#cc0044';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    ctx.rect(boxX, boxY, boxWidth, boxHeight);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 5, boxY + boxHeight);
    ctx.lineTo(x + 5, boxY + boxHeight);
    ctx.lineTo(x, boxY + boxHeight + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, boxY + boxHeight / 2);
    
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = '#cc0044';
        const cx = x + textWidth / 2 + 5;
        ctx.fillRect(cx, boxY + padding + 2, 8, fontSize);
    }

    ctx.restore();
};

export const drawPlayers = ({ ctx, width, height, players, visualSeed, time }) => {
    const { WIDTH, GAP, BOTTOM_OFFSET, BASE_SIZE, ROTATION_SPEED, FLOAT_FREQ, FLOAT_AMP, MAG_PRIMARY, MAG_SECONDARY } = THEME.PLAYER;
    
    const totalWidth = WIDTH * 2 + GAP;
    const avatarY = height - BOTTOM_OFFSET; 

    const random = (modifier, totalSeed) => { 
        const x = Math.sin(totalSeed + modifier) * 10000; 
        return x - Math.floor(x); 
    };

    Object.values(players).forEach((player, index) => {
        let screenX;
        if (index === 0) screenX = (width / 2) - (totalWidth / 2) + (WIDTH / 2);
        else screenX = (width / 2) + (totalWidth / 2) - (WIDTH / 2);

        const idNum = parseInt(player.id) || 0;
        const totalSeed = (idNum * 2) + visualSeed;
        const colors = COLOR_PAIRS[Math.floor(totalSeed) % COLOR_PAIRS.length];

        const primaryKey = CLASS_MAP[player.class] || 'cube';
        const primaryShape = SHAPES[primaryKey];
        
        const shapeKeys = Object.keys(SHAPES);
        let secondaryKey = primaryKey;
        let attempts = 0;
        while (secondaryKey === primaryKey && attempts < 10) {
            const randIdx = Math.floor(Math.abs(random(attempts + 50, totalSeed)) * shapeKeys.length);
            secondaryKey = shapeKeys[randIdx % shapeKeys.length];
            attempts++;
        }
        const secondaryShape = SHAPES[secondaryKey];
        const secondaryScale = 0.90 + random(400, totalSeed) * 0.20;

        const pMag = MAG_PRIMARY + random(90, totalSeed) * 0.002;
        const pRotX = pMag * (random(100, totalSeed) > 0.5 ? 1 : -1); 
        const pRotY = pMag * (random(101, totalSeed) > 0.5 ? 1 : -1); 
        const pRotZ = (pMag * 0.5) * (random(106, totalSeed) > 0.5 ? 1 : -1); 

        const sMag = MAG_SECONDARY + random(95, totalSeed) * 0.003;
        const sRotX = sMag * (random(102, totalSeed) > 0.5 ? 1 : -1); 
        const sRotY = sMag * (random(103, totalSeed) > 0.5 ? 1 : -1); 
        const sRotZ = sMag * (random(107, totalSeed) > 0.5 ? 1 : -1); 

        const floatY = Math.sin(time * FLOAT_FREQ) * FLOAT_AMP; 

        const renderShape = (vertices, faces, sx, sy, sz, scale, color, isSecondary) => {
            const angleX = time * ROTATION_SPEED * sx; 
            const angleY = time * ROTATION_SPEED * sy + (isSecondary ? 1.0 : 0);
            const angleZ = time * ROTATION_SPEED * sz;

            const baseSize = BASE_SIZE * scale;
            const transformed = rotateVertices(vertices, angleX, angleY, angleZ);

            const projected = transformed.map(v => ({
                x: screenX + v.x * baseSize,
                y: avatarY + v.y * baseSize + floatY
            }));

            const sortedFaces = faces.map(face => {
                const indices = Array.isArray(face) ? face : [];
                let avgZ = 0;
                indices.forEach(i => avgZ += transformed[i].z);
                avgZ /= indices.length;
                return { indices, z: avgZ };
            }).sort((a, b) => a.z - b.z);

            if (isSecondary) {
                const prevComp = ctx.globalCompositeOperation;
                ctx.globalCompositeOperation = 'screen'; 
                const alpha = 0.45;
                drawShapeFaces(ctx, projected, sortedFaces, color, alpha, color);
                ctx.globalCompositeOperation = prevComp;
            } else {
                drawShapeFaces(ctx, projected, sortedFaces, color, 0.3, '#fff');
            }
        };

        if (primaryShape) renderShape(primaryShape.vertices, primaryShape.faces, pRotX, pRotY, pRotZ, 1.0, colors.p, false);
        if (secondaryShape) renderShape(secondaryShape.vertices, secondaryShape.faces, sRotX, sRotY, sRotZ, secondaryScale, colors.s, true);
    });
};

const updateVisualState = (enemy, visualStateRef, time) => {
    let viz = visualStateRef.current[enemy.id];
    if (!viz) {
         viz = { x: enemy.x, y: enemy.y || 0, z: enemy.distance, idlePhase: Math.random() * Math.PI * 2 };
        visualStateRef.current[enemy.id] = viz;
    }
    viz.x = lerp(viz.x, enemy.x, THEME.ENEMY.LERP_FACTOR);
    viz.y = lerp(viz.y, (enemy.y || 0), THEME.ENEMY.LERP_FACTOR);
    viz.z = lerp(viz.z, enemy.distance, THEME.ENEMY.LERP_FACTOR);
    return viz;
};

const drawDeathEffect = (ctx, enemy, deathTimersRef, visualStateRef, centerX, centerY, now) => {
    const deathTimer = deathTimersRef.current[enemy.id];
    if (deathTimer && (now - deathTimer < 1000)) {
        const viz = visualStateRef.current[enemy.id] || enemy;
        const pos = project3D(viz.x || 0, viz.y || 0, viz.z || 300, centerX, centerY);
        const size = 150 * pos.scale; 
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${size * 0.5}px monospace`;
        
        const seed = enemy.id.charCodeAt(0);
        for(let k=0; k<5; k++) {
            const char = GLITCH_CHARS[(seed + k) % GLITCH_CHARS.length];
            const gx = pos.x + (Math.random()-0.5) * size * 3;
            const gy = pos.y + (Math.random()-0.5) * size * 3;
            ctx.fillText(char, gx, gy);
        }
    } else if (deathTimer) { delete deathTimersRef.current[enemy.id]; }
};

const calculateCombatOffsets = (enemy, attackTimersRef, damageTimersRef, time, now) => {
    let isFiring = false;
    const attackTimer = attackTimersRef.current[enemy.id];
    if (attackTimer) {
        if (now - attackTimer.start < 300) { isFiring = true; } 
        else { delete attackTimersRef.current[enemy.id]; }
    }

    let surgeZ = 0, shakeX = 0, shakeY = 0, isDamaged = false;
    const isCharging = enemy.isCharging;

    if (isCharging || isFiring) { 
        surgeZ = Math.sin(time * 20) * THEME.COMBAT.SURGE_Z - THEME.COMBAT.SURGE_Z; 
        shakeX += (Math.random() - 0.5) * THEME.COMBAT.SHAKE_X; 
    }
    
    const damageTimer = damageTimersRef.current[enemy.id];
    if (damageTimer && (now - damageTimer < 500)) {
      isDamaged = true; 
      shakeX = (Math.random() - 0.5) * THEME.COMBAT.DAMAGE_SHAKE; 
      shakeY = (Math.random() - 0.5) * THEME.COMBAT.DAMAGE_SHAKE;
    } else if (damageTimer) { delete damageTimersRef.current[enemy.id]; }

    return { offsetX: shakeX, offsetY: shakeY, offsetZ: surgeZ, isDamaged, isFiring, isCharging, attackTimer };
};

const drawLaser = (ctx, pos, attackTimer, width, height) => {
    if (!attackTimer) return;
    const { WIDTH, GAP } = THEME.PLAYER;
    const totalWidth = WIDTH * 2 + GAP;
    
    let playerX = width / 2;
    const pIndex = attackTimer.targetId === '0' ? 0 : 1; 
    if (pIndex === 0) playerX = (width / 2) - (totalWidth / 2) + (WIDTH / 2);
    else playerX = (width / 2) + (totalWidth / 2) - (WIDTH / 2);
    const playerY = height - THEME.PLAYER.BOTTOM_OFFSET; 
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(playerX, playerY);
    ctx.strokeStyle = THEME.COMBAT.LASER_COLOR; 
    ctx.lineWidth = THEME.COMBAT.LASER_WIDTH + Math.random() * 4;
    ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000';
    ctx.stroke(); ctx.shadowBlur = 0;
};

const drawEnemyWireframe = (ctx, enemy, pos, size, wireframeSize, time, isTargeted, isDamaged, isFiring, isCharging) => {
    const baseShape = SHAPES.octahedron; 
    let mainColor = '#ff0055';
    if (isDamaged) mainColor = '#ffffff';
    else if (isFiring) mainColor = '#ff0000';
    else if (isCharging) mainColor = '#ffaa00';
    
    const hpPct = enemy.hp / enemy.maxHp;
    const split = 1 - hpPct; 
    const seed = enemy.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    
    const angleY = time * THEME.ENEMY.ROT_SPEED_Y + seed; 
    const angleX = time * THEME.ENEMY.ROT_SPEED_X + seed * 0.5; 
    const angleZ = time * THEME.ENEMY.ROT_SPEED_Z + seed * 0.2; 
    
    const transformedVerts = rotateVertices(baseShape.vertices, angleX, angleY, angleZ);

    const sortedFaces = baseShape.faces.map(face => {
        let avgZ = 0;
        face.forEach(idx => { avgZ += transformedVerts[idx].z; });
        avgZ /= face.length;
        return { indices: face, z: avgZ };
    }).sort((a, b) => a.z - b.z); 

    const backFaces = sortedFaces.filter(f => f.z <= 0);
    const frontFaces = sortedFaces.filter(f => f.z > 0);

    const projectedVerts = transformedVerts.map(v => ({ 
        x: pos.x + v.x * wireframeSize, 
        y: pos.y + v.y * wireframeSize 
    }));

    // Dynamic HP Gradient
    let minY = Infinity, maxY = -Infinity;
    projectedVerts.forEach(p => {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });
    
    const h = maxY - minY;
    const boundTop = minY - h * 0.05;
    const boundBot = maxY + h * 0.05;

    const dynamicHpGrad = ctx.createLinearGradient(0, boundTop, 0, boundBot);
    dynamicHpGrad.addColorStop(0, '#333333'); 
    dynamicHpGrad.addColorStop(Math.max(0, split - 0.01), '#333333');
    dynamicHpGrad.addColorStop(Math.min(1, split + 0.01), mainColor);
    dynamicHpGrad.addColorStop(1, mainColor);

    // RGB Split Effect on Damage
    if (isDamaged) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const shake = 8;
        
        // Red Channel
        ctx.save(); ctx.translate(-shake, 0);
        drawShapeFaces(ctx, projectedVerts, backFaces, '#ff0000', 0.5, '#ff0000');
        drawShapeFaces(ctx, projectedVerts, frontFaces, '#ff0000', 0.5, '#ff0000');
        ctx.restore();

        // Blue Channel
        ctx.save(); ctx.translate(shake, 0);
        drawShapeFaces(ctx, projectedVerts, backFaces, '#0000ff', 0.5, '#0000ff');
        drawShapeFaces(ctx, projectedVerts, frontFaces, '#0000ff', 0.5, '#0000ff');
        ctx.restore();

        // Green Channel (Center)
        drawShapeFaces(ctx, projectedVerts, backFaces, '#00ff00', 0.5, '#00ff00');
        drawShapeFaces(ctx, projectedVerts, frontFaces, '#00ff00', 0.5, '#00ff00');
        
        ctx.restore();
    } else {
        // Standard Draw
        drawShapeFaces(ctx, projectedVerts, backFaces, dynamicHpGrad, 0.3); 

        ctx.save();
        ctx.translate(pos.x, pos.y);
        
        if (isTargeted) {
            ctx.save(); ctx.rotate(time * 2); ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 2;
            ctx.shadowBlur = 15; ctx.shadowColor = '#00FFFF';
            const r = wireframeSize * 0.8; 
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke(); ctx.restore();
        }
        
        const pulse = 1.0 + Math.sin(time * 8) * 0.3;
        const coreRadius = size * 0.6 * pulse;
        const coreAlpha = 0.2 + (0.7 * hpPct);
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
        glowGrad.addColorStop(0, `rgba(255,255,255,${coreAlpha})`); 
        glowGrad.addColorStop(0.4, mainColor); 
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)'); 
        
        ctx.fillStyle = glowGrad; 
        ctx.globalAlpha = coreAlpha;
        ctx.beginPath(); ctx.arc(0, 0, coreRadius, 0, Math.PI * 2); ctx.fill();
        ctx.restore(); 

        drawShapeFaces(ctx, projectedVerts, frontFaces, dynamicHpGrad, 0.2);
    }
};

const drawEnemyTooltip = (ctx, enemy, pos, size) => {
    const { TOOLTIP_WIDTH, TOOLTIP_HEIGHT, TOOLTIP_OFFSET, FONT_NAME, FONT_HP, COLOR_BG, COLOR_BORDER } = THEME.UI;
    
    const boxX = pos.x - TOOLTIP_WIDTH / 2;
    const boxY = pos.y - size * TOOLTIP_OFFSET - TOOLTIP_HEIGHT; 

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - size * 1.5); 
    ctx.lineTo(pos.x, boxY + TOOLTIP_HEIGHT);
    ctx.strokeStyle = COLOR_BORDER;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = COLOR_BG;
    ctx.strokeStyle = COLOR_BORDER;
    ctx.lineWidth = 1;
    ctx.fillRect(boxX, boxY, TOOLTIP_WIDTH, TOOLTIP_HEIGHT);
    ctx.strokeRect(boxX, boxY, TOOLTIP_WIDTH, TOOLTIP_HEIGHT);

    ctx.fillStyle = '#fff';
    ctx.font = FONT_NAME;
    ctx.textAlign = 'left';
    ctx.fillText(enemy.name, boxX + 10, boxY + 20);

    const barW = TOOLTIP_WIDTH - 20;
    const barH = 10;
    const barX = boxX + 10;
    const barY = boxY + 30;
    ctx.strokeStyle = '#555';
    ctx.strokeRect(barX, barY, barW, barH);

    const hpPct = enemy.hp / enemy.maxHp;
    ctx.fillStyle = hpPct > 0.5 ? '#00ff41' : (hpPct > 0.25 ? '#ffaa00' : '#ff0055');
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    ctx.fillStyle = '#aaa';
    ctx.font = FONT_HP;
    ctx.textAlign = 'right';
    ctx.fillText(`${enemy.hp} / ${enemy.maxHp}`, boxX + TOOLTIP_WIDTH - 10, boxY + 55);
};

export const drawEnemies = ({
  ctx, width, height, 
  enemies, visualStateRef, damageTimersRef, deathTimersRef, attackTimersRef,
  currentTarget, time, 
  onHitZoneUpdate 
}) => {
  const centerX = width / 2;
  const centerY = height * 0.35;
  const now = performance.now();
  const nextHitZones = {};

  enemies.forEach(enemy => {
    if (enemy.hp <= 0) {
        drawDeathEffect(ctx, enemy, deathTimersRef, visualStateRef, centerX, centerY, now);
        return; 
    }
    const viz = updateVisualState(enemy, visualStateRef, time);
    if (!viz) return;

    const idleOffset = Math.sin(time * THEME.ENEMY.IDLE_FREQ + viz.idlePhase) * THEME.ENEMY.IDLE_AMP; 
    const { offsetX, offsetY, offsetZ, isDamaged, isFiring, isCharging, attackTimer } = calculateCombatOffsets(enemy, attackTimersRef, damageTimersRef, time, now);

    const pos = project3D(viz.x + offsetX, viz.y + idleOffset + offsetY, viz.z + offsetZ, centerX, centerY);
    const uiSize = THEME.ENEMY.SCALE_UI * pos.scale; 
    const wireframeSize = uiSize * THEME.ENEMY.SCALE_WIRE; 

    nextHitZones[enemy.id] = { x: pos.x, y: pos.y, r: wireframeSize * THEME.ENEMY.HIT_RADIUS }; 

    if (isFiring) drawLaser(ctx, pos, attackTimer, width, height);

    const isTargeted = currentTarget === enemy.id;
    drawEnemyWireframe(ctx, enemy, pos, uiSize, wireframeSize, time, isTargeted, isDamaged, isFiring, isCharging);
    
    if (isTargeted) {
        drawEnemyTooltip(ctx, enemy, pos, uiSize);
    }
  });
  
  onHitZoneUpdate(nextHitZones);
};

export const drawFloatingText = (ctx, texts) => {
  texts.forEach(ft => {
    ft.update(); 
    ctx.save(); ctx.globalAlpha = ft.life; 
    const scale = 1 + Math.sin((1 - ft.life) * 15) * 0.3; 
    ctx.font = `bold ${60 * scale}px monospace`; ctx.textAlign = "center"; 
    ctx.shadowColor = 'black'; ctx.shadowBlur = 10; ctx.lineWidth = 5; ctx.strokeStyle = '#000';
    ctx.strokeText(ft.text, ft.x, ft.y); ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x, ft.y); 
    ctx.restore();
  });
};