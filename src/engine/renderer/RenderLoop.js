import { NUM_PARTICLES, THEME, FloatingText, Particle } from '../../game/constants';
import { audio } from '../audio/audio';
import { project3D, lerp } from './renderHelpers';
import { drawBackground, drawStars } from './layers/BackgroundLayer';
import { drawGrid } from './layers/EnvironmentLayer';
import { drawEnemies, drawPlayers } from './layers/EntityLayer';
import { drawFloatingText, drawSpeechBubble } from './layers/EffectLayer';

/**
 * PHASE 1: UPDATE
 * Handles all logic, physics, timers, and data mutations.
 * No Context (ctx) calls allowed here.
 */
export const update = (state, dt, width, height) => {
    // 1. Time & Warp
    const warpFactor = state.isWarping ? 10 : 1;
    const safeDt = Math.min(dt, 0.1);
    state.time += safeDt * 1.2 * warpFactor;

    // 2. Camera Drift Calculation
    const driftX = Math.sin(state.time * THEME.ENV.DRIFT_FREQ_X) * width * THEME.ENV.DRIFT_AMP;
    const driftY = Math.cos(state.time * THEME.ENV.DRIFT_FREQ_Y) * height * THEME.ENV.DRIFT_AMP;
    
    // Store camera in state for the draw phase
    state.camera = {
        x: (width / 2) + driftX,
        y: (height * 0.35) + driftY
    };

    // 3. Lerp Visual Positions (Smooth transitions)
    const targets = state.playerPositions; 
    const current = state.currentPositions;
    const lerpFactor = 0.1;

    Object.keys(targets).forEach(id => {
        if (!current[id]) {
            current[id] = { ...targets[id] };
        } else {
            current[id].x = lerp(current[id].x, targets[id].x, lerpFactor);
            current[id].width = lerp(current[id].width, targets[id].width, lerpFactor);
        }
    });
    
    // Garbage Collect old positions
    Object.keys(current).forEach(id => {
        if (!targets[id]) delete current[id];
    });

    // 4. Particle System Update
    if (state.particles.length === 0) {
        state.particles = Array.from({ length: NUM_PARTICLES }, () => new Particle(width, height));
    }
    state.particles.forEach(p => p.update(width, height, warpFactor));

    // 5. Speech Logic
    const s = state.speech;
    if (s.activeId && state.enemies) {
        const now = performance.now();
        if (s.index < s.fullText.length) {
            if (now - s.lastUpdate > 40) {
                s.displayed += s.fullText[s.index];
                if (s.fullText[s.index] !== ' ') {
                    const type = state.enemies.find(e => e.id === s.activeId)?.name || 'glitch';
                    audio.speak(s.fullText[s.index], type.toLowerCase().includes('trojan') ? 'trojan' : 'glitch');
                }
                s.index++;
                s.lastUpdate = now;
            }
        } 
    }

    // 6. Floating Text & Damage Numbers Logic
    const now = performance.now();

    // Spawn Pending Damage Text (Enemies)
    state.enemies.forEach(enemy => {
        const pending = state.pendingDamage[enemy.id];
        if (pending) {
            const viz = state.visualState[enemy.id];
            if (viz) {
                const pos = project3D(viz.x, viz.y, viz.z, state.camera.x, state.camera.y);
                const size = THEME.ENEMY.SCALE_UI * pos.scale;
                state.floatingTexts.push(new FloatingText(pos.x, pos.y - size - 40, `${pending.val}`, '#ff0000'));
                
                const critKey = `${enemy.id}_${now}`;
                if (enemy.lastCrit && !state.displayedCrits[critKey]) {
                    state.floatingTexts.push(new FloatingText(pos.x, pos.y - size - 100, 'CRITICAL', '#ffff00'));
                    state.displayedCrits[critKey] = true;
                }
            }
            delete state.pendingDamage[enemy.id];
        }
    });

    // Spawn Pending Damage Text (Players)
    Object.values(state.players).forEach(player => {
        const pending = state.pendingDamage[player.id];
        if (pending) {
            const posData = state.currentPositions[player.id];
            const screenX = posData ? posData.x : (width / 2);
            const screenY = height - THEME.PLAYER.BOTTOM_OFFSET;
            
            state.floatingTexts.push(new FloatingText(screenX, screenY, `${pending.val}`, '#ff0000'));
            
            const critKey = `${player.id}_${now}`;
            if (player.lastCrit && !state.displayedCrits[critKey]) {
                state.floatingTexts.push(new FloatingText(screenX, screenY - 60, 'CRITICAL', '#ffff00'));
                state.displayedCrits[critKey] = true;
            }
            delete state.pendingDamage[player.id];
        }
    });

    // Physics Update for Floating Texts
    state.floatingTexts = state.floatingTexts.filter(ft => {
        ft.update(); // Update velocity/life
        return ft.life > 0;
    });
    
    // Safety cap
    if (state.floatingTexts.length > 20) {
        state.floatingTexts = state.floatingTexts.slice(-20);
    }
};

/**
 * PHASE 2: DRAW
 * Pure rendering. No state mutations allowed.
 */
export const draw = (ctx, state, width, height) => {
    // 1. Background Layers
    drawBackground(ctx, width, height);
    
    // Pass pre-calculated camera from update phase
    const { x: cameraX, y: cameraY } = state.camera;
    const warpFactor = state.isWarping ? 10 : 1;

    // Note: drawStars now only draws, since update() handled position changes
    // We pass the particles array which was updated in the previous step
    drawStars(ctx, state.particles, width, height, warpFactor, cameraX, cameraY);
    
    drawGrid(ctx, width, height, state.depth, state.gradientCache, state.time, cameraX, cameraY);

    // 2. Entities
    // Note: drawEnemies still does some 3D projection logic internally for hit detection
    drawEnemies({
        ctx, width, height,
        enemies: state.enemies,
        players: state.players,
        visualStateRef: { current: state.visualState }, 
        damageTimersRef: { current: state.damageTimers },
        deathTimersRef: { current: state.deathTimers },
        attackTimersRef: { current: state.attackTimers },
        currentTarget: state.targetedEnemy,
        time: state.time,
        onHitZoneUpdate: (zones) => { state.hitZones = zones; },
        playerPositions: state.currentPositions,
        cameraX, cameraY
    });

    if (!state.isWarping) {
        drawPlayers({
            ctx, width, height,
            players: state.players,
            visualSeed: state.visualSeed,
            time: state.time,
            uiScale: state.uiScale,
            playerPositions: state.currentPositions
        });
    }

    // 3. UI Effects
    const s = state.speech;
    if (s.activeId && s.displayed) {
        const viz = state.visualState[s.activeId];
        if (viz) {
            const idleOffset = Math.sin(state.time * THEME.ENEMY.IDLE_FREQ + viz.idlePhase) * THEME.ENEMY.IDLE_AMP;
            const pos = project3D(viz.x, viz.y + idleOffset, viz.z, cameraX, cameraY);
            const size = THEME.ENEMY.SCALE_UI * pos.scale;
            drawSpeechBubble(ctx, pos.x, pos.y - size * 1.1, s.displayed);
        }
    }

    drawFloatingText(ctx, state.floatingTexts);
};

// Main Driver
export const drawFrame = (ctx, width, height, dt, state) => {
    update(state, dt, width, height);
    draw(ctx, state, width, height);
};