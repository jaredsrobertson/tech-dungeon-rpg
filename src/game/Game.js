import { CLASS_MAP } from './constants'; // Import if needed for logic

const CELL_WIDTH = 500;  
const CELL_HEIGHT = 350; 
const GRID_SLOTS = [
    { id: 0, col: -0.5, row: -0.5 },
    { id: 1, col: 0.5, row: -0.5 },
    { id: 2, col: -0.5, row: 0.5 },
    { id: 3, col: 0.5, row: 0.5 }
];

const getActiveEntities = (G) => [
  ...Object.values(G.players), 
  ...Object.values(G.enemies)
].filter(e => e.hp > 0).sort((a, b) => b.speed - a.speed);

const getNextId = (G, currentId) => {
  const order = getActiveEntities(G);
  const idx = order.findIndex(e => e.id === currentId);
  return order[(idx + 1) % order.length]?.id || order[0].id;
};

const calculateDamage = (baseMin, baseMax, isCrit, isDefending) => {
  let dmg = (baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1)));
  if (isCrit) dmg *= 2;
  if (isDefending) dmg = Math.floor(dmg * 0.5);
  return dmg;
};

const assignSlot = (existingEnemies = [], myId = null) => {
    const occupied = new Set();
    existingEnemies.forEach(e => {
        if (e.id !== myId && e.hp > 0 && e.slotIndex !== undefined) {
            occupied.add(e.slotIndex);
        }
    });
    const available = GRID_SLOTS.filter(s => !occupied.has(s.id));
    if (available.length === 0) return { 
        slotIndex: 0, x: GRID_SLOTS[0].col * CELL_WIDTH, y: GRID_SLOTS[0].row * CELL_HEIGHT, distance: 300 
    };
    const slot = available[Math.floor(Math.random() * available.length)];
    return {
        slotIndex: slot.id, gridSlot: { col: slot.col, row: slot.row }, 
        x: (slot.col * CELL_WIDTH) + (Math.random() * 20 - 10), 
        y: (slot.row * CELL_HEIGHT) + (Math.random() * 20 - 10),
        distance: 250 + Math.random() * 50 
    };
};

const triggerEvent = (G, type, payload = {}) => {
    G.eventCount = (G.eventCount || 0) + 1;
    G.lastEvent = { id: G.eventCount, type, ...payload };
};

// Helper for Randomization
const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

export const KernelPanic = {
  name: 'terminal-exe',
  minPlayers: 1,
  maxPlayers: 6,

  setup: () => {
    const e1Pos = assignSlot([], 'e1');
    const e2Pos = assignSlot([{ ...e1Pos, id: 'e1', hp: 100 }], 'e2');

    // RANDOM VISUAL ASSIGNMENT
    // Indices 0-5 for Colors and Shape Pairs
    const colorIndices = shuffleArray([0, 1, 2, 3, 4, 5]);
    const shapeIndices = shuffleArray([0, 1, 2, 3, 4, 5]);
    const iconIndices  = shuffleArray([0, 1, 2, 3, 4, 5]); // For 2D icon shapes

    const createPlayer = (id, name, hp, speed, pClass, desc, idx) => ({
        id, name, hp, maxHp: hp, speed, class: pClass, desc, isDefending: false,
        // Assign distinct visual config
        visuals: {
            colorIdx: colorIndices[idx],
            shapePairIdx: shapeIndices[idx],
            iconShapeIdx: iconIndices[idx]
        }
    });

    return {
        players: {
          '0': createPlayer('0', 'Firewall', 120, 5, 'Firewall', 'Tank', 0),
          '1': createPlayer('1', 'Daemon', 80, 12, 'Daemon', 'DPS', 1),
          '2': createPlayer('2', 'Admin', 100, 8, 'Admin', 'Support', 2),
          '3': createPlayer('3', 'Root', 150, 2, 'Root', 'Heavy', 3),
          '4': createPlayer('4', 'Script', 60, 15, 'Script', 'Rogue', 4),
          '5': createPlayer('5', 'Bot', 90, 10, 'Antivirus', 'Healer', 5),
        },
        enemies: {
          'e1': { id: 'e1', name: 'Glitch', hp: 50, maxHp: 50, speed: 8, ...e1Pos, isCharging: false, targetId: null },
          'e2': { id: 'e2', name: 'Trojan', hp: 100, maxHp: 100, speed: 4, ...e2Pos, isCharging: false, targetId: null }
        },
        activeEntity: '1',
        phase: 'combat',
        depth: 1,
        log: ['> SYSTEM BOOT', '> SECTOR 1 INITIALIZED', '> RANDOMIZED VISUAL PROTOCOLS ACTIVE'],
        eventCount: 0,
        lastEvent: null
    };
  },

  moves: {
    attack: ({ G }, targetId) => {
      const player = G.players[G.activeEntity];
      const enemy = G.enemies[targetId];
      if (!player || !enemy || enemy.hp <= 0) return;
      player.isDefending = false; 
      const isCrit = Math.random() > 0.8; 
      const dmg = calculateDamage(20, 35, isCrit, false);
      enemy.hp = Math.max(0, enemy.hp - dmg);
      enemy.lastCrit = isCrit; 
      G.log.push(`> ${player.name} :: ${dmg}${isCrit ? ' CRIT!' : ''} -> ${enemy.name}`);
      triggerEvent(G, 'PLAYER_ATTACK', { isCrit, targetId });
      if (enemy.hp === 0) {
          G.log.push(`> ${enemy.name} TERMINATED`);
          triggerEvent(G, 'ENEMY_DEATH', { targetId });
      }
      if (Object.values(G.enemies).every(e => e.hp <= 0)) {
        G.phase = 'victory';
        G.log.push('> SECTOR CLEARED');
        triggerEvent(G, 'VICTORY');
      } else {
        G.activeEntity = getNextId(G, G.activeEntity);
      }
    },
    defend: ({ G }) => {
      const player = G.players[G.activeEntity];
      if (player) {
        player.isDefending = true;
        G.log.push(`> ${player.name} :: SHIELDS UP`);
        triggerEvent(G, 'PLAYER_DEFEND');
        G.activeEntity = getNextId(G, G.activeEntity);
      }
    },
    enemySelectTarget: ({ G }, enemyId) => {
      const enemy = G.enemies[enemyId];
      if (!enemy || enemy.hp <= 0) return;
      const livingPlayers = Object.values(G.players).filter(p => p.hp > 0);
      if (!livingPlayers.length) { G.phase = 'defeat'; return; }
      const target = livingPlayers[Math.floor(Math.random() * livingPlayers.length)];
      enemy.targetId = target.id;
      enemy.isCharging = true; 
      G.log.push(`> ${enemy.name} :: CHARGING WEAPONS...`);
    },
    enemyAttack: ({ G }, enemyId) => {
      const enemy = G.enemies[enemyId];
      if (!enemy || !enemy.targetId) {
          enemy.isCharging = false;
          enemy.targetId = null;
          G.activeEntity = getNextId(G, G.activeEntity);
          return;
      }
      const target = G.players[enemy.targetId];
      const isCrit = Math.random() > 0.85; 
      const dmg = calculateDamage(5, 12, isCrit, target.isDefending);
      if (target.isDefending) {
        target.isDefending = false;
        G.log.push(`> ${target.name} :: BLOCKED`);
        triggerEvent(G, 'BLOCK');
      }
      target.hp = Math.max(0, target.hp - dmg);
      target.lastCrit = isCrit; 
      G.log.push(`> ${enemy.name} :: ${dmg}${isCrit ? ' CRIT!' : ''} DMG -> ${target.name}`);
      triggerEvent(G, 'ENEMY_ATTACK', { isCrit });
      triggerEvent(G, 'PLAYER_DAMAGED');
      if (target.hp === 0) {
          G.log.push(`> ${target.name} OFFLINE`);
          triggerEvent(G, 'PLAYER_DEATH');
      }
      const otherEnemies = Object.values(G.enemies).filter(e => e.id !== enemy.id && e.hp > 0);
      const newPos = assignSlot(otherEnemies, enemy.id);
      enemy.x = newPos.x;
      enemy.y = newPos.y;
      enemy.distance = newPos.distance;
      enemy.gridSlot = newPos.gridSlot; 
      enemy.slotIndex = newPos.slotIndex;
      enemy.isCharging = false;
      enemy.targetId = null;
      if (Object.values(G.players).every(p => p.hp <= 0)) {
        G.phase = 'defeat';
      } else {
        G.activeEntity = getNextId(G, G.activeEntity);
      }
    },
    nextRoom: ({ G }) => {
      G.depth++;
      G.phase = 'combat';
      G.log.push(`> WARPING TO SECTOR ${G.depth}...`);
      triggerEvent(G, 'WARP');
      Object.values(G.players).forEach(p => {
        if (p.hp > 0) {
          p.hp = Math.min(p.maxHp, p.hp + 20);
          p.isDefending = false;
        }
      });
      const scale = 1 + (G.depth * 0.2);
      const e1Pos = assignSlot([], 'e1');
      const e2Pos = assignSlot([{...e1Pos, id:'e1', hp:100}], 'e2');
      G.enemies = {
        'e1': { id: 'e1', name: `Bug_v${G.depth}.0`, hp: Math.floor(60 * scale), maxHp: Math.floor(60 * scale), speed: 6 + G.depth, ...e1Pos, isCharging: false, targetId: null },
        'e2': { id: 'e2', name: `Worm_v${G.depth}.0`, hp: Math.floor(100 * scale), maxHp: Math.floor(100 * scale), speed: 3 + G.depth, ...e2Pos, isCharging: false, targetId: null }
      };
      G.activeEntity = getActiveEntities(G)[0].id;
    }
  }
};