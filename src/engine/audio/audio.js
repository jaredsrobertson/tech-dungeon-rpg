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
}

export const audio = new CyberSynth();