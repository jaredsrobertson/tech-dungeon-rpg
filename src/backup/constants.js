export const GRID_SPACING = 200;
export const TUNNEL_DEPTH = 3000;
export const PERSPECTIVE = 400;
export const NUM_PARTICLES = 50;
export const TARGET_FPS = 60;

// --- THEME CONFIGURATION ---
export const THEME = {
  PLAYER: {
    WIDTH: 310,
    GAP: 40,
    BOTTOM_OFFSET: 260, 
    BASE_SIZE: 240,     
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

export const COLOR_PAIRS = [
  { p: '#00FF41', s: '#D600FF' }, // Green / Magenta
  { p: '#00FFFF', s: '#FF0055' }, // Cyan / Hot Pink
  { p: '#FFB000', s: '#0088FF' }, // Amber / Azure
  { p: '#FF3333', s: '#00FFC8' }, // Red / Teal
  { p: '#FAFF00', s: '#7700FF' }, // Yellow / Indigo
  { p: '#FFFFFF', s: '#FF4400' }, // White / Orange
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

const generateCone = (segments) => {
  const radius = 0.4; 
  const vertices = [[0, -0.1, 0]]; 
  const faces = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    vertices.push([Math.sin(angle) * radius, 0.3, Math.cos(angle) * radius]);
  }
  for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      faces.push([0, i + 1, next === 0 ? 1 : next + 1]);
      faces.push([i + 1, next === 0 ? 1 : next + 1, 0]); 
  }
  return { vertices: normalizeVertices(vertices, 1.0), faces };
};

const generateCylinder = (segments) => {
  const radius = 0.3;
  const vertices = [];
  const faces = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    vertices.push([Math.sin(angle) * radius, -0.5, Math.cos(angle) * radius]);
  }
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    vertices.push([Math.sin(angle) * radius, 0.5, Math.cos(angle) * radius]);
  }
  for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const t1 = i, t2 = next, b1 = i + segments, b2 = next + segments;
      faces.push([t1, t2, b2, b1]); 
      faces.push([t1, t2, t1]); 
      faces.push([b1, b2, b1]); 
  }
  return { vertices: normalizeVertices(vertices, 1.0), faces };
};

export const SHAPES = {
  cube: {
    vertices: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
    faces: [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[4,5,1,0],[3,2,6,7]]
  },
  sphere: { 
    vertices: [[0,-0.5257,0.8506],[0.8506,0,0.5257],[0.8506,0,-0.5257],[0,-0.5257,-0.8506],[-0.8506,0,-0.5257],[-0.8506,0,0.5257],[0,0.5257,0.8506],[0,0.5257,-0.8506],[0.5257,0.8506,0],[-0.5257,0.8506,0],[0.5257,-0.8506,0],[-0.5257,-0.8506,0]],
    faces: [[1,6,0],[11,0,6],[0,10,1],[1,10,2],[2,8,1],[1,8,6],[6,8,9],[9,5,6],[0,5,11],[5,9,4],[11,5,4],[4,3,11],[11,3,10],[2,10,3],[3,7,2],[2,7,8],[8,7,9],[9,7,4],[4,7,3],[3,10,0]] 
  },
  octahedron: {
    vertices: [[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]],
    faces: [[0,2,4],[0,4,3],[0,3,5],[0,5,2],[1,2,5],[1,5,3],[1,3,4],[1,4,2]]
  },
  squarePyramid: {
    vertices: [[0,-0.2,0], [0.6,0.6,0.6], [0.6,0.6,-0.6], [-0.6,0.6,-0.6], [-0.6,0.6,0.6]], 
    faces: [[0,1,2], [0,2,3], [0,3,4], [0,4,1], [1,2,3,4]] 
  },
  cylinder: generateCylinder(8),
  cone: generateCone(8)
};

// Optimized: Center vertices once on load, rather than every frame
Object.keys(SHAPES).forEach(k => {
    SHAPES[k].vertices = centerVertices(normalizeVertices(SHAPES[k].vertices));
});

export const CLASS_MAP = {
  'Firewall': 'cube',
  'Daemon': 'octahedron',
  'Admin': 'squarePyramid',
  'Root': 'cylinder',
  'Antivirus': 'sphere',
  'Script': 'cone'
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
        let len;
        if (r < 0.2) len = 4; 
        else if (r < 0.5) len = 5; 
        else if (r < 0.8) len = 6; 
        else len = 8; 
        
        let word = "";
        for(let j = 0; j < len; j++) { 
            word += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]; 
        }
        result.push(word);
    }
    return result.join(' ');
};