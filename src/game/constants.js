// src/game/constants.js

export { CLASSES } from './data/classes';

export const GRID_SPACING = 200;
export const TUNNEL_DEPTH = 3000;
export const PERSPECTIVE = 400;
export const NUM_PARTICLES = 50;
export const TARGET_FPS = 60;

// Fixed length for dialogue
export const DIALOGUE_LENGTH = 25; 

// --- THEME CONFIGURATION ---
export const THEME = {
  PLAYER: {
    CARD_HEIGHT_BASE: 120,   
    SIDE_PADDING: 30,        
    GAP: 10,                 
    FLEX_INACTIVE: 1,        
    FLEX_ACTIVE: 2.2,        
    MAX_INACTIVE_WIDTH: 220,
    WIDTH: 220,         
    BOTTOM_OFFSET: 250, 
    BASE_SIZE: 100,
    ROTATION_SPEED: 12, 
    FLOAT_FREQ: 1.2,    
    FLOAT_AMP: 15,
    SWAY_FREQ: 0.6,
    SWAY_AMP_X: 20,
    SWAY_AMP_SCALE: 0.05,
    MAG_PRIMARY: 0.03,  
    MAG_SECONDARY: 0.02 
  },
  ENEMY: {
    IDLE_FREQ: 0.6,     
    IDLE_AMP: 30,       
    ROT_SPEED_X: 0.5,   
    ROT_SPEED_Y: 0.8,
    ROT_SPEED_Z: 0.3,
    SCALE_UI: 100,      
    SCALE_WIRE: 2.0,    
    HIT_RADIUS: 0.8,    
    LERP_FACTOR: 0.025   
  },
  BOSS: {
    COLOR: '#ff0000',
    PARTICLE_COUNT: 700, 
    CLOUD_RADIUS: 1400,  
    NOISE_SCALE: 200,    
    NOISE_SPEED: 1.5,    
    ROT_SPEED: 0.2,      
    CHAR_O: '01'         
  },
  COMBAT: {
    SURGE_Z: 50,        
    SHAKE_X: 8,         
    DAMAGE_SHAKE: 20,   
    LASER_WIDTH: 4,
    LASER_WIDTH_BOSS: 25, 
    LASER_COLOR: 'rgba(255, 0, 0, 0.8)' 
  },
  UI: {
    TOOLTIP_WIDTH: 180,
    TOOLTIP_HEIGHT: 70,
    TOOLTIP_OFFSET: 2.0, 
    FONT_NAME: 'bold 14px monospace',
    FONT_HP: '10px monospace',
    COLOR_BG: 'rgba(0, 0, 0, 0.9)',
    COLOR_BORDER: '#fff'
  },
  ENV: {
    TILT_AMP: 0.15, 
    TILT_FREQ_1: 0.2, 
    TILT_FREQ_2: 0.33,
    DRIFT_AMP: 0.025,   
    DRIFT_FREQ_X: 0.3,  
    DRIFT_FREQ_Y: 0.2   
  },
  MERCHANT: {
    COLOR_GOLD: '#FFD700',
    COLOR_BG: 'rgba(20, 20, 20, 0.95)',
    FONT_TITLE: 'bold 2rem monospace'
  }
};

// --- UTILS ---
const distance3D = (v1, v2) => {
  const dx = v1[0] - v2[0];
  const dy = v1[1] - v2[1];
  const dz = v1[2] - v2[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const getMaxExtent = (vertices) => {
  let maxDist = 0;
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dist = distance3D(vertices[i], vertices[j]);
      if (dist > maxDist) maxDist = dist;
    }
  }
  return maxDist;
};

const normalizeVertices = (vertices, targetExtent = 1.0) => {
  const currentExtent = getMaxExtent(vertices);
  const scale = targetExtent / currentExtent;
  return vertices.map(v => v.map(coord => coord * scale));
};

const centerVertices = (vertices) => {
    let cx = 0, cy = 0, cz = 0;
    vertices.forEach(v => { cx += v[0]; cy += v[1]; cz += v[2]; });
    cx /= vertices.length; cy /= vertices.length; cz /= vertices.length;
    return vertices.map(v => [v[0] - cx, v[1] - cy, v[2] - cz]);
};

// --- GEOMETRY GENERATORS ---
const PHI = (1 + Math.sqrt(5)) / 2;
const INV_PHI = 1 / PHI;

export const SHAPES = {
  cube: {
    vertices: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
    faces: [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[4,5,1,0],[3,2,6,7]]
  },
  tetrahedron: { 
    vertices: [[1,1,1], [1,-1,-1], [-1,1,-1], [-1,-1,1]],
    faces: [[0,1,2], [0,3,1], [0,2,3], [1,3,2]]
  },
  octahedron: {
    vertices: [[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]],
    faces: [[0,2,4],[0,4,3],[0,3,5],[0,5,2],[1,2,5],[1,5,3],[1,3,4],[1,4,2]]
  },
  dodecahedron: {
    vertices: [
        [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
        [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
        [0, PHI, INV_PHI], [0, PHI, -INV_PHI], [0, -PHI, INV_PHI], [0, -PHI, -INV_PHI],
        [INV_PHI, 0, PHI], [INV_PHI, 0, -PHI], [-INV_PHI, 0, PHI], [-INV_PHI, 0, -PHI],
        [PHI, INV_PHI, 0], [PHI, -INV_PHI, 0], [-PHI, INV_PHI, 0], [-PHI, -INV_PHI, 0]
    ],
    faces: [
        [0, 16, 1, 9, 8], [0, 8, 4, 14, 12], [0, 12, 2, 17, 16],
        [1, 9, 5, 13, 16], [1, 16, 17, 3, 13], [2, 12, 14, 6, 10],
        [2, 10, 11, 3, 17], [3, 11, 7, 15, 13], [4, 8, 9, 5, 18],
        [4, 18, 19, 6, 14], [5, 18, 19, 7, 15], [6, 14, 4, 18, 19]  
    ]
  }
};

Object.keys(SHAPES).forEach(k => {
    SHAPES[k].vertices = centerVertices(normalizeVertices(SHAPES[k].vertices));
});

export const get2DShapePoints = (type, cx, cy, r) => {
    const toRad = (deg) => deg * Math.PI / 180;
    
    switch (type) {
        case 'shield':
            return `M ${cx - r * 0.8} ${cy - r * 0.8} 
                    L ${cx + r * 0.8} ${cy - r * 0.8} 
                    Q ${cx + r * 0.8} ${cy + r * 0.2} ${cx} ${cy + r} 
                    Q ${cx - r * 0.8} ${cy + r * 0.2} ${cx - r * 0.8} ${cy - r * 0.8} Z`;

        case 'x':
            const w = r * 0.3;
            return `M ${cx - r} ${cy - r + w} L ${cx - w} ${cy} L ${cx - r} ${cy + r - w} 
                    L ${cx - r + w} ${cy + r} L ${cx} ${cy + w} L ${cx + r - w} ${cy + r} 
                    L ${cx + r} ${cy + r - w} L ${cx + w} ${cy} L ${cx + r} ${cy - r + w} 
                    L ${cx + r - w} ${cy - r} L ${cx} ${cy - w} L ${cx - r + w} ${cy - r} Z`;

        case 'plus':
            const pw = r * 0.4;
            return `M ${cx - pw} ${cy - r} L ${cx + pw} ${cy - r} L ${cx + pw} ${cy - pw} 
                    L ${cx + r} ${cy - pw} L ${cx + r} ${cy + pw} L ${cx + pw} ${cy + pw} 
                    L ${cx + pw} ${cy + r} L ${cx - pw} ${cy + r} L ${cx - pw} ${cy + pw} 
                    L ${cx - r} ${cy + pw} L ${cx - r} ${cy - pw} L ${cx - pw} ${cy - pw} Z`;

        case 'star':
            let path = "";
            for (let i = 0; i < 10; i++) {
                const angle = toRad(i * 36 - 90);
                const rad = i % 2 === 0 ? r : r * 0.4;
                const x = cx + Math.cos(angle) * rad;
                const y = cy + Math.sin(angle) * rad;
                path += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
            }
            return path + " Z";

        case 'hourglass':
            return `M ${cx - r} ${cy - r} L ${cx + r} ${cy - r} L ${cx} ${cy} L ${cx + r} ${cy + r} L ${cx - r} ${cy + r} L ${cx} ${cy} Z`;

        case 'target':
            const cPath = `M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z`;
            const lPath = `M ${cx} ${cy - r} L ${cx} ${cy + r} M ${cx - r} ${cy} L ${cx + r} ${cy}`;
            return cPath + " " + lPath; 

        default: 
            return `M ${cx} ${cy} m -${r}, 0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`;
    }
};

export class Particle {
  constructor(width, height) { this.reset(width, height, true); }
  reset(width, height, initial = false) {
    this.x = (Math.random() - 0.5) * width * 2;
    this.y = (Math.random() - 0.5) * height * 2;
    this.z = initial ? Math.random() * TUNNEL_DEPTH : TUNNEL_DEPTH;
    
    const speed = (2 + Math.random() * 4) * 2.5; 
    
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed * 0.3;
    this.vy = Math.sin(angle) * speed * 0.3;
    this.vz = -speed;
    
    this.size = 4 + Math.random() * 6; 
    this.opacity = 0.3 + Math.random() * 0.2; 
    
    this.twinkle = Math.random() * Math.PI * 2;
    this.char = Math.random() > 0.5 ? '1' : '0'; 
  }
  update(width, height, warpFactor = 1) {
    this.x += this.vx * warpFactor;
    this.y += this.vy * warpFactor;
    this.z += this.vz * warpFactor;
    this.twinkle += 0.1;
    if (this.z <= 0) this.reset(width, height);
  }
}

// OPTIMIZATION: Re-useable FloatingText for Object Pooling
export class FloatingText {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.text = '';
    this.color = '#fff';
    this.life = 0;
    this.vy = 0;
  }

  // Initialize from pool
  spawn(x, y, text, color) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 1.0;
    this.vy = -3; // Slower float for better readability
  }

  update() {
    if (!this.active) return;
    this.y += this.vy;
    this.life -= 0.02; // Slower fade
    if (this.life <= 0) this.active = false;
  }
}

const CODE_SYMBOLS = "<>{}[]/\\|;:_#$!@%^&*()-+=? "; 
const NUMS = "0123456789 ";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
export const GLITCH_CHARS = CODE_SYMBOLS.repeat(4) + NUMS.repeat(2) + ALPHABET;

export const generateGlitchText = () => {
    let result = "";
    for (let i = 0; i < DIALOGUE_LENGTH; i++) {
        result += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]; 
    }
    return result;
};