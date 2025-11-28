import { GLITCH_CHARS, SHAPES, THEME } from '../../../game/constants';
import { CLASSES } from '../../../game/data/classes';
import { rotateVertices } from '../../../utils/math';
import { project3D, drawShapeFaces, lerp } from '../renderHelpers';

// Helper to check which faces are facing the camera (back-face culling logic)
const getVisibleFaces = (transformedVerts, faces) => {
    return faces.filter(face => {
        const v1 = transformedVerts[face.indices[0]];
        const v2 = transformedVerts[face.indices[1]];
        const v3 = transformedVerts[face.indices[2]];
        
        // Compute Normal Z component via Cross Product
        const ax = v2.x - v1.x, ay = v2.y - v1.y;
        const bx = v3.x - v1.x, by = v3.y - v1.y;
        const nz = ax * by - ay * bx; // Z component of normal
        
        // If Z > 0, face is pointing towards camera
        return nz > 0;
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

// --- NEW BOSS RENDERER (CLOUD) ---
// ADDED: isCharging, isFiring states
const drawAsciiBoss = (ctx, enemy, pos, size, time, isTargeted, isDamaged, damageElapsed, isCharging, isFiring) => {
    const { 
        COLOR, CHAR_O, PARTICLE_COUNT, CLOUD_RADIUS, 
        NOISE_SCALE, NOISE_SPEED, ROT_SPEED 
    } = THEME.BOSS;

    const toRad = (deg) => deg * Math.PI / 180;
    const phi = Math.PI * (3 - Math.sqrt(5)); 

    const particles = [];
    const rotY = time * ROT_SPEED;
    const rotX = Math.sin(time * 0.5) * 0.2;

    // --- COLOR LOGIC FOR ATTACK ---
    // Default red
    let r = 255, g = 0, b = 0; 
    
    if (isCharging) {
        // Pulse white/red
        const pulse = Math.sin(time * 20) * 0.5 + 0.5;
        g = 150 * pulse;
        b = 150 * pulse;
    }
    if (isFiring) {
        // Intense bright white/red mix
        g = 200;
        b = 200;
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Safe spherical distribution
        const yBase = 1 - (i / Math.max(1, PARTICLE_COUNT - 1)) * 2; 
        const radiusAtY = Math.sqrt(Math.max(0, 1 - yBase * yBase)); // Safety clamp
        const theta = phi * i;
        
        const xBase = Math.cos(theta) * radiusAtY;
        const zBase = Math.sin(theta) * radiusAtY;

        const noise = Math.sin(time * NOISE_SPEED + i * 0.1) * NOISE_SCALE;
        const radius = CLOUD_RADIUS + noise;

        const x = xBase * radius;
        const y = yBase * radius;
        const z = zBase * radius;

        // Manual Rotation
        const x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
        const z1 = x * Math.sin(rotY) + z * Math.cos(rotY);
        const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);

        particles.push({ x: x1, y: y2, z: z2, i });
    }

    particles.sort((a, b) => b.z - a.z); 

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    particles.forEach(p => {
        // Safe projection using current pos scale
        const screenX = pos.x + p.x * pos.scale;
        const screenY = pos.y + p.y * pos.scale;
        
        const alpha = Math.max(0.1, Math.min(1, 1 - (p.z / CLOUD_RADIUS) * 0.5));
        
        // Increase font size slightly to ensure visibility
        const fontSize = Math.max(12, 30 * pos.scale * (1 - p.z/2000)); 

        ctx.font = `bold ${fontSize}px monospace`;
        
        if (isDamaged) {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        } else {
            // Apply dynamic attack color
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        const char = CHAR_O && CHAR_O.length > 0 ? CHAR_O[p.i % CHAR_O.length] : '0';
        ctx.fillText(char, screenX, screenY);
    });

    if (isTargeted) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const breathe = Math.sin(time * 3) * 10;
        ctx.arc(pos.x, pos.y, (CLOUD_RADIUS * pos.scale) + breathe, 0, Math.PI * 2);
        ctx.stroke();
    }
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
        
        const size = 112.5 * pos.scale; 
        
        ctx.fillStyle = '#ff0000'; 
        ctx.font = `bold ${size * 0.5}px monospace`;
        const seed = enemy.id.charCodeAt(0);
        
        for(let k=0; k<5; k++) {
            const char = GLITCH_CHARS[(seed + k) % GLITCH_CHARS.length];
            const gx = pos.x + (Math.random()-0.5) * size * 1.5;
            const gy = pos.y + (Math.random()-0.5) * size * 1.5;
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
    
    let damageElapsed = 0, isDamaged = false;
    const isCharging = enemy.isCharging;
    
    const damageTimer = damageTimersRef.current[enemy.id];
    if (damageTimer && (now - damageTimer < 500)) {
      isDamaged = true; 
      damageElapsed = now - damageTimer; 
    } else if (damageTimer) { delete damageTimersRef.current[enemy.id]; }
    
    return { offsetX: 0, offsetY: 0, offsetZ: 0, isDamaged, damageElapsed, isFiring, isCharging, attackTimer };
};

// ADDED: thickness parameter
const drawLaser = (ctx, pos, attackTimer, width, height, players, playerPositions, thickness = 4) => {
    if (!attackTimer) return;
    const targetPos = playerPositions ? playerPositions[attackTimer.targetId] : null;
    if (!targetPos) return;

    const playerX = targetPos.x;
    const playerY = height - THEME.PLAYER.BOTTOM_OFFSET; 
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(playerX, playerY);
    ctx.strokeStyle = THEME.COMBAT.LASER_COLOR; 
    // Use thickness
    ctx.lineWidth = thickness + Math.random() * 4;
    ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000';
    ctx.stroke(); ctx.shadowBlur = 0;
};

const drawEnemyWireframe = (ctx, enemy, pos, size, wireframeSize, time, isTargeted, isDamaged, damageElapsed, isFiring, isCharging) => {
    const baseShape = SHAPES.octahedron; 
    
    let mainColor = '#ff0055'; 
    let wireAlpha = 0.3;
    let coreVisible = true;

    // 1. Color & State Logic
    if (isCharging) {
        const chargePulse = (Math.sin(time * 20) + 1) / 2; 
        mainColor = chargePulse > 0.5 ? '#ff0000' : '#ff0055';
        wireAlpha = 0.6 + (chargePulse * 0.4); 
    } else if (isFiring) {
        mainColor = '#ff0000';
        wireAlpha = 1.0;
    }
    
    if (isDamaged) {
        if (damageElapsed < 150) {
            wireAlpha = 0.0; 
            coreVisible = true; 
        } else {
            mainColor = '#ff0000'; 
            wireAlpha = 1.0;       
            const fade = 1 - ((damageElapsed - 150) / 350);
            wireAlpha = Math.max(0.3, fade);
        }
    }

    // 2. Rotation & Projection
    const hpPct = enemy.hp / enemy.maxHp;
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
    
    // 3. Gradient Calculation (HP Fill)
    let minY = Infinity, maxY = -Infinity;
    projectedVerts.forEach(p => {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });
    if (maxY - minY < 1) maxY = minY + 1;

    // Gradient: Dark at top (empty), Main Color at bottom (full)
    const split = 1 - hpPct; 
    const hpGrad = ctx.createLinearGradient(0, minY, 0, maxY);
    
    // "Empty" part (Top)
    hpGrad.addColorStop(0, '#220011'); 
    hpGrad.addColorStop(Math.max(0, split - 0.05), '#220011');
    // Transition
    hpGrad.addColorStop(Math.min(1, split + 0.05), mainColor);
    // "Filled" part (Bottom)
    hpGrad.addColorStop(1, mainColor);

    // 4. Draw Back Faces
    if (wireAlpha > 0) {
        drawShapeFaces(ctx, projectedVerts, backFaces, hpGrad, wireAlpha * 0.3, mainColor); 
    }

    // 5. Draw Core
    ctx.save();
    ctx.translate(pos.x, pos.y);
    
    if (isTargeted) {
        ctx.save(); ctx.rotate(time * 2); ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 2;
        ctx.shadowBlur = 15; ctx.shadowColor = '#00FFFF';
        const r = wireframeSize * 0.8; 
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke(); ctx.restore();
    }

    if (coreVisible) {
        const pulse = 1.0 + Math.sin(time * 8) * 0.3;
        const coreRadius = size * 0.6 * pulse;
        const coreAlpha = 0.2 + (0.7 * hpPct);
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
        glowGrad.addColorStop(0, `rgba(255,255,255,${coreAlpha})`); 
        glowGrad.addColorStop(0.4, '#ff0055'); 
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)'); 
        ctx.fillStyle = glowGrad; 
        ctx.globalAlpha = coreAlpha;
        ctx.beginPath(); ctx.arc(0, 0, coreRadius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); 

    // 6. Draw Front Faces
    if (wireAlpha > 0) {
        drawShapeFaces(ctx, projectedVerts, frontFaces, hpGrad, wireAlpha * 0.5, mainColor);
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
  currentTarget, time, onHitZoneUpdate, playerPositions,
  cameraX, cameraY // Use passed camera coords
}) => {
  const centerX = cameraX; // Use drift camera
  const centerY = cameraY;
  const now = performance.now();
  const nextHitZones = {};

  enemies.forEach(enemy => {
    if (enemy.hp <= 0) {
        drawDeathEffect(ctx, enemy, deathTimersRef, visualStateRef, centerX, centerY, now);
        return; 
    }
    const viz = updateVisualState(enemy, visualStateRef, time);
    if (!viz) return;
    
    const { offsetX, offsetY, offsetZ, isDamaged, damageElapsed, isFiring, isCharging, attackTimer } = calculateCombatOffsets(enemy, attackTimersRef, damageTimersRef, time, now);
    
    // Position Projection
    const idleOffset = Math.sin(time * THEME.ENEMY.IDLE_FREQ + viz.idlePhase) * THEME.ENEMY.IDLE_AMP; 
    const pos = project3D(viz.x + offsetX, viz.y + idleOffset + offsetY, viz.z + offsetZ, centerX, centerY);
    const uiSize = THEME.ENEMY.SCALE_UI * pos.scale; 
    const isTargeted = currentTarget === enemy.id;

    // --- RENDER BRANCH ---
    if (enemy.type === 'boss') {
        // Larger hitzone for boss
        nextHitZones[enemy.id] = { x: pos.x, y: pos.y, r: 150 }; // Fixed large hitzone
        
        // ADDED: Pass charging/firing state
        drawAsciiBoss(ctx, enemy, pos, uiSize, time, isTargeted, isDamaged, damageElapsed, isCharging, isFiring);
        
        if (isTargeted) {
            drawEnemyTooltip(ctx, enemy, { x: pos.x, y: pos.y + 180 }, 30); 
        }

    } else {
        // Normal Enemies
        const wireframeSize = uiSize * THEME.ENEMY.SCALE_WIRE; 
        nextHitZones[enemy.id] = { x: pos.x, y: pos.y, r: wireframeSize * THEME.ENEMY.HIT_RADIUS }; 
        
        drawEnemyWireframe(ctx, enemy, pos, uiSize, wireframeSize, time, isTargeted, isDamaged, damageElapsed, isFiring, isCharging);
        if (isTargeted) drawEnemyTooltip(ctx, enemy, pos, uiSize);
    }
    
    // Laser Draw (Shared)
    // ADDED: Select Laser Width
    const beamWidth = (enemy.type === 'boss') ? THEME.COMBAT.LASER_WIDTH_BOSS : THEME.COMBAT.LASER_WIDTH;
    if (isFiring) drawLaser(ctx, pos, attackTimer, width, height, players, playerPositions, beamWidth);
  });
  
  onHitZoneUpdate(nextHitZones);
};

export const drawPlayers = ({ ctx, width, height, players, visualSeed, time, uiScale = 1, playerPositions = {} }) => {
    const { 
        BOTTOM_OFFSET, BASE_SIZE, ROTATION_SPEED, 
        FLOAT_FREQ, FLOAT_AMP, MAG_PRIMARY, MAG_SECONDARY 
    } = THEME.PLAYER;
    
    const avatarY = height - BOTTOM_OFFSET; 

    const random = (modifier, totalSeed) => { 
        const x = Math.sin(totalSeed + modifier) * 10000; 
        return x - Math.floor(x); 
    };

    Object.values(players).forEach((player, index) => {
        const posData = playerPositions[player.id];
        if (!posData) return;

        const finalX = posData.x; 
        
        const scaleRatio = Math.min(1.3, Math.max(0.8, posData.width / 200)); 
        const currentBaseSize = BASE_SIZE * scaleRatio;

        const floatY = Math.sin((time * FLOAT_FREQ) + (index * 1.5)) * FLOAT_AMP; 

        const idNum = parseInt(player.id) || 0;
        const totalSeed = (idNum * 2) + visualSeed;

        const classDef = typeof CLASSES !== 'undefined' ? (CLASSES[player.classID] || CLASSES.firewall) : { color: '#00ff41', shapes: ['cube'] };
        const mainColor = classDef.color || '#00ff41';
        
        const primaryShapeKey = classDef.shapes ? classDef.shapes[0] : 'cube';
        const secondaryShapeKey = classDef.shapes ? classDef.shapes[1] : 'cube';
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