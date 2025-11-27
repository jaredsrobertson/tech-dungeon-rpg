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
  
  // FIX: Track the last enemy to act, so we know who attacked even after turn ends
  const lastActiveEnemyRef = useRef(null);

  // --- SINGLE SOURCE OF TRUTH FOR RENDER LOOP ---
  const renderState = useRef({
    time: 0,
    depth: 1,
    isWarping: false,
    enemies: [],
    players: {},
    playerPositions: {},
    currentPositions: {}, // For lerping
    visualState: {},      // For enemy 3D positions
    gradientCache: [],    // Optimization for grid
    particles: [],
    hitZones: {},
    floatingTexts: [],
    
    // Combat State
    damageTimers: {},
    deathTimers: {},
    attackTimers: {},
    pendingDamage: {},
    displayedCrits: {},
    
    // Speech State
    speech: {
        activeId: null,
        fullText: '',
        displayed: '',
        index: 0,
        lastUpdate: 0
    },

    // UI Props
    targetedEnemy: null,
    uiScale: 1
  });

  // --- SYNC PROPS TO RENDER STATE ---
  useLayoutEffect(() => {
    const s = renderState.current;

    // Reset visuals if depth changes
    if (depth !== s.depth) {
        s.visualState = {}; 
        s.hitZones = {};
        s.pendingDamage = {};
        s.damageTimers = {};
        s.deathTimers = {};
        s.displayedCrits = {}; 
        s.floatingTexts = [];
        s.attackTimers = {};
        s.gradientCache = []; // Clear grid cache
    }
    s.depth = depth;

    // Detect Damage (Diffing Logic)
    enemies.forEach(enemy => {
        const oldEnemy = s.enemies.find(e => e.id === enemy.id);
        if (oldEnemy && enemy.hp < oldEnemy.hp) {
            s.damageTimers[enemy.id] = performance.now();
            s.pendingDamage[enemy.id] = { val: oldEnemy.hp - enemy.hp };
            audio.enemyDamaged(); 
        }
        if (enemy.hp <= 0 && oldEnemy && oldEnemy.hp > 0) {
            s.deathTimers[enemy.id] = performance.now();
            audio.enemyDeath(); 
        }
    });

    Object.values(players).forEach(player => {
        const prev = s.players[player.id];
        if (prev && prev.hp > 0 && player.hp < prev.hp) {
            s.damageTimers[player.id] = performance.now();
            s.pendingDamage[player.id] = { val: prev.hp - player.hp }; 
            audio.playerDamaged(); 
            
            // FIX: Use the tracked enemy ID instead of the current activeEntity
            const attackerId = lastActiveEnemyRef.current;
            if (attackerId) {
                s.attackTimers[attackerId] = { targetId: player.id, start: performance.now() };
            }
        }
        if (prev && prev.hp > 0 && player.hp === 0) { audio.playerDeath(); }
    });

    // Update State
    s.enemies = enemies;
    s.players = players;
    s.playerPositions = playerPositions;
    s.isWarping = isWarping;
    s.targetedEnemy = targetedEnemy;
    s.uiScale = uiScale;
    s.visualSeed = visualSeed; // For randomizing player shapes

    // Update Speech
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

  // FIX: Update the tracker *after* the render logic
  useEffect(() => {
      if (activeEntity && activeEntity.startsWith('e')) {
          lastActiveEnemyRef.current = activeEntity;
      }
  }, [activeEntity]);

  // --- INTERACTION HANDLERS ---
  const handleCanvasMouseMove = (e) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      
      let foundId = null;
      const zones = renderState.current.hitZones;
      const ids = Object.keys(zones);
      
      // Iterate backwards (draw order)
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

  // --- RENDER LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

    const resize = () => {
      const dpr = 0.75; // Low Res for aesthetic/perf
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      renderState.current.gradientCache = []; // Reset gradients on resize
    };

    const loop = (timestamp) => {
      if (!prevTimeRef.current) prevTimeRef.current = timestamp;
      const dt = (timestamp - prevTimeRef.current) / 1000;
      prevTimeRef.current = timestamp;

      const width = canvas.width / 0.75;  // Unscale width for logic
      const height = canvas.height / 0.75;

      drawFrame(ctx, width, height, dt, renderState.current);
      
      // Check for speech completion
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