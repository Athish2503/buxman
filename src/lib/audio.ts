/**
 * Audio utility for playing high-fidelity UI sounds using the Web Audio API.
 * This avoids external assets and ensures zero-latency playback across mobile devices.
 */

class AudioService {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;

  constructor() {
    // Attempt to unlock on common user interactions
    if (typeof window !== 'undefined') {
      ['click', 'touchstart', 'keydown'].forEach(evt => {
        window.addEventListener(evt, () => this.unlock(), { once: true });
      });
    }
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  public async unlock() {
    if (this.isUnlocked) return;
    const ctx = this.init();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    this.isUnlocked = true;
    console.log('AudioContext unlocked');
  }

  /**
   * Short high-frequency "tick" sound for selection
   */
  async tick() {
    try {
      const ctx = this.init();
      if (ctx.state === 'suspended') await ctx.resume();
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      // Silence fails
    }
  }

  /**
   * "Shimmer" sound for successful actions (layered)
   */
  async shimmer() {
    try {
      const ctx = this.init();
      if (ctx.state === 'suspended') await ctx.resume();
      
      const now = ctx.currentTime;
      const frequencies = [880, 1100, 1320, 1760]; // Musical major chord (A, C#, E, A)
      
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + i * 0.03;
        const duration = 0.4;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, startTime + duration);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.03, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch (e) {
      // Silence fails
    }
  }

  /**
   * Soft "pop" sound
   */
  async success() {
    try {
      const ctx = this.init();
      if (ctx.state === 'suspended') await ctx.resume();
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      // Silence fails
    }
  }

  /**
   * Error sound (low frequency thud)
   */
  async error() {
    try {
      const ctx = this.init();
      if (ctx.state === 'suspended') await ctx.resume();
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      // Silence fails
    }
  }
}

export const audio = new AudioService();
