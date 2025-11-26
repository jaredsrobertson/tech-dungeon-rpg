export const GRID_SPACING = 200;
export const TUNNEL_DEPTH = 3000;
export const PERSPECTIVE = 400;
export const NUM_PARTICLES = 50;
export const TARGET_FPS = 60;

// --- THEME CONFIGURATION ---
export const THEME = {
  PLAYER: {
    WIDTH: 220,
    GAP: 15,
    BOTTOM_OFFSET: 220, 
    BASE_SIZE: 150,
    ROTATION_SPEED: 12, 
    FLOAT_FREQ: 1.2,    
    FLOAT_AMP: 15,      
    MAG_PRIMARY: 0.03,  
    MAG_SECONDARY: 0.02 
  },
  ENEMY: {
    IDLE_FREQ: 1.2,     
    IDLE_AMP: 30,       
    ROT_SPEED_X: 0.5,   
    ROT_SPEED_Y: 0.8,
    ROT_SPEED_Z: 0.3,
    SCALE_UI: 100,      
    SCALE_WIRE: 2.0,    
    HIT_RADIUS: 0.8,    
    LERP_FACTOR: 0.05   
  },
  COMBAT: {
    SURGE_Z: 50,        
    SHAKE_X: 8,         
    DAMAGE_SHAKE: 20,   
    LASER_WIDTH: 4,
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
    TILT_FREQ_2: 0.33 
  }
};

// --- REQUESTED COLOR PALETTE ---
export const COLOR_PAIRS = [
  { name: 'Blue',       p: '#2E9AFE', s: '#0B3861' },
  { name: 'Red-Orange', p: '#FF4500', s: '#8B2500' },
  { name: 'Violet',     p: '#9400D3', s: '#4B0082' },
  { name: 'Pink',       p: '#FF1493', s: '#8B0A50' },
  { name: 'Yellow',     p: '#FFD700', s: '#8B7500' },
  { name: 'White',      p: '#FFFFFF', s: '#696969' },
];

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
        // Cube Corners (0-7)
        [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
        [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
        // YZ Plane Rect (8-11)
        [0, PHI, INV_PHI], [0, PHI, -INV_PHI], [0, -PHI, INV_PHI], [0, -PHI, -INV_PHI],
        // XZ Plane Rect (12-15)
        [INV_PHI, 0, PHI], [INV_PHI, 0, -PHI], [-INV_PHI, 0, PHI], [-INV_PHI, 0, -PHI],
        // XY Plane Rect (16-19)
        [PHI, INV_PHI, 0], [PHI, -INV_PHI, 0], [-PHI, INV_PHI, 0], [-PHI, -INV_PHI, 0]
    ],
    faces: [
        [0, 16, 1, 9, 8],
        [0, 8, 4, 14, 12],
        [0, 12, 2, 17, 16],
        [1, 9, 5, 13, 16],
        [1, 16, 17, 3, 13],
        [2, 12, 14, 6, 10],
        [2, 10, 11, 3, 17],
        [3, 11, 7, 15, 13],
        [4, 8, 9, 5, 18],
        [4, 18, 19, 6, 14],
        [5, 18, 19, 7, 15], 
        [6, 14, 4, 18, 19]  
    ]
  }
};

// Normalize and center all shapes on load
Object.keys(SHAPES).forEach(k => {
    SHAPES[k].vertices = centerVertices(normalizeVertices(SHAPES[k].vertices));
});

// --- SHAPE CONFIGURATION ---
export const SHAPE_PAIRS = [
    { p: 'cube', s: 'tetrahedron' },
    { p: 'cube', s: 'octahedron' },
    { p: 'cube', s: 'dodecahedron' },
    { p: 'tetrahedron', s: 'octahedron' },
    { p: 'tetrahedron', s: 'dodecahedron' },
    { p: 'octahedron', s: 'dodecahedron' }
];

export const CLASS_MAP = {
  'Firewall':  { desc: 'Tank' },
  'Daemon':    { desc: 'DPS' },
  'Admin':     { desc: 'Support' },
  'Root':      { desc: 'Heavy' },
  'Script':    { desc: 'Rogue' },
  'Antivirus': { desc: 'Healer' }
};

export const SHAPES_2D = ['circle', 'square', 'triangle', 'rhombus', 'hexagon', 'invertedTriangle'];

export const get2DShapePoints = (type, cx, cy, r) => {
    const toRad = (deg) => deg * Math.PI / 180;
    switch (type) {
        case 'circle': return null; 
        case 'square': return `${cx-r},${cy-r} ${cx+r},${cy-r} ${cx+r},${cy+r} ${cx-r},${cy+r}`;
        case 'triangle': return `${cx},${cy-r} ${cx+r*0.866},${cy+r*0.5} ${cx-r*0.866},${cy+r*0.5}`;
        case 'invertedTriangle': return `${cx},${cy+r} ${cx+r*0.866},${cy-r*0.5} ${cx-r*0.866},${cy-r*0.5}`;
        case 'rhombus': return `${cx},${cy-r} ${cx+r},${cy} ${cx},${cy+r} ${cx-r},${cy}`;
        case 'hexagon':
            let hex = "";
            for(let i=0; i<6; i++) { hex += `${cx + r*Math.cos(toRad(i*60-90))},${cy + r*Math.sin(toRad(i*60-90))} `; }
            return hex;
        default: return "";
    }
};

export class Particle {
  constructor(width, height) { this.reset(width, height, true); }
  reset(width, height, initial = false) {
    this.x = (Math.random() - 0.5) * width * 2;
    this.y = (Math.random() - 0.5) * height * 2;
    this.z = initial ? Math.random() * TUNNEL_DEPTH : TUNNEL_DEPTH;
    const speed = (2 + Math.random() * 4) * 5; 
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed * 0.3;
    this.vy = Math.sin(angle) * speed * 0.3;
    this.vz = -speed;
    this.size = 2 + Math.random() * 3; 
    this.opacity = 0.6 + Math.random() * 0.4; 
    this.twinkle = Math.random() * Math.PI * 2;
  }
  update(width, height, warpFactor = 1) {
    this.x += this.vx * warpFactor;
    this.y += this.vy * warpFactor;
    this.z += this.vz * warpFactor;
    this.twinkle += 0.1;
    if (this.z <= 0) this.reset(width, height);
  }
}

export class FloatingText {
  constructor(x, y, text, color) {
    this.x = x; this.y = y; this.text = text; this.color = color;
    this.life = 1.0; this.vy = -5; 
  }
  update() {
    this.y += this.vy;
    this.life -= 0.03; 
    if (this.life < 0) this.life = 0;
  }
}

const CODE_SYMBOLS = "<>{}[]/\\|;:_#$!@%^&*()-+=?"; 
const NUMS = "0123456789";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const GLITCH_CHARS = CODE_SYMBOLS.repeat(4) + NUMS.repeat(2) + ALPHABET;

export const generateGlitchText = () => {
    const numWords = 3 + Math.floor(Math.random() * 3); 
    let result = [];
    for(let i = 0; i < numWords; i++) {
        const r = Math.random();
        let len = (r < 0.2) ? 4 : (r < 0.5) ? 5 : (r < 0.8) ? 6 : 8; 
        let word = "";
        for(let j = 0; j < len; j++) word += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]; 
        result.push(word);
    }
    return result.join(' ');
};