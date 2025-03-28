export class BeepSound {
  private static audioContext: AudioContext | null = null;
  private static ringInterval: any = null;
  private static ringOscillator: OscillatorNode | null = null;
  private static gainNode: GainNode | null = null;

  static playMuteBeep() {
    this.playBeep(680, 0.1, "sine"); // Lower frequency for mute
  }

  static playUnmuteBeep() {
    this.playBeep(520, 0.1, "sine"); // Higher frequency for unmute
  }

  static playHangupBeep() {
    // Classic "busy tone" sequence: three short beeps
    const sequence = [
      { frequency: 480, duration: 0.2 },
      { frequency: 620, duration: 0.2 },
    ];
    sequence.forEach((tone, index) => {
      setTimeout(() => {
        this.playBeep(tone.frequency, tone.duration, "sine", 0.5);
      }, index * 250); // 250ms gap between tones
    });
  }

  static playRingTone() {
    // Standard ring pattern: 2 seconds ring, 4 seconds silence
    const ringDuration = 200; // 2 seconds ring
    const silenceDuration = 100; // 4 seconds silence

    // Play initial ring immediately
    this.playRingPattern();

    // Set up interval for repeated ringing
    this.ringInterval = setInterval(() => {
      this.playRingPattern();
    }, ringDuration + silenceDuration);
  }

  static stopRingTone() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.ringOscillator) {
      this.ringOscillator.stop();
      this.ringOscillator.disconnect();
      this.ringOscillator = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  private static playRingPattern() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          // @ts-ignore
          window.webkitAudioContext)();
      }

      // Clean up previous nodes if they exist
      if (this.gainNode) {
        this.gainNode.disconnect();
      }
      if (this.ringOscillator) {
        this.ringOscillator.stop();
        this.ringOscillator.disconnect();
      }

      // Create and configure oscillator
      this.ringOscillator = this.audioContext.createOscillator();
      this.ringOscillator.type = "sine";
      this.ringOscillator.frequency.setValueAtTime(
        440,
        this.audioContext.currentTime
      );

      // Create and configure gain node
      this.gainNode = this.audioContext.createGain();
      if (!this.gainNode) {
        throw new Error("Failed to create gain node");
      }
      this.gainNode.gain.value = 0.1;

      // Connect nodes
      if (this.ringOscillator && this.gainNode) {
        this.ringOscillator
          .connect(this.gainNode)
          .connect(this.audioContext.destination);

        // Start oscillator
        this.ringOscillator.start();

        // Schedule the ring pattern
        const ringDuration = 1000; // 1 second ring
        const silenceDuration = 2000; // 2 seconds silence

        setInterval(() => {
          if (this.gainNode && this.audioContext) {
            this.gainNode.gain.setValueAtTime(
              0.1,
              this.audioContext.currentTime
            );
            this.gainNode.gain.setValueAtTime(
              0,
              this.audioContext.currentTime + ringDuration / 1000
            );
          }
        }, ringDuration + silenceDuration);
      }
    } catch (error) {
      console.error("Error playing ring pattern:", error);
    }
  }

  static playShutterSound() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          // @ts-ignore
          window.webkitAudioContext)();
      }

      // Define a very short duration for the shutter sound
      const duration = 0.1; // seconds
      const sampleRate = this.audioContext.sampleRate;
      const buffer = this.audioContext.createBuffer(
        1,
        sampleRate * duration,
        sampleRate
      );
      const data = buffer.getChannelData(0);

      // Fill the buffer with noise that decays quickly
      for (let i = 0; i < data.length; i++) {
        // Create a quick decaying envelope: high at start, decaying fast.
        const envelope = Math.exp(-i / (sampleRate * 0.02));
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      // Create a buffer source for the noise
      const noiseSource = this.audioContext.createBufferSource();
      noiseSource.buffer = buffer;

      // Create a gain node for final volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1; // Adjust if you need a different volume

      // Connect nodes: noise -> gain -> destination
      noiseSource.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Start the noise burst immediately
      noiseSource.start();
    } catch (error) {
      console.error("Error playing shutter sound:", error);
    }
  }

  private static playBeep(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number = 0.1
  ) {
    console.log("Sound being played", frequency, duration, type, volume);
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          // @ts-ignore
          window.webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(
        frequency,
        this.audioContext.currentTime
      );

      // Smooth volume changes
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        volume,
        this.audioContext.currentTime + 0.01
      );
      gainNode.gain.linearRampToValueAtTime(
        0,
        this.audioContext.currentTime + duration
      );

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.error("Error playing beep sound:", error);
    }
  }
}
