import { GLITCH_CHARS, SHAPES, CLASSES, THEME } from '../../../game/constants';
import { rotateVertices } from '../../../utils/math';
import { project3D, drawShapeFaces, lerp } from '../renderHelpers';

// ... (Keep updateVisualState, drawCoreGlow, drawDeathEffect, calculateCombatOffsets unchanged) ...
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

const drawCoreGlow = (ctx, x, y, size, color) => {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.6);
    grad.addColorStop(0, '#ffffff'); // White hot center
    grad.addColorStop(0.3, color);   // Player color
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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

// --- UPDATED LASER DRAWING ---
const drawLaser = (ctx, pos, attackTimer, width, height, players, playerPositions) => {
    if (!attackTimer) return;
    
    // Find target position
    const targetPos = playerPositions ? playerPositions[attackTimer.targetId] : null;
    if (!targetPos) return;

    const playerX = targetPos.x;
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
        x: pos.x + v.x * wireframeSize, y: pos.y + v.y * wireframeSize 
    }));
    
    let minY = Infinity, maxY = -Infinity;
    projectedVerts.forEach(p => {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });
    const boundTop = minY;
    const boundBot = maxY;
    const dynamicHpGrad = ctx.createLinearGradient(0, boundTop, 0, boundBot);
    dynamicHpGrad.addColorStop(0, '#333333'); 
    dynamicHpGrad.addColorStop(Math.max(0, split - 0.01), '#333333');
    dynamicHpGrad.addColorStop(Math.min(1, split + 0.01), mainColor);
    dynamicHpGrad.addColorStop(1, mainColor);

    if (isDamaged) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const shake = 8;
        ctx.save(); ctx.translate(-shake, 0);
        drawShapeFaces(ctx, projectedVerts, backFaces, '#ff0000', 0.5, '#ff0000');
        drawShapeFaces(ctx, projectedVerts, frontFaces, '#ff0000', 0.5, '#ff0000');
        ctx.restore();
        ctx.save(); ctx.translate(shake, 0);
        drawShapeFaces(ctx, projectedVerts, backFaces, '#0000ff', 0.5, '#0000ff');
        drawShapeFaces(ctx, projectedVerts, frontFaces, '#0000ff', 0.5, '#0000ff');
        ctx.restore();
        drawShapeFaces(ctx, projectedVerts, backFaces, '#00ff00', 0.5, '#00ff00');
        drawShapeFaces(ctx, projectedVerts, frontFaces, '#00ff00', 0.5, '#00ff00');
        ctx.restore();
    } else {
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
  enemies, players, 
  visualStateRef, damageTimersRef, deathTimersRef, attackTimersRef,
  currentTarget, time, onHitZoneUpdate, playerPositions 
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
    
    if (isFiring) drawLaser(ctx, pos, attackTimer, width, height, players, playerPositions);
    
    const isTargeted = currentTarget === enemy.id;
    drawEnemyWireframe(ctx, enemy, pos, uiSize, wireframeSize, time, isTargeted, isDamaged, isFiring, isCharging);
    if (isTargeted) { drawEnemyTooltip(ctx, enemy, pos, uiSize); }
  });
  onHitZoneUpdate(nextHitZones);
};

// --- UPDATED: DRAW PLAYERS WITH FLUID LAYOUT ---
export const drawPlayers = ({ ctx, width, height, players, visualSeed, time, uiScale = 1, playerPositions = {} }) => {
    const { 
        BOTTOM_OFFSET, BASE_SIZE, ROTATION_SPEED, 
        FLOAT_FREQ, FLOAT_AMP, SWAY_FREQ, SWAY_AMP_X, SWAY_AMP_SCALE, 
        MAG_PRIMARY, MAG_SECONDARY 
    } = THEME.PLAYER;
    
    const avatarY = height - BOTTOM_OFFSET; 

    const random = (modifier, totalSeed) => { 
        const x = Math.sin(totalSeed + modifier) * 10000; 
        return x - Math.floor(x); 
    };

    Object.values(players).forEach((player, index) => {
        // Use calculated positions from Board
        const posData = playerPositions[player.id];
        if (!posData) return;

        const finalX = posData.x; // Center X
        
        // Scale visuals based on card width ratio
        // Standard card is ~150px, if active (wide) we might scale up slightly
        const scaleRatio = Math.min(1.3, Math.max(0.8, posData.width / 200)); 
        const currentBaseSize = BASE_SIZE * scaleRatio;

        // Standard animations
        const floatY = Math.sin((time * FLOAT_FREQ) + (index * 1.5)) * FLOAT_AMP; 

        const idNum = parseInt(player.id) || 0;
        const totalSeed = (idNum * 2) + visualSeed;

        const classDef = CLASSES[player.classID] || CLASSES.firewall;
        const mainColor = classDef.color;
        
        const primaryShapeKey = classDef.shapes[0] || 'cube';
        const secondaryShapeKey = classDef.shapes[1] || 'cube';
        const primaryShape = SHAPES[primaryShapeKey];
        const secondaryShape = SHAPES[secondaryShapeKey];
        const secondaryScale = 0.90 + random(400, totalSeed) * 0.20;

        const pMag = MAG_PRIMARY + random(90, totalSeed) * 0.002;
        const pRotX = pMag * (random(100, totalSeed) > 0.5 ? 1 : -1); 
        const pRotY = pMag * (random(101, totalSeed) > 0.5 ? 1 : -1); 
        const pRotZ = (pMag * 0.5) * (random(106, totalSeed) > 0.5 ? 1 : -1); 

        const sMag = MAG_SECONDARY + random(95, totalSeed) * 0.003;
        const sRotX = sMag * (random(102, totalSeed) > 0.5 ? 1 : -1); 
        const sRotY = sMag * (random(103, totalSeed) > 0.5 ? 1 : -1); 
        const sRotZ = sMag * (random(107, totalSeed) > 0.5 ? 1 : -1); 

        drawCoreGlow(ctx, finalX, avatarY + floatY, currentBaseSize, mainColor);

        const renderShape = (vertices, faces, sx, sy, sz, scale, color, isSecondary, strokeColor) => {
            const angleX = time * ROTATION_SPEED * sx; 
            const angleY = time * ROTATION_SPEED * sy + (isSecondary ? 1.0 : 0);
            const angleZ = time * ROTATION_SPEED * sz;
            
            const renderSize = currentBaseSize * scale;
            
            const transformed = rotateVertices(vertices, angleX, angleY, angleZ);
            const projected = transformed.map(v => ({
                x: finalX + v.x * renderSize,
                y: avatarY + v.y * renderSize + floatY
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
                drawShapeFaces(ctx, projected, sortedFaces, color, alpha, strokeColor);
                ctx.globalCompositeOperation = prevComp;
            } else {
                drawShapeFaces(ctx, projected, sortedFaces, color, 0.3, strokeColor);
            }
        };

        if (primaryShape) renderShape(primaryShape.vertices, primaryShape.faces, pRotX, pRotY, pRotZ, 1.0, mainColor, false, mainColor);
        if (secondaryShape) renderShape(secondaryShape.vertices, secondaryShape.faces, sRotX, sRotY, sRotZ, secondaryScale, mainColor, true, mainColor);
    });
};