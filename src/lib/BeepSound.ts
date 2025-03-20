export class BeepSound {
  private static audioContext: AudioContext | null = null;

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

  private static playBeep(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number = 0.1
  ) {
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
