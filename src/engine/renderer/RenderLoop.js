import { NUM_PARTICLES, THEME, FloatingText, Particle } from '../../game/constants';
import { audio } from '../audio/audio';
import { project3D, lerp } from './renderHelpers';
import { drawBackground, drawStars } from './layers/BackgroundLayer';
import { drawGrid } from './layers/EnvironmentLayer';
import { drawEnemies, drawPlayers } from './layers/EntityLayer';
import { drawFloatingText, drawSpeechBubble } from './layers/EffectLayer';

export const drawFrame = (ctx, width, height, dt, state) => {
    // 1. Update Time
    const warpFactor = state.isWarping ? 10 : 1;
    const safeDt = Math.min(dt, 0.1);
    state.time += safeDt * 1.2 * warpFactor;

    // 2. Lerp Visual Positions (Slide vs Snap)
    const targets = state.playerPositions; // Target positions from FluidLayout
    const current = state.currentPositions; // Visual positions
    const lerpFactor = 0.1;

    Object.keys(targets).forEach(id => {
        if (!current[id]) {
            current[id] = { ...targets[id] };
        } else {
            current[id].x = lerp(current[id].x, targets[id].x, lerpFactor);
            current[id].width = lerp(current[id].width, targets[id].width, lerpFactor);
        }
    });
    
    // Cleanup old keys
    Object.keys(current).forEach(id => {
        if (!targets[id]) delete current[id];
    });

    // 3. Draw Layers
    drawBackground(ctx, width, height);
    
    // Ensure particles exist
    if (state.particles.length === 0) {
        state.particles = Array.from({ length: NUM_PARTICLES }, () => new Particle(width, height));
    }
    drawStars(ctx, state.particles, width, height, warpFactor);
    drawGrid(ctx, width, height, state.depth, state.gradientCache, state.time);

    // 4. Draw Entities
    drawEnemies({
        ctx, width, height,
        enemies: state.enemies,
        players: state.players,
        visualStateRef: { current: state.visualState }, // Adapter for existing layer signature
        damageTimersRef: { current: state.damageTimers },
        deathTimersRef: { current: state.deathTimers },
        attackTimersRef: { current: state.attackTimers },
        currentTarget: state.targetedEnemy,
        time: state.time,
        onHitZoneUpdate: (zones) => { state.hitZones = zones; },
        playerPositions: state.currentPositions
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

    // 5. Speech System
    const s = state.speech;
    if (s.activeId && state.enemies) {
        const now = performance.now();
        if (s.index < s.fullText.length) {
            if (now - s.lastUpdate > 40) {
                s.displayed += s.fullText[s.index];
                if (s.fullText[s.index] !== ' ') {
                    const type = state.enemies.find(e => e.id === s.activeId)?.name || 'glitch';
                    // Side-effect: Audio call allowed here as it's tied to frame timing
                    audio.speak(s.fullText[s.index], type.toLowerCase().includes('trojan') ? 'trojan' : 'glitch');
                }
                s.index++;
                s.lastUpdate = now;
            }
        } 
        // Note: Completion timer logic handled in main component or simplified here

        const viz = state.visualState[s.activeId];
        if (viz) {
            const idleOffset = Math.sin(state.time * THEME.ENEMY.IDLE_FREQ + viz.idlePhase) * THEME.ENEMY.IDLE_AMP;
            const pos = project3D(viz.x, viz.y + idleOffset, viz.z, width / 2, height * 0.35);
            const size = THEME.ENEMY.SCALE_UI * pos.scale;
            drawSpeechBubble(ctx, pos.x, pos.y - size * 1.1, s.displayed);
        }
    }

    // 6. Floating Text & Damage Numbers
    const now = performance.now();
    const centerX = width / 2;
    const centerY = height * 0.35;

    // Process Pending Damage (Enemies)
    state.enemies.forEach(enemy => {
        const pending = state.pendingDamage[enemy.id];
        if (pending) {
            const viz = state.visualState[enemy.id];
            if (viz) {
                const pos = project3D(viz.x, viz.y, viz.z, centerX, centerY);
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

    // Process Pending Damage (Players)
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

    // Update and Draw Texts
    state.floatingTexts = state.floatingTexts.filter(ft => ft.life > 0);
    if (state.floatingTexts.length > 20) state.floatingTexts = state.floatingTexts.slice(-20);
    
    drawFloatingText(ctx, state.floatingTexts);
};