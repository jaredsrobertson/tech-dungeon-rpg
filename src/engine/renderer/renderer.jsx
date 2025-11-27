import React, { useEffect, useRef } from 'react';
import { NUM_PARTICLES, TARGET_FPS, Particle, FloatingText, THEME } from '../../game/constants';
import { audio } from '../audio/audio';

// NEW MODULAR IMPORTS
import { project3D, lerp } from './renderHelpers';
import { drawBackground, drawStars } from './layers/BackgroundLayer';
import { drawGrid } from './layers/EnvironmentLayer';
import { drawEnemies, drawPlayers } from './layers/EntityLayer';
import { drawFloatingText, drawSpeechBubble } from './layers/EffectLayer';

export const TunnelRenderer = React.memo(({ 
  enemies = [], 
  players = {}, 
  targetedEnemy = null, 
  activeEntity = null, 
  isTransitioning = false, 
  isWarping = false, 
  depth = 1, 
  visualSeed = 0, 
  speakingId = null, 
  speechText = '', 
  onSpeechEnd = null, 
  onEnemyClick = () => {}, 
  onEnemyHover = () => {}, 
  onBackgroundClick = () => {}, 
  attackMode = false,
  uiScale = 1, 
  playerPositions = {} 
}) => {
  const canvasRef = useRef(null);
  
  const particlesRef = useRef([]); 
  const floatingTextsRef = useRef([]); 
  
  const animationFrameRef = useRef(null);
  const timeRef = useRef(0);       
  const prevTimeRef = useRef(0);   
  
  const hitZones = useRef({}); 
  const visualState = useRef({});
  const gradientCache = useRef([]);
  const lastHoveredRef = useRef(null);

  const enemiesRef = useRef(enemies);
  const playersRef = useRef(players); 
  const prevDepthRef = useRef(depth); 
  const targetedEnemyRef = useRef(targetedEnemy);
  const activeEntityRef = useRef(activeEntity);
  const isWarpingRef = useRef(isWarping);
  const lastActiveEnemyRef = useRef(null); // <--- RESTORED THIS LINE
  const uiScaleRef = useRef(uiScale); 
  const playerPositionsRef = useRef(playerPositions); 
  
  // NEW: Store current visual positions for lerping (Slide vs Snap)
  const currentPositionsRef = useRef({}); 

  const damageTimers = useRef({}); 
  const deathTimers = useRef({}); 
  const pendingDamageRef = useRef({}); 
  const displayedCritsRef = useRef({}); 
  const attackTimers = useRef({}); 

  const speechState = useRef({
      activeId: null,
      fullText: '',
      displayed: '',
      index: 0,
      lastUpdate: 0,
      completeTimer: null
  });

  // Update Refs when props change
  useEffect(() => { uiScaleRef.current = uiScale; }, [uiScale]);
  useEffect(() => { playerPositionsRef.current = playerPositions; }, [playerPositions]);

  useEffect(() => {
    if (depth !== prevDepthRef.current) {
        prevDepthRef.current = depth;
        visualState.current = {}; 
        hitZones.current = {};
        pendingDamageRef.current = {};
        damageTimers.current = {};
        deathTimers.current = {};
        displayedCritsRef.current = {}; 
        floatingTextsRef.current = [];
        attackTimers.current = {};
    }

    if (activeEntity && activeEntity.startsWith('e')) {
        lastActiveEnemyRef.current = activeEntity;
    }

    enemies.forEach(enemy => {
      const oldEnemy = enemiesRef.current.find(e => e.id === enemy.id);
      
      if (oldEnemy && enemy.hp < oldEnemy.hp) {
          damageTimers.current[enemy.id] = performance.now();
          pendingDamageRef.current[enemy.id] = { val: oldEnemy.hp - enemy.hp };
          audio.enemyDamaged(); 
      }
      if (enemy.hp <= 0 && oldEnemy && oldEnemy.hp > 0) {
          deathTimers.current[enemy.id] = performance.now();
          audio.enemyDeath(); 
      }
    });
    enemiesRef.current = enemies;
  }, [enemies, depth, activeEntity]);

  useEffect(() => {
    Object.values(players).forEach(player => {
        const prevPlayers = playersRef.current || {}; 
        const prev = prevPlayers[player.id];
        if (prev && prev.hp > 0 && player.hp < prev.hp) {
            damageTimers.current[player.id] = performance.now();
            pendingDamageRef.current[player.id] = { val: prev.hp - player.hp }; 
            audio.playerDamaged(); 
            const attackerId = lastActiveEnemyRef.current;
            if (attackerId) {
                attackTimers.current[attackerId] = { targetId: player.id, start: performance.now() };
            }
        }
        if (prev && prev.hp > 0 && player.hp === 0) { audio.playerDeath(); }
    });
    playersRef.current = players;
  }, [players]);

  useEffect(() => { targetedEnemyRef.current = targetedEnemy; }, [targetedEnemy]);
  useEffect(() => { activeEntityRef.current = activeEntity; }, [activeEntity]);
  useEffect(() => { isWarpingRef.current = isWarping; }, [isWarping]);

  useEffect(() => {
      if (speakingId !== speechState.current.activeId || speechText !== speechState.current.fullText) {
          speechState.current = {
              activeId: speakingId,
              fullText: speechText,
              displayed: '',
              index: 0,
              lastUpdate: performance.now(),
              completeTimer: null
          };
      }
  }, [speakingId, speechText]);

  const handleCanvasMouseMove = (e) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      
      let foundId = null;
      const ids = Object.keys(hitZones.current);
      for (let i = ids.length - 1; i >= 0; i--) {
          const id = ids[i];
          const zone = hitZones.current[id];
          const dist = Math.sqrt(Math.pow(mx - zone.x, 2) + Math.pow(my - zone.y, 2));
          if (dist <= zone.r) { foundId = id; break; }
      }
      document.body.style.cursor = foundId ? (attackMode ? 'crosshair' : 'pointer') : 'default';
      
      if (foundId !== lastHoveredRef.current) {
          lastHoveredRef.current = foundId;
          onEnemyHover(foundId);
      }
  };

  const handleCanvasClick = (e) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let hit = false;
      const ids = Object.keys(hitZones.current);
      for (let i = ids.length - 1; i >= 0; i--) {
          const id = ids[i];
          const zone = hitZones.current[id];
          const dist = Math.sqrt(Math.pow(mx - zone.x, 2) + Math.pow(my - zone.y, 2));
          if (dist <= zone.r) { onEnemyClick(id); hit = true; break; }
      }
      if (!hit) onBackgroundClick();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }); 

    const resize = () => {
      const dpr = 0.75; 
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      
      if (particlesRef.current.length === 0) {
          particlesRef.current = Array.from({ length: NUM_PARTICLES }, () => new Particle(window.innerWidth, window.innerHeight));
      }
      gradientCache.current = [];
    };

    const draw = (timestamp) => {
      animationFrameRef.current = requestAnimationFrame(draw);
      if (!prevTimeRef.current) prevTimeRef.current = timestamp;
      const dt = (timestamp - prevTimeRef.current) / 1000;
      prevTimeRef.current = timestamp;
      const safeDt = Math.min(dt, 0.1);

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const warpFactor = isWarpingRef.current ? 10 : 1; 
      
      timeRef.current += safeDt * 1.2 * warpFactor;

      // --- LERP VISUAL POSITIONS ---
      const targets = playerPositionsRef.current;
      const current = currentPositionsRef.current;
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

      drawBackground(ctx, width, height);
      drawStars(ctx, particlesRef.current, width, height, warpFactor);
      drawGrid(ctx, width, height, depth, gradientCache, timeRef.current);

      drawEnemies({
          ctx, width, height,
          enemies: enemiesRef.current,
          players: playersRef.current,
          visualStateRef: visualState,
          damageTimersRef: damageTimers,
          deathTimersRef: deathTimers,
          attackTimersRef: attackTimers,
          currentTarget: targetedEnemyRef.current,
          time: timeRef.current,
          onHitZoneUpdate: (zones) => { hitZones.current = zones; },
          playerPositions: currentPositionsRef.current 
      });

      if (!isWarpingRef.current) {
          drawPlayers({
              ctx, width, height,
              players: playersRef.current,
              visualSeed,
              time: timeRef.current,
              uiScale: uiScaleRef.current, 
              playerPositions: currentPositionsRef.current 
          });
      }

      const s = speechState.current;
      if (s.activeId && enemiesRef.current) {
          const now = performance.now();
          if (s.index < s.fullText.length) {
              if (now - s.lastUpdate > 40) { 
                  s.displayed += s.fullText[s.index];
                  if (s.fullText[s.index] !== ' ') {
                      const type = enemiesRef.current.find(e => e.id === s.activeId)?.name || 'glitch';
                      audio.speak(s.fullText[s.index], type.toLowerCase().includes('trojan') ? 'trojan' : 'glitch');
                  }
                  s.index++;
                  s.lastUpdate = now;
              }
          } else if (!s.completeTimer && onSpeechEnd) {
             s.completeTimer = setTimeout(onSpeechEnd, 1000);
          }

          const viz = visualState.current[s.activeId];
          if (viz) {
             const idleOffset = Math.sin(timeRef.current * THEME.ENEMY.IDLE_FREQ + viz.idlePhase) * THEME.ENEMY.IDLE_AMP;
             const pos = project3D(viz.x, viz.y + idleOffset, viz.z, width / 2, height * 0.35);
             const size = THEME.ENEMY.SCALE_UI * pos.scale;
             drawSpeechBubble(ctx, pos.x, pos.y - size * 1.1, s.displayed);
          }
      }

      const now = performance.now();
      const centerX = width / 2;
      const centerY = height * 0.35;
      
      enemiesRef.current.forEach(enemy => {
          const pending = pendingDamageRef.current[enemy.id];
          if (pending) {
              const viz = visualState.current[enemy.id];
              if (viz) {
                  const pos = project3D(viz.x, viz.y, viz.z, centerX, centerY);
                  const size = THEME.ENEMY.SCALE_UI * pos.scale;
                  floatingTextsRef.current.push(new FloatingText(pos.x, pos.y - size - 40, `${pending.val}`, '#ff0000'));
                  const critKey = `${enemy.id}_${now}`;
                  if (enemy.lastCrit && !displayedCritsRef.current[critKey]) {
                      floatingTextsRef.current.push(new FloatingText(pos.x, pos.y - size - 100, 'CRITICAL', '#ffff00'));
                      displayedCritsRef.current[critKey] = true;
                  }
              }
              delete pendingDamageRef.current[enemy.id];
          }
      });

      Object.values(playersRef.current).forEach((player, index) => {
          const pending = pendingDamageRef.current[player.id];
          if (pending) {
              const posData = currentPositionsRef.current[player.id];
              const screenX = posData ? posData.x : (width / 2);
              const screenY = height - THEME.PLAYER.BOTTOM_OFFSET;
              
              floatingTextsRef.current.push(new FloatingText(screenX, screenY, `${pending.val}`, '#ff0000'));
              const critKey = `${player.id}_${now}`;
              if (player.lastCrit && !displayedCritsRef.current[critKey]) {
                  floatingTextsRef.current.push(new FloatingText(screenX, screenY - 60, 'CRITICAL', '#ffff00'));
                  displayedCritsRef.current[critKey] = true;
              }
              delete pendingDamageRef.current[player.id];
          }
      });

      if (floatingTextsRef.current.length > 10) {
          floatingTextsRef.current = floatingTextsRef.current.filter(ft => ft.life > 0).slice(-10);
      }
      floatingTextsRef.current = floatingTextsRef.current.filter(ft => ft.life > 0);

      drawFloatingText(ctx, floatingTextsRef.current);
    };

    resize();
    window.addEventListener('resize', resize);
    animationFrameRef.current = requestAnimationFrame(draw);
    
    return () => { 
        window.removeEventListener('resize', resize); 
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        particlesRef.current = [];
        floatingTextsRef.current = [];
        gradientCache.current = [];
    };
  }, [visualSeed]); 

  return (
      <canvas ref={canvasRef} onClick={handleCanvasClick} onMouseMove={handleCanvasMouseMove} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }} />
  );
}, (prev, next) => {
    return prev.depth === next.depth &&
           prev.isWarping === next.isWarping &&
           prev.targetedEnemy === next.targetedEnemy &&
           prev.activeEntity === next.activeEntity &&
           prev.isTransitioning === next.isTransitioning &&
           prev.speakingId === next.speakingId &&
           prev.speechText === next.speechText &&
           prev.enemies === next.enemies &&
           prev.players === next.players &&
           prev.attackMode === next.attackMode &&
           prev.visualSeed === next.visualSeed &&
           prev.uiScale === next.uiScale && 
           prev.playerPositions === next.playerPositions; 
});