import React, { useEffect, useRef, useLayoutEffect } from 'react';
import { audio } from '../audio/audio';
import { drawFrame } from './RenderLoop';

export const TunnelRenderer = React.memo(({ 
  enemies = [], 
  players = {}, 
  targetedEnemy = null, 
  activeEntity = null, 
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
  const animationFrameRef = useRef(null);
  const prevTimeRef = useRef(0);
  const lastHoveredRef = useRef(null);
  const lastActiveEnemyRef = useRef(null);

  // --- PERFORMANCE TRACKER REF ---
  const perfRef = useRef({
      frameCount: 0,
      lastkB: 0,
      fpsSum: 0,
      minFps: 60,
      history: [] // Stores last 60 frames for 1% low calculation
  });

  const renderState = useRef({
    time: 0,
    // Performance Stats Object
    perf: { fps: 60, minFps: 60, avgFps: 60, particleCount: 0, textCount: 0 },
    depth: 1,
    isWarping: false,
    enemies: [],
    players: {},
    playerPositions: {},
    currentPositions: {}, 
    visualState: {},      
    gradientCache: [],    
    particles: [],
    hitZones: {},
    floatingTexts: [],
    damageTimers: {},
    deathTimers: {},
    attackTimers: {},
    pendingDamage: {},
    displayedCrits: {},
    speech: {
        activeId: null,
        fullText: '',
        displayed: '',
        index: 0,
        lastUpdate: 0
    },
    targetedEnemy: null,
    uiScale: 1
  });

  useLayoutEffect(() => {
    const s = renderState.current;

    if (depth !== s.depth) {
        s.visualState = {}; 
        s.hitZones = {};
        s.pendingDamage = {};
        s.damageTimers = {};
        s.deathTimers = {};
        s.displayedCrits = {}; 
        s.floatingTexts = [];
        s.attackTimers = {};
        s.gradientCache = []; 
    }
    s.depth = depth;

    enemies.forEach(enemy => {
        const oldEnemy = s.enemies.find(e => e.id === enemy.id);
        if (oldEnemy && enemy.hp < oldEnemy.hp) {
            s.damageTimers[enemy.id] = performance.now();
            s.pendingDamage[enemy.id] = { val: oldEnemy.hp - enemy.hp };
        }
        if (enemy.hp <= 0 && oldEnemy && oldEnemy.hp > 0) {
            s.deathTimers[enemy.id] = performance.now();
        }
    });

    Object.values(players).forEach(player => {
        const prev = s.players[player.id];
        if (prev && prev.hp > 0 && player.hp < prev.hp) {
            s.damageTimers[player.id] = performance.now();
            s.pendingDamage[player.id] = { val: prev.hp - player.hp }; 
            const attackerId = lastActiveEnemyRef.current;
            if (attackerId) {
                s.attackTimers[attackerId] = { targetId: player.id, start: performance.now() };
            }
        }
    });

    s.enemies = enemies;
    s.players = players;
    s.playerPositions = playerPositions;
    s.isWarping = isWarping;
    s.targetedEnemy = targetedEnemy;
    s.uiScale = uiScale;
    s.visualSeed = visualSeed; 

    if (speakingId !== s.speech.activeId || speechText !== s.speech.fullText) {
        s.speech = {
            activeId: speakingId,
            fullText: speechText,
            displayed: '',
            index: 0,
            lastUpdate: performance.now()
        };
    }
  }, [enemies, players, playerPositions, isWarping, depth, targetedEnemy, uiScale, activeEntity, speakingId, speechText, visualSeed]);

  useEffect(() => {
      if (activeEntity && (activeEntity.startsWith('e') || activeEntity === 'boss')) {
          lastActiveEnemyRef.current = activeEntity;
      }
  }, [activeEntity]);

  const handleCanvasMouseMove = (e) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      
      let foundId = null;
      const zones = renderState.current.hitZones;
      const ids = Object.keys(zones);
      
      for (let i = ids.length - 1; i >= 0; i--) {
          const id = ids[i];
          const zone = zones[id];
          const dist = Math.hypot(mx - zone.x, my - zone.y);
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
      
      const zones = renderState.current.hitZones;
      const ids = Object.keys(zones);
      let hit = false;

      for (let i = ids.length - 1; i >= 0; i--) {
          const id = ids[i];
          const zone = zones[id];
          const dist = Math.hypot(mx - zone.x, my - zone.y);
          if (dist <= zone.r) { 
              onEnemyClick(id); 
              hit = true; 
              break; 
          }
      }
      if (!hit) onBackgroundClick();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0); 
      ctx.scale(dpr, dpr);
      renderState.current.gradientCache = []; 
    };

    const loop = (timestamp) => {
      if (!prevTimeRef.current) prevTimeRef.current = timestamp;
      const dt = (timestamp - prevTimeRef.current) / 1000;
      prevTimeRef.current = timestamp;

      // --- FPS CALCULATION ---
      if (dt > 0) {
          const currentFps = 1 / dt;
          const p = perfRef.current;
          
          p.history.push(currentFps);
          if (p.history.length > 60) p.history.shift();
          
          // Calculate Min FPS from history (1% low)
          p.minFps = Math.min(...p.history);
          
          // Calculate Average every 30 frames to stop text flickering
          p.fpsSum += currentFps;
          p.frameCount++;
          
          if (p.frameCount > 30) {
              renderState.current.perf.avgFps = Math.round(p.fpsSum / p.frameCount);
              renderState.current.perf.minFps = Math.round(p.minFps);
              renderState.current.perf.fps = Math.round(currentFps);
              
              // Reset
              p.frameCount = 0;
              p.fpsSum = 0;
              p.minFps = 60;
          }
      }

      const width = window.innerWidth;
      const height = window.innerHeight;
      
      ctx.clearRect(0, 0, width, height);

      drawFrame(ctx, width, height, dt, renderState.current);
      
      const s = renderState.current.speech;
      if (s.activeId && s.index >= s.fullText.length && onSpeechEnd) {
          if (!s.completeTriggered) {
             s.completeTriggered = true;
             setTimeout(onSpeechEnd, 1000);
          }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    animationFrameRef.current = requestAnimationFrame(loop);
    
    return () => { 
        window.removeEventListener('resize', resize); 
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [onSpeechEnd]);

  return (
      <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick} 
        onMouseMove={handleCanvasMouseMove} 
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }} 
      />
  );
});