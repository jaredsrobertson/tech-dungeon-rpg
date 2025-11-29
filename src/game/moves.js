import { CLASSES } from './data/classes';
import { PATCHES } from './data/patches';
import { assignSlot } from './mechanics/grid';
import { calculateDamage, getActiveEntities, getNextId, triggerEvent } from './mechanics/combat';

// --- ENEMY TEMPLATES ---
const ENEMY_TEMPLATES = [
    { typeId: 'glitch', name: 'Glitch', cost: 5, hp: 50, speed: 9 },
    { typeId: 'trojan', name: 'Trojan', cost: 10, hp: 140, speed: 4 },
    { typeId: 'spyware', name: 'Spyware', cost: 8, hp: 60, speed: 12 },
    { typeId: 'malware', name: 'Malware', cost: 15, hp: 90, speed: 6 },
    { typeId: 'botnet', name: 'Botnet', cost: 3, hp: 30, speed: 10 }
];

const generateEnemies = (depth, numHeroes) => {
    const enemies = {};
    const placed = [];

    // --- BOSS LOGIC ---
    if (depth === 1 || depth % 10 === 0) {
        const bossHp = Math.floor(500 * numHeroes * 0.8);
        let activeThreads = 1;
        if (numHeroes >= 3) activeThreads = 2;
        if (numHeroes >= 5) activeThreads = 3;

        enemies['boss'] = {
            id: 'boss',
            type: 'boss',
            name: `SYSTEM_DAEMON_v${depth}.0`,
            hp: bossHp,
            maxHp: bossHp,
            speed: 5,
            isCharging: false,
            activeThreads: activeThreads,
            targetId: null,
            x: 0, y: 0, distance: 2500,
            gridSlot: { col: 0, row: 0 }
        };
        return enemies;
    }

    // --- THREAT BUDGET SYSTEM ---
    let budget = (numHeroes * 10) + (depth * 2);
    const hpMultiplier = 1 + (numHeroes * 0.1);
    let count = 0;

    while (budget >= 3) {
        const affordable = ENEMY_TEMPLATES.filter(t => t.cost <= budget);
        if (affordable.length === 0) break;
        const template = affordable[Math.floor(Math.random() * affordable.length)];
        budget -= template.cost;
        const maxHp = Math.floor(template.hp * hpMultiplier);
        
        const id = `e_${count}_${template.typeId}`;
        const pos = assignSlot(placed, id);
        
        const enemy = {
            id: id,
            name: `${template.name}_v${depth}.${count}`,
            hp: maxHp,
            maxHp: maxHp,
            speed: template.speed + Math.floor(depth * 0.2), 
            isCharging: false,
            targetId: null,
            ...pos
        };
        
        if (enemy.swapWithId) delete enemy.swapWithId;
        enemies[id] = enemy;
        placed.push(enemy);
        count++;
    }
    return enemies;
};

const INITIAL_ABILITIES = {
    firewall: 'packet_filter',
    crash: 'buffer_overflow',
    rootkit: 'privilege_escalation',
    zeroday: 'exploit',
    av: 'quarantine',
    daemon: 'background_process'
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

    claimAllHeroes: ({ G, ctx }) => {
        const pid = String((ctx.playerID !== undefined && ctx.playerID !== null) ? ctx.playerID : ctx.currentPlayer);
        Object.keys(G.lobbyState).forEach(id => {
            if (G.lobbyState[id] === null) G.lobbyState[id] = pid;
        });
    },

    releaseAllHeroes: ({ G, ctx }) => {
        const pid = String((ctx.playerID !== undefined && ctx.playerID !== null) ? ctx.playerID : ctx.currentPlayer);
        Object.keys(G.lobbyState).forEach(id => {
            if (G.lobbyState[id] === pid) G.lobbyState[id] = null;
        });
    },

    startRun: ({ G }) => {
        const claimed = Object.entries(G.lobbyState).filter(([k, pid]) => pid !== null);
        if (claimed.length === 0) return;

        G.players = {};
        claimed.forEach(([classID, pid]) => {
            const def = CLASSES[classID];
            let baseSpeed = 10;
            if (def.role === 'Rogue') baseSpeed = 14;
            if (def.role === 'Tank') baseSpeed = 5;
            if (def.role === 'DPS') baseSpeed = 12;
            if (def.role === 'Sniper') baseSpeed = 11;
            if (def.role === 'Healer') baseSpeed = 8;
            if (def.role === 'Support') baseSpeed = 7;

            const initAbility = INITIAL_ABILITIES[classID] || 'sys_bash';

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
                bytes: 0,
                activeSlots: 1,
                loadout: [initAbility],
                inventory: [],
                passives: []
            };
        });

        G.phase = 'combat';
        G.log.push('> NEURAL LINK ESTABLISHED');
        
        const numHeroes = Object.keys(G.players).length;
        G.enemies = generateEnemies(1, numHeroes);
        
        const order = getActiveEntities(G);
        if (order.length > 0) G.activeEntity = order[0].id;
    },

    // --- ECONOMY & SHOP ---
    transferBytes: ({ G }, toPlayerID, amount) => {
        const fromPlayer = G.players[G.activeEntity];
        const toPlayer = G.players[toPlayerID];
        if (fromPlayer && toPlayer && fromPlayer.bytes >= amount) {
            fromPlayer.bytes -= amount;
            toPlayer.bytes += amount;
            G.log.push(`> TRANSFER: ${amount} BYTES ${fromPlayer.name} -> ${toPlayer.name}`);
        }
    },

    recyclePatch: ({ G }, patchID) => {
        const player = G.players[G.activeEntity];
        const idx = player.inventory.indexOf(patchID);
        if (idx > -1) {
            player.inventory.splice(idx, 1);
            player.bytes += 50; 
            G.log.push(`> RECYCLED ${patchID} -> 50 BYTES`);
        }
    },

    // UPDATED: Handles Auto-Install for Passives
    buyPatch: ({ G }, patchID, cost) => {
        const player = G.players[G.activeEntity];
        if (player.bytes >= cost) {
            player.bytes -= cost;
            const patch = PATCHES[patchID];
            
            if (patch.type === 'passive') {
                player.passives.push(patchID);
                // Apply Stats Immediately
                if (patch.stats) {
                    if (patch.stats.hp) player.maxHp += patch.stats.hp;
                    if (patch.stats.speed) player.speed += patch.stats.speed;
                }
                G.log.push(`> INSTALLED ${patch.name} (PASSIVE)`);
            } else {
                player.inventory.push(patchID);
                G.log.push(`> ACQUIRED ${patch.name}`);
            }
        }
    },

    // --- MANAGEMENT ---
    equipAbility: ({ G }, patchID, slotIndex) => {
        const player = G.players[G.activeEntity];
        if (!player || slotIndex >= player.activeSlots) return;
        const invIdx = player.inventory.indexOf(patchID);
        if (invIdx === -1) return;
        player.inventory.splice(invIdx, 1);
        if (player.loadout[slotIndex]) {
            player.inventory.push(player.loadout[slotIndex]);
        }
        player.loadout[slotIndex] = patchID;
    },

    unequipAbility: ({ G }, slotIndex) => {
        const player = G.players[G.activeEntity];
        if (!player || !player.loadout[slotIndex]) return;
        const ability = player.loadout[slotIndex];
        player.loadout[slotIndex] = null;
        player.inventory.push(ability);
    },

    // --- COMBAT ---
    useAbility: ({ G }, targetId, abilityID) => {
        const player = G.players[G.activeEntity];
        const enemy = G.enemies[targetId];
        if (!player || !enemy || enemy.hp <= 0) return;

        const patch = PATCHES[abilityID];
        if (!patch) return;

        player.isDefending = false;
        
        let critChance = 0.2;
        if (patch.critMod) critChance += patch.critMod;
        const isCrit = Math.random() < critChance;

        const minD = patch.damage.min;
        const maxD = patch.damage.max;
        let dmg = calculateDamage(minD, maxD, isCrit, false);

        enemy.hp = Math.max(0, enemy.hp - dmg);
        enemy.lastCrit = isCrit;

        G.log.push(`> ${player.name} [${patch.name}] :: ${dmg}${isCrit ? ' CRIT!' : ''} -> ${enemy.name}`);
        triggerEvent(G, 'PLAYER_ATTACK', { isCrit, targetId });

        if (patch.heal) {
            player.hp = Math.min(player.maxHp, player.hp + patch.heal);
            G.log.push(`> REPAIRED ${patch.heal} HP`);
        }

        if (enemy.hp === 0) {
            G.log.push(`> ${enemy.name} TERMINATED`);
            const droppedBytes = 20 + Math.floor(Math.random() * 30);
            player.bytes += droppedBytes;
            G.log.push(`> ACQUIRED ${droppedBytes} BYTES`);
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
        triggerEvent(G, 'ENEMY_CHARGE');
    },

    enemyAttack: ({ G }, enemyId) => {
        const enemy = G.enemies[enemyId];
        if (!enemy) return;

        const livingPlayers = Object.values(G.players).filter(p => p.hp > 0);
        if (livingPlayers.length === 0) {
            G.phase = 'defeat';
            return;
        }

        if (enemy.type === 'boss') {
            const threads = enemy.activeThreads || 1;
            for (let i = 0; i < threads; i++) {
                const targets = Object.values(G.players).filter(p => p.hp > 0);
                if (targets.length === 0) break;

                if (i === 0) {
                    const target = targets[Math.floor(Math.random() * targets.length)];
                    const dmg = calculateDamage(15, 25, false, target.isDefending);
                    target.hp = Math.max(0, target.hp - dmg);
                    G.log.push(`> ${enemy.name} :: THREAD [1] ATTACK -> ${target.name} (${dmg})`);
                    if (target.hp === 0) G.log.push(`> ${target.name} OFFLINE`);
                } else if (i === 1) {
                    const target = targets[Math.floor(Math.random() * targets.length)];
                    const dmg = calculateDamage(10, 20, false, target.isDefending);
                    target.hp = Math.max(0, target.hp - dmg);
                    G.log.push(`> ${enemy.name} :: THREAD [2] SECONDARY -> ${target.name} (${dmg})`);
                    if (target.hp === 0) G.log.push(`> ${target.name} OFFLINE`);
                } else if (i === 2) {
                    G.log.push(`> ${enemy.name} :: THREAD [3] SYSTEM WIDE SURGE`);
                    targets.forEach(p => {
                        const aoeDmg = 10; 
                        p.hp = Math.max(0, p.hp - aoeDmg);
                    });
                }
            }
            enemy.isCharging = false;
            enemy.targetId = null;
            triggerEvent(G, 'ENEMY_ATTACK', { isCrit: false }); 
            triggerEvent(G, 'PLAYER_DAMAGED');
        } else {
            if (!enemy.targetId) {
                G.activeEntity = getNextId(G, G.activeEntity);
                return;
            }
            const target = G.players[enemy.targetId];
            if (target && target.hp > 0) {
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
            }
            const allEnemies = Object.values(G.enemies).filter(e => e.hp > 0 && e.type !== 'boss');
            const moveResult = assignSlot(allEnemies, enemy.id);
            if (moveResult) {
                if (moveResult.swapWithId) {
                    const swapTarget = G.enemies[moveResult.swapWithId];
                    if (swapTarget) {
                        Object.assign(swapTarget, { ...swapTarget, ...enemy.gridSlot, x: enemy.x, y: enemy.y, distance: enemy.distance });
                    }
                }
                Object.assign(enemy, moveResult);
                delete enemy.swapWithId; 
            }
            enemy.isCharging = false;
            enemy.targetId = null;
        }
        
        if (Object.values(G.players).every(p => p.hp <= 0)) {
            G.phase = 'defeat';
        } else {
            G.activeEntity = getNextId(G, G.activeEntity);
        }
    },

    nextRoom: ({ G }) => {
        if (G.depth > 0 && G.depth % 10 === 0 && G.phase !== 'merchant') {
            G.phase = 'merchant';
            G.log.push('> ARRIVED AT MERCHANT NODE');
            // Hardcoded shop stock until full RNG item generation
            G.shopStock = ['sys_bash', 'overclock_v1', 'hardened_kernel']; 
            return;
        }

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
        
        const numHeroes = Object.keys(G.players).length;
        G.enemies = generateEnemies(G.depth, numHeroes);
        G.activeEntity = getActiveEntities(G)[0].id;
    }
};