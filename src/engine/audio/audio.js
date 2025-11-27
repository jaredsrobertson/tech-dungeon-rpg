export class CyberSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.blipBuffers = []; 
    this.lastSpeakTime = 0;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; 
      this.masterGain.connect(this.ctx.destination);
      
      this.generateBlipBuffers();
    }
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.log("Audio Init Failed:", e));
    }
  }

  generateBlipBuffers() {
    if (!this.ctx) return;
    const baseFreqs = [200, 250, 300, 180];
    
    baseFreqs.forEach(freq => {
        const duration = 0.05;
        const sampleRate = this.ctx.sampleRate;
        const frameCount = sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            const wave = Math.sin(t * freq * 2 * Math.PI) > 0 ? 1 : -1;
            const envelope = 1 - (i / frameCount); 
            data[i] = wave * envelope * 0.5;
        }
        this.blipBuffers.push(buffer);
    });
  }

  speak(char, type = 'glitch') {
    if (!this.ctx || this.ctx.state === 'suspended' || this.blipBuffers.length === 0) return;
    
    const now = this.ctx.currentTime;
    if (now - this.lastSpeakTime < 0.05) return;
    this.lastSpeakTime = now;
    
    const source = this.ctx.createBufferSource();
    const randIdx = Math.floor(Math.random() * this.blipBuffers.length);
    source.buffer = this.blipBuffers[randIdx];
    
    if (type === 'trojan') {
        source.playbackRate.value = 0.5; 
    } else {
        source.playbackRate.value = 0.9 + Math.random() * 0.2;
    }

    source.connect(this.masterGain);
    source.start();
  }

  // UPDATED: Deeper, Ominous, Ethereal Charge
  charge() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    // Osc 1: Deep Sine (The Ethereal Layer)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(50, now);
    osc1.frequency.exponentialRampToValueAtTime(150, now + 1.5); // Subtle rise
    
    // Osc 2: Gritty Sawtooth (The Ominous Layer)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(40, now); // Sub-bass start
    osc2.frequency.exponentialRampToValueAtTime(300, now + 1.5); // Rising tension
    
    // Gain Envelopes
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.5);
    gain1.gain.linearRampToValueAtTime(0, now + 1.6);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.15, now + 1.0); // Fade in slower
    gain2.gain.linearRampToValueAtTime(0, now + 1.6);
    
    // Connect
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    
    // Play
    osc1.start(now);
    osc1.stop(now + 1.7);
    osc2.start(now);
    osc2.stop(now + 1.7);
  }

  playerAttack(isCrit = false) {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    if (isCrit) {
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.12);
    } else {
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.08);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  }

  // UPDATED: Deeper, Crunchier Attack
  enemyAttack() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    // Osc 1: Heavy Impact Sawtooth
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(80, now); // Start lower (80Hz)
    osc1.frequency.exponentialRampToValueAtTime(20, now + 0.4); // Drop to sub-bass
    
    // Osc 2: Square Wave for "Digital Crunch"
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(60, now);
    osc2.frequency.exponentialRampToValueAtTime(10, now + 0.3); // Fast drop

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(this.masterGain);
    gain2.connect(this.masterGain);
    
    gain1.gain.setValueAtTime(0.6, now); // Louder impact
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    gain2.gain.setValueAtTime(0.4, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  playerDamaged() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  enemyDamaged() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  defend() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.27);
  }

  playerDeath() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.8);
    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
    osc.start(now);
    osc.stop(now + 1.1);
  }

  enemyDeath() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  victory() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(523.25, now);
    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  warp() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(2000, now + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.65);
  }

  blip() {
    this.speak(' ', 'ui');
  }
}

export const audio = new CyberSynth();