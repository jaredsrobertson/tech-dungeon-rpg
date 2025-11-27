import { CLASSES } from './data/classes';
import { assignSlot } from './mechanics/grid';
import { calculateDamage, getActiveEntities, getNextId, triggerEvent } from './mechanics/combat';

const generateEnemies = (depth) => {
    const scale = 1 + (depth * 0.2);
    const enemies = {};
    const placed = [];

    const templates = [
        { id: 'e1', name: 'Trojan', hp: 100, speed: 4 },
        { id: 'e2', name: 'Glitch', hp: 50, speed: 9 },
        { id: 'e3', name: 'Spyware', hp: 40, speed: 12 },
        { id: 'e4', name: 'Malware', hp: 70, speed: 6 },
        { id: 'e5', name: 'Botnet', hp: 30, speed: 10 }
    ];

    templates.forEach(t => {
        const pos = assignSlot(placed, t.id);
        const maxHp = Math.floor(t.hp * scale);
        
        const enemy = {
            id: t.id,
            name: `${t.name}_v${depth}.0`,
            hp: maxHp,
            maxHp: maxHp,
            speed: t.speed + depth,
            isCharging: false,
            targetId: null,
            ...pos
        };
        
        delete enemy.swapWithId; 

        enemies[t.id] = enemy;
        placed.push(enemy);
    });

    return enemies;
};

export const moves = {
    claimHero: ({ G, ctx }, classID) => {
        const pid = (ctx.playerID !== undefined && ctx.playerID !== null) ? ctx.playerID : ctx.currentPlayer;
        if (G.lobbyState[classID] === null) G.lobbyState[classID] = String(pid);
    },

    releaseHero: ({ G, ctx }, classID) => {
        const pid = (ctx.playerID !== undefined && ctx.playerID !== null) ? ctx.playerID : ctx.currentPlayer;
        if (G.lobbyState[classID] === String(pid)) G.lobbyState[classID] = null;
    },

    startRun: ({ G }) => {
        const claimed = Object.entries(G.lobbyState).filter(([k, pid]) => pid !== null);
        if (claimed.length === 0) return;

        G.players = {};
        claimed.forEach(([classID, pid]) => {
            const def = CLASSES[classID];
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

        G.phase = 'combat';
        G.log.push('> NEURAL LINK ESTABLISHED');
        
        G.enemies = generateEnemies(1);

        const order = getActiveEntities(G);
        if (order.length > 0) G.activeEntity = order[0].id;
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
        // ADDED: Trigger audio event for charging
        triggerEvent(G, 'ENEMY_CHARGE');
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
        
        const allEnemies = Object.values(G.enemies).filter(e => e.hp > 0);
        const moveResult = assignSlot(allEnemies, enemy.id);
        
        if (moveResult) {
            if (moveResult.swapWithId) {
                const swapTarget = G.enemies[moveResult.swapWithId];
                if (swapTarget) {
                    swapTarget.x = enemy.x;
                    swapTarget.y = enemy.y;
                    swapTarget.distance = enemy.distance;
                    swapTarget.slotIndex = enemy.slotIndex;
                    swapTarget.gridSlot = enemy.gridSlot;
                }
            }
            Object.assign(enemy, moveResult);
            delete enemy.swapWithId; 
        }

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
        
        G.enemies = generateEnemies(G.depth);
        G.activeEntity = getActiveEntities(G)[0].id;
    }
};