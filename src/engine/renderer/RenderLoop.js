import { NUM_PARTICLES, THEME, FloatingText, Particle } from '../../game/constants';
import { audio } from '../audio/audio';
import { project3D, lerp } from './renderHelpers';
import { drawBackground, drawStars } from './layers/BackgroundLayer';
import { drawGrid } from './layers/EnvironmentLayer';
import { drawEnemies, drawPlayers } from './layers/EntityLayer';
import { drawFloatingText, drawSpeechBubble, drawFPS } from './layers/EffectLayer';

// OPTIMIZATION: Object Pool for damage numbers
// Pre-allocate 50 text objects. We will recycle these.
const TEXT_POOL = Array.from({ length: 50 }, () => new FloatingText());

const spawnFloatingText = (x, y, text, color) => {
    // Find first inactive text in pool
    const ft = TEXT_POOL.find(t => !t.active);
    if (ft) {
        ft.spawn(x, y, text, color);
    }
    // If pool is full, we just skip drawing (better than lagging)
};

export const update = (state, dt, width, height) => {
    const warpFactor = state.isWarping ? 10 : 1;
    const safeDt = Math.min(dt, 0.1);
    state.time += safeDt * 1.2 * warpFactor;

    const driftX = Math.sin(state.time * THEME.ENV.DRIFT_FREQ_X) * width * THEME.ENV.DRIFT_AMP;
    const driftY = Math.cos(state.time * THEME.ENV.DRIFT_FREQ_Y) * height * THEME.ENV.DRIFT_AMP;
    
    state.camera = {
        x: (width / 2) + driftX,
        y: (height * 0.35) + driftY
    };

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
    
    Object.keys(current).forEach(id => {
        if (!targets[id]) delete current[id];
    });

    if (state.particles.length === 0) {
        state.particles = Array.from({ length: NUM_PARTICLES }, () => new Particle(width, height));
    }
    state.particles.forEach(p => p.update(width, height, warpFactor));

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

    const now = performance.now();

    // Spawn Pending Damage Text (Enemies)
    // OPTIMIZATION: Use Pool instead of new FloatingText()
    state.enemies.forEach(enemy => {
        const pending = state.pendingDamage[enemy.id];
        if (pending) {
            const viz = state.visualState[enemy.id];
            if (viz) {
                const pos = project3D(viz.x, viz.y, viz.z, state.camera.x, state.camera.y);
                const size = THEME.ENEMY.SCALE_UI * pos.scale;
                
                spawnFloatingText(pos.x, pos.y - size - 40, `${pending.val}`, '#ff0000');
                
                const critKey = `${enemy.id}_${now}`;
                if (enemy.lastCrit && !state.displayedCrits[critKey]) {
                    spawnFloatingText(pos.x, pos.y - size - 100, 'CRITICAL', '#ffff00');
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
            
            spawnFloatingText(screenX, screenY, `${pending.val}`, '#ff0000');
            
            const critKey = `${player.id}_${now}`;
            if (player.lastCrit && !state.displayedCrits[critKey]) {
                spawnFloatingText(screenX, screenY - 60, 'CRITICAL', '#ffff00');
                state.displayedCrits[critKey] = true;
            }
            delete state.pendingDamage[player.id];
        }
    });

    // Physics Update for Floating Texts
    // We update the entire pool, but only active ones do math
    TEXT_POOL.forEach(ft => ft.update());

    // Update debug stats
    if (state.perf) {
        state.perf.particleCount = state.particles.length;
        state.perf.textCount = TEXT_POOL.filter(t => t.active).length;
    }
};

export const draw = (ctx, state, width, height) => {
    drawBackground(ctx, width, height);
    
    const { x: cameraX, y: cameraY } = state.camera;
    const warpFactor = state.isWarping ? 10 : 1;

    drawStars(ctx, state.particles, width, height, warpFactor, cameraX, cameraY);
    
    drawGrid(ctx, width, height, state.depth, state.gradientCache, state.time, cameraX, cameraY);

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

    // Pass the entire pool to the drawer
    drawFloatingText(ctx, TEXT_POOL);

    if (state.perf) {
        drawFPS(ctx, state.perf, width, height);
    }
};

export const drawFrame = (ctx, width, height, dt, state) => {
    update(state, dt, width, height);
    draw(ctx, state, width, height);
};