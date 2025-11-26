import { CLASSES } from './constants';

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

export const KernelPanic = {
  name: 'terminal-exe',
  minPlayers: 1,
  maxPlayers: 6,

  setup: () => {
    // Initialize Lobby State
    const lobbyState = {};
    Object.keys(CLASSES).forEach(key => lobbyState[key] = null);

    return {
        players: {},
        enemies: {},
        lobbyState,
        activeEntity: null,
        phase: 'lobby', // Start in Lobby
        depth: 1,
        log: ['> SYSTEM BOOT', '> AWAITING PROTOCOL SELECTION...'],
        eventCount: 0,
        lastEvent: null
    };
  },

  moves: {
    claimHero: ({ G, ctx }, classID) => {
        // FIX: Strictly check for undefined. ctx.playerID might be undefined in some local contexts.
        const pid = (ctx.playerID !== undefined && ctx.playerID !== null) 
            ? ctx.playerID 
            : ctx.currentPlayer;
        
        if (G.lobbyState[classID] === null) {
            G.lobbyState[classID] = String(pid);
        }
    },

    releaseHero: ({ G, ctx }, classID) => {
        // FIX: Apply same strict check here
        const pid = (ctx.playerID !== undefined && ctx.playerID !== null) 
            ? ctx.playerID 
            : ctx.currentPlayer;
        
        if (G.lobbyState[classID] === String(pid)) {
            G.lobbyState[classID] = null;
        }
    },

    startRun: ({ G, ctx }) => {
        const claimed = Object.entries(G.lobbyState).filter(([k, pid]) => pid !== null);
        if (claimed.length === 0) return; // Validation

        // Initialize Players
        G.players = {};
        claimed.forEach(([classID, pid]) => {
            const def = CLASSES[classID];
            // Determine speed based on Role roughly to ensure turn order variety
            let baseSpeed = 10;
            if (def.role === 'Tank') baseSpeed = 5;
            if (def.role === 'DPS') baseSpeed = 12;
            if (def.role === 'Rogue') baseSpeed = 14;
            if (def.role === 'Sniper') baseSpeed = 11;
            if (def.role === 'Healer') baseSpeed = 8;
            if (def.role === 'Support') baseSpeed = 7;

            G.players[classID] = {
                id: classID,
                name: def.name,
                hp: def.hp,
                maxHp: def.hp,
                speed: baseSpeed,
                class: def.name,
                classID: classID,
                desc: def.role,
                owner: pid,
                isDefending: false,
                patches: []
            };
        });

        // Transition Phase
        G.phase = 'combat';
        G.log.push('> NEURAL LINK ESTABLISHED', '> ENTERING SECTOR 1');

        // Spawn Enemies
        const e1Pos = assignSlot([], 'e1');
        const e2Pos = assignSlot([{ ...e1Pos, id: 'e1', hp: 100 }], 'e2');
        G.enemies = {
          'e1': { id: 'e1', name: 'Glitch', hp: 50, maxHp: 50, speed: 8, ...e1Pos, isCharging: false, targetId: null },
          'e2': { id: 'e2', name: 'Trojan', hp: 100, maxHp: 100, speed: 4, ...e2Pos, isCharging: false, targetId: null }
        };

        // Set Active Entity
        const order = getActiveEntities(G);
        if (order.length > 0) {
            G.activeEntity = order[0].id;
        }
    },

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