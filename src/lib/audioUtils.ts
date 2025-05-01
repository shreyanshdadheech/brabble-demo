/**
 * Audio processing utilities for better voice quality
 */

/**
 * Creates an optimized audio processing chain for voice
 * @param audioContext The audio context
 * @param source The audio source node
 * @returns The final node in the chain that should be connected to destination
 */
export function createVoiceProcessingChain(
  audioContext: AudioContext,
  source: AudioNode
): AudioNode {
  // Create gain node for volume control
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.8;

  // Create compressor to normalize speech volume
  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  // Create high-pass filter to reduce low frequency noise
  const highPassFilter = audioContext.createBiquadFilter();
  highPassFilter.type = "highpass";
  highPassFilter.frequency.value = 200;

  // Create low-pass filter to reduce high frequency noise
  const lowPassFilter = audioContext.createBiquadFilter();
  lowPassFilter.type = "lowpass";
  lowPassFilter.frequency.value = 4000;

  // Connect the nodes in sequence
  source.connect(highPassFilter);
  highPassFilter.connect(lowPassFilter);
  lowPassFilter.connect(compressor);
  compressor.connect(gainNode);

  // Return the final node in the chain
  return gainNode;
}

/**
 * Optimized function to enqueue audio for smooth playback
 * @param audioContext The audio context
 * @param buffer The audio buffer to play
 * @param playTime The time to start playback
 * @returns The end time of this audio segment
 */
export function scheduleAudioPlayback(
  audioContext: AudioContext,
  buffer: AudioBuffer,
  playTime: number
): number {
  // Create source node
  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  // Create voice processing chain
  const finalNode = createVoiceProcessingChain(audioContext, source);

  // Connect to destination
  finalNode.connect(audioContext.destination);

  // Calculate fade in/out to avoid clicks
  const fadeTime = Math.min(0.01, buffer.duration * 0.1);

  if (finalNode instanceof GainNode) {
    finalNode.gain.setValueAtTime(0, playTime);
    finalNode.gain.linearRampToValueAtTime(0.8, playTime + fadeTime);

    // Fade out at the end
    finalNode.gain.setValueAtTime(0.8, playTime + buffer.duration - fadeTime);
    finalNode.gain.linearRampToValueAtTime(0, playTime + buffer.duration);
  }

  // Start playback
  source.start(playTime);

  // Set up cleanup
  source.onended = () => {
    try {
      source.disconnect();
      finalNode.disconnect();
    } catch (e) {
      console.warn("Error during audio source cleanup:", e);
    }
  };

  // Return the end time
  return playTime + buffer.duration;
}
