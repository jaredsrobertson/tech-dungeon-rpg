// src/game/data/classes.js
export const CLASSES = {
  firewall: {
    id: 'firewall',
    name: 'Firewall',
    role: 'Tank',
    color: '#2E9AFE',
    hp: 120,
    shapes: ['cube', 'octahedron'],
    icon: 'shield',
    ability: { name: 'Packet Filter', desc: 'High defense mitigation.' }
  },
  crash: {
    id: 'crash',
    name: 'Crash',
    role: 'DPS',
    color: '#FF4500',
    hp: 80,
    shapes: ['tetrahedron', 'cube'],
    icon: 'x',
    ability: { name: 'Buffer Overflow', desc: 'High damage burst.' }
  },
  rootkit: {
    id: 'rootkit',
    name: 'Rootkit',
    role: 'Rogue',
    color: '#9400D3',
    hp: 70,
    shapes: ['dodecahedron', 'tetrahedron'],
    icon: 'star',
    ability: { name: 'Privilege Escalation', desc: 'Critical hit chance up.' }
  },
  zeroday: {
    id: 'zeroday',
    name: 'Zero Day',
    role: 'Sniper',
    color: '#FFD700',
    hp: 60,
    shapes: ['octahedron', 'dodecahedron'],
    icon: 'target',
    ability: { name: 'Exploit', desc: 'Ignores defense.' }
  },
  av: {
    id: 'av',
    name: 'Antivirus',
    role: 'Healer',
    color: '#FFFFFF',
    hp: 90,
    shapes: ['cube', 'dodecahedron'],
    icon: 'plus',
    ability: { name: 'Quarantine', desc: 'Restores system integrity.' }
  },
  daemon: {
    id: 'daemon',
    name: 'Daemon',
    role: 'Support',
    color: '#FF1493',
    hp: 100,
    shapes: ['tetrahedron', 'octahedron'],
    icon: 'hourglass',
    ability: { name: 'Background Process', desc: 'Passive buffs.' }
  }
};