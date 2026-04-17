class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  private bgmOscillators: OscillatorNode[] = [];
  private bgmGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;

  private initVolume = 0.5;
  private isMuted = false;
  private lastCollisionTime = 0;

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.updateMasterVolume();

      // Prepare noise buffer for crashes
      const bufferSize = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val: number) {
    this.initVolume = val;
    this.updateMasterVolume();
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    this.updateMasterVolume();
  }

  private updateMasterVolume() {
    if (this.masterGain && this.ctx) {
      const val = this.isMuted ? 0 : this.initVolume;
      this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
    }
  }

  startBGM(theme: string) {
    this.stopBGM();
    if (!this.ctx || !this.masterGain) return;
    
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.15; // Smooth background level
    this.bgmGain.connect(this.masterGain);

    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';

    const lfoGain = this.ctx.createGain();
    this.lfo.connect(lfoGain);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    lfoGain.connect(filter.frequency);
    filter.connect(this.bgmGain);

    // Theme configs
    let notes: number[] = [];
    let lfoRate = 1;
    let filterBase = 1000;
    let filterMod = 800;

    switch(theme) {
      case 'circuit':
        notes = [130.81, 196.00]; // C3, G3
        lfoRate = 4; // Fast techno pulse
        filterBase = 300;
        filterMod = 500;
        break;
      case 'sprint':
        notes = [220.00, 277.18, 329.63]; // A3, C#4, E4
        lfoRate = 8;
        filterBase = 800;
        filterMod = 600;
        break;
      case 'matrix':
        notes = [146.83, 155.56, 174.61]; // D3, D#3, F3
        lfoRate = 0.5; // Slow sweep
        filterBase = 500;
        filterMod = 400;
        break;
      case 'oval':
      default:
        notes = [196.00, 261.63, 293.66]; // G3, C4, D4
        lfoRate = 2; // Medium pulse
        filterBase = 600;
        filterMod = 400;
        break;
    }

    this.lfo.frequency.value = lfoRate;
    filter.frequency.value = filterBase;
    lfoGain.gain.value = filterMod;

    notes.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      
      const osc2 = this.ctx!.createOscillator();
      osc2.type = 'square';
      osc2.frequency.value = freq * 1.005; // detune slight width

      osc.connect(filter);
      osc2.connect(filter);
      
      osc.start();
      osc2.start();
      this.bgmOscillators.push(osc, osc2);
    });
    
    this.lfo.start();
  }

  stopBGM() {
    this.bgmOscillators.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch(e){}
    });
    this.bgmOscillators = [];
    
    if (this.lfo) {
      try { this.lfo.stop(); this.lfo.disconnect(); } catch(e){}
      this.lfo = null;
    }
    
    if (this.bgmGain) {
      this.bgmGain.disconnect();
      this.bgmGain = null;
    }
  }

  playCollision() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    if (now - this.lastCollisionTime < 0.2) return;
    this.lastCollisionTime = now;

    // Thump
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.15);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);

    // Crunch
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1000, now);
    noiseFilter.frequency.linearRampToValueAtTime(300, now + 0.2);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSource.start(now);
    noiseSource.stop(now + 0.2);
  }

  playFinish() {
    if (!this.ctx || !this.masterGain) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gainNode = this.ctx!.createGain();
      osc.type = 'sine';
      
      const time = this.ctx!.currentTime + i * 0.12;
      osc.frequency.setValueAtTime(freq, time);
      
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.2, time + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
      
      osc.connect(gainNode);
      gainNode.connect(this.masterGain!);
      osc.start(time);
      osc.stop(time + 0.3);
    });
  }

  stopAll() {
    this.stopBGM();
  }
}

export const audioService = new AudioService();
