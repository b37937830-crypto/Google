// Web Audio API procedural sound synthesizer for physics battle sounds
// Generates soft pops, crisp wall bounces, elimination exits, and victory fanfares
class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private lastCollisionTime = 0;
  private lastEliminationTime = 0;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (val) {
      this.initCtx();
    }
  }

  // 1. Ball-to-Ball Collision Sound:
  // Short, clean, subtle "soft pop / light clack"
  // Throttled to ~48ms cooldown to prevent noise build-up
  public playBounce(intensity = 1.0) {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastCollisionTime < 48) return; // 48ms throttle (~20 pops/sec max)
    this.lastCollisionTime = now;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Clean, organic wooden-pop / soft sphere impact
      const startFreq = 220 + Math.random() * 80;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.035);

      const vol = Math.min(0.065, 0.025 * Math.max(0.4, intensity));
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.038);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // AudioContext autoplay policy or inactive
    }
  }

  // 2. Wall Bounce:
  // Subtle, rounded edge impact
  public playWallHit() {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastCollisionTime < 55) return;
    this.lastCollisionTime = now;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.055);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch {}
  }

  // 3. Elimination Sound:
  // Short distinct exit sound when a flag exits through the gap
  public playElimination() {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastEliminationTime < 80) return;
    this.lastEliminationTime = now;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Quick descending laser-ping exit
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(480, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.17);
    } catch {}
  }

  // 4. Winner Sound:
  // Distinct victory fanfare when one champion remains
  public playVictoryFanfare() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      // Uplifting celebratory chord [C5, E5, G5, C6]
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + idx * 0.06;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.16, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 1.65);
      });
    } catch {}
  }
}

export const soundFX = new SoundFX();
