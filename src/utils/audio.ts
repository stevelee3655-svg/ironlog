/**
 * Web Audio API synthesizer for gym timer sound effects.
 * 100% offline, zero network requests, lightweight, iOS Safari compatible.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        if (!this.isUnlocked) {
          const ctx = this.getContext();
          if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(() => {
              this.isUnlocked = true;
            }).catch(() => {});
          } else if (ctx) {
            this.isUnlocked = true;
          }
        }
      };

      window.addEventListener('touchstart', unlock, { once: true, passive: true });
      window.addEventListener('touchend', unlock, { once: true, passive: true });
      window.addEventListener('click', unlock, { once: true, passive: true });
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Play a crisp set completion click/pop sound
   */
  public playCheckSound() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // Audio playback might fail before user interaction
    }
  }

  /**
   * Play a loud, clear 3-tone chime when rest timer finishes (Gym friendly)
   */
  public playTimerFinishSound() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [659.25, 783.99, 1046.50]; // E5, G5, C6 (Bright energetic triad)

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const startTime = now + index * 0.15;
        const endTime = startTime + 0.3;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.4, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, endTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(endTime);
      });
    } catch {
      // Audio error fallback
    }
  }

  /**
   * Play a warning tick sound for last 3 seconds
   */
  public playCountdownTick() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // ignore
    }
  }
}

export const soundManager = new SoundSynthesizer();
