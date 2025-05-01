class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    // Processor configuration
    this.targetSampleRate = options.processorOptions.targetSampleRate || 16000;
    this.actualSampleRate =
      options.processorOptions.actualSampleRate || sampleRate;

    // Resampling buffer if needed
    this.resampleBuffer = [];
    this.resampleRatio = this.actualSampleRate / this.targetSampleRate;
    this.resampleCounter = 0;
  }

  convertFloat32ToS16PCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const clampedValue = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] =
        clampedValue < 0 ? clampedValue * 32768 : clampedValue * 32767;
    }
    return int16Array;
  }

  process(inputs, outputs) {
    // Get the input audio data (we only use the first channel)
    const input = inputs[0];
    if (!input || !input.length || !input[0] || input[0].length === 0) {
      return true;
    }

    const audioData = input[0];
    let processedData;

    if (this.actualSampleRate !== this.targetSampleRate) {
      // Perform simple resampling
      processedData = this.resampleAudio(audioData);
    } else {
      processedData = audioData;
    }

    // Convert to S16 PCM format
    const pcmS16Array = this.convertFloat32ToS16PCM(processedData);

    // Send the processed audio data back to the main thread
    this.port.postMessage(
      {
        audioData: pcmS16Array.buffer,
      },
      [pcmS16Array.buffer]
    );

    // Return true to keep the processor alive
    return true;
  }

  resampleAudio(audioData) {
    // Simple linear resampling
    const result = [];

    for (let i = 0; i < audioData.length; i++) {
      this.resampleBuffer.push(audioData[i]);
      this.resampleCounter += 1 / this.resampleRatio;

      while (this.resampleCounter >= 1) {
        const index =
          this.resampleBuffer.length - Math.ceil(this.resampleCounter);
        const nextIndex = index + 1;

        if (index >= 0 && nextIndex < this.resampleBuffer.length) {
          const fraction =
            this.resampleCounter - Math.floor(this.resampleCounter);
          const sample =
            this.resampleBuffer[index] * (1 - fraction) +
            this.resampleBuffer[nextIndex] * fraction;
          result.push(sample);
        } else if (index >= 0 && index < this.resampleBuffer.length) {
          result.push(this.resampleBuffer[index]);
        }

        this.resampleCounter -= 1;
      }
    }

    // Keep only the most recent samples for the next processing cycle
    const bufferSize = Math.ceil(this.resampleRatio * 2);
    if (this.resampleBuffer.length > bufferSize) {
      this.resampleBuffer = this.resampleBuffer.slice(-bufferSize);
    }

    return new Float32Array(result);
  }
}

registerProcessor("audio-processor", AudioProcessor);
