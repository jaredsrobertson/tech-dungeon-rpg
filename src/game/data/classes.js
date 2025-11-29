export const CLASSES = {
  firewall: {
    id: 'firewall',
    name: 'Firewall',
    role: 'Tank',
    color: '#2E9AFE',
    hp: 150, // Updated
    baseDmg: { min: 15, max: 25 }, // Updated
    shapes: ['cube', 'octahedron'],
    icon: 'shield',
    ability: { name: 'Packet Filter', desc: 'Basic mitigation attack.' }
  },
  crash: {
    id: 'crash',
    name: 'Crash',
    role: 'DPS',
    color: '#FF4500',
    hp: 100, // Updated
    baseDmg: { min: 35, max: 50 }, // Updated
    shapes: ['tetrahedron', 'cube'],
    icon: 'x',
    ability: { name: 'Buffer Overflow', desc: 'High damage burst.' }
  },
  rootkit: {
    id: 'rootkit',
    name: 'Rootkit',
    role: 'Rogue',
    color: '#9400D3',
    hp: 80, // Updated
    baseDmg: { min: 25, max: 40 }, // Updated
    shapes: ['dodecahedron', 'tetrahedron'],
    icon: 'star',
    ability: { name: 'Privilege Escalation', desc: 'High crit chance attack.' }
  },
  zeroday: {
    id: 'zeroday',
    name: 'Zero Day',
    role: 'Sniper',
    color: '#FFD700',
    hp: 60, // Updated
    baseDmg: { min: 50, max: 70 }, // Updated
    shapes: ['octahedron', 'dodecahedron'],
    icon: 'target',
    ability: { name: 'Exploit', desc: 'Ignores defense.' }
  },
  av: {
    id: 'av',
    name: 'Antivirus',
    role: 'Healer',
    color: '#FFFFFF',
    hp: 90, // Updated
    baseDmg: { min: 10, max: 20 }, // Updated
    shapes: ['cube', 'dodecahedron'],
    icon: 'plus',
    ability: { name: 'Quarantine', desc: 'Deals damage and restores small HP.' }
  },
  daemon: {
    id: 'daemon',
    name: 'Daemon',
    role: 'Support',
    color: '#FF1493',
    hp: 85, // Updated
    baseDmg: { min: 20, max: 30 }, // Updated
    shapes: ['tetrahedron', 'octahedron'],
    icon: 'hourglass',
    ability: { name: 'Background Process', desc: 'Low damage, reliable.' }
  }
};