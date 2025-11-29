export const PATCHES = {
  // --- FIREWALL (Tank) ---
  'packet_filter': {
    id: 'packet_filter',
    name: 'Packet Filter',
    type: 'attack',
    desc: 'Basic mitigation attack.',
    damage: { min: 10, max: 20 },
    effect: 'defend', // Custom logic flag
    cost: 0
  },
  
  // --- CRASH (DPS) ---
  'buffer_overflow': {
    id: 'buffer_overflow',
    name: 'Buffer Overflow',
    type: 'attack',
    desc: 'High damage burst.',
    damage: { min: 30, max: 45 },
    cost: 0
  },

  // --- ROOTKIT (Rogue) ---
  'privilege_escalation': {
    id: 'privilege_escalation',
    name: 'Privesc',
    type: 'attack',
    desc: 'High crit chance attack.',
    damage: { min: 20, max: 30 },
    critMod: 0.5,
    cost: 0
  },

  // --- ZERODAY (Sniper) ---
  'exploit': {
    id: 'exploit',
    name: 'Exploit',
    type: 'attack',
    desc: 'Ignores defense.',
    damage: { min: 25, max: 35 },
    ignoreDef: true,
    cost: 0
  },

  // --- ANTIVIRUS (Healer) ---
  'quarantine': {
    id: 'quarantine',
    name: 'Quarantine',
    type: 'attack',
    desc: 'Deals damage and restores small HP.',
    damage: { min: 15, max: 25 },
    heal: 10,
    cost: 0
  },

  // --- DAEMON (Support) ---
  'background_process': {
    id: 'background_process',
    name: 'Bg Process',
    type: 'attack',
    desc: 'Low damage, reliable.',
    damage: { min: 18, max: 22 },
    cost: 0
  },

  // --- GENERIC / DROPS ---
  'sys_bash': {
    id: 'sys_bash',
    name: 'Sys Bash',
    type: 'attack',
    desc: 'Standard melee impact.',
    damage: { min: 15, max: 25 },
    cost: 0
  },
  'force_quit': {
     id: 'force_quit',
     name: 'Force Quit',
     type: 'attack',
     desc: 'Heavy melee damage.',
     damage: { min: 40, max: 60 },
     cost: 0
  },
  
  // --- PASSIVES (Kernel) ---
  'overclock_v1': {
     id: 'overclock_v1',
     name: 'Overclock v1.0',
     type: 'passive',
     stats: { speed: 2 }
  },
  'hardened_kernel': {
      id: 'hardened_kernel',
      name: 'Hardened Kernel',
      type: 'passive',
      stats: { hp: 20 }
  }
};