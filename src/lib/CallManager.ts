import { Logger } from "./Logger";
import { BeepSound } from "./BeepSound";

export interface CallManagerConfig {
  deploymentUrl: string;
  deploymentId: string;
  streamSid: string; // your unique Stream SID
  accountSid: string; // your Twilio account SID
  callSid: string; // your call SID
}

export class CallManager {
  private websocket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private ringOscillator: OscillatorNode | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private startEventSent = false;
  private audioQueue: any[] = [];
  private isMuted: boolean = false;

  private markQueue: string[] = [];
  private currentAudioSource: AudioBufferSourceNode | null = null; // Reference to the current playing audio source
  private orginalMediaStream = null;
  private isPlaying = false;
  private currentAudioItem: any;
  private logger: Logger = Logger.getInstance();

  private onCall = false;
  private isProcessingQueue = false; // used to ensure only one queue processor runs at a time

  private static config: CallManagerConfig;
  private static instance: CallManager;

  private constructor() {}

  public static getInstance(config: CallManagerConfig): CallManager {
    if (!CallManager.instance) {
      CallManager.instance = new CallManager();
    }
    CallManager.config = config;
    return CallManager.instance;
  }

  /**
   * Initiates a call by starting a ringing sound and connecting to the websocket.
   */
  public async makeCall(): Promise<void> {
    if (!this.onCall) {
      this.onCall = true;
      this.startRinging();
      await this.connectWebSocket();
    }
  }

  /**
   * Stops the call and cleans up all resources.
   */
  public stopCall(): void {
    // Stop audio streaming and clear media devices.

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    // Stop ringing sound if active.
    this.stopRinging();
    // Close websocket connection.
    if (this.websocket && this.websocket.OPEN) {
      this.sendStopEvent();
      this.logger.info("Websocket Closed from here");
      this.websocket.close();
      this.websocket = null;
    }
    this.onCall = false;
    this.startEventSent = false;
    this.audioQueue = [];

    this.markQueue = [];
    this.currentAudioItem = null;
    this.isProcessingQueue = false;
    BeepSound.playHangupBeep();
  }

  /**
   * Starts an oscillator to simulate a ringing sound.
   */
  private startRinging(): void {
    // Create an AudioContext if not already created.
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        // @ts-ignore
        window.webkitAudioContext)();
    }
    // Create a simple oscillator node as ringing tone.
    this.ringOscillator = this.audioContext.createOscillator();
    this.ringOscillator.type = "sine";
    this.ringOscillator.frequency.setValueAtTime(
      440,
      this.audioContext.currentTime
    );
    // Use a gain node to control volume (optional).
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0.1;
    this.ringOscillator
      .connect(gainNode)
      .connect(this.audioContext.destination);
    this.ringOscillator.start();
    this.logger.info("Ringing started");
  }

  /**
   * Stops the ringing sound.
   */
  private stopRinging(): void {
    if (this.ringOscillator) {
      this.ringOscillator.stop();
      this.ringOscillator.disconnect();
      this.ringOscillator = null;
      this.logger.info("Ringing stopped");
    }
  }

  /**
   * Mutes or unmutes the call
   * @param mute If true, mutes the call. If false, unmutes the call.
   * @returns Current mute state
   */
  public muteCall(mute?: boolean): boolean {
    if (mute === undefined) {
      this.isMuted = !this.isMuted;
    } else {
      this.isMuted = mute;
    }

    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });

      // Play appropriate beep sound
      if (this.isMuted) {
        BeepSound.playMuteBeep();
      } else {
        BeepSound.playUnmuteBeep();
      }

      this.logger.info(`Call ${this.isMuted ? "muted" : "unmuted"}`);
    } else {
      this.logger.warn("No active media stream to mute/unmute");
    }

    return this.isMuted;
  }

  /**
   * Connects to the WebSocket server and sets up event handlers.
   */
  private async connectWebSocket(): Promise<void> {
    let websocketUrl = CallManager.config.deploymentUrl;
    if (!CallManager.config.deploymentId) {
      throw new Error("Deployment ID is missing!");
    }
    websocketUrl += `/${CallManager.config.deploymentId}`;

    this.websocket = new WebSocket(websocketUrl);
    this.websocket.binaryType = "arraybuffer";

    this.websocket.onopen = () => {
      this.logger.info("WebSocket connection established");
      // Once connected, stop ringing and send connected event.
      this.stopRinging();
      this.sendConnectedEvent();
      this.startStreamingAudio();
    };

    this.websocket.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      // Handle incoming messages: media, mark, clear, etc.
      if (data.event === "media") {
        // Process incoming media payload as needed
        this.queueAudio(data.media.payload); // Add audio to the queue

        this.logger.info("Media payload received");
      }
      if (data.event === "mark") {
        this.handleMarkEvent(data.mark);
      }
      if (data.event === "clear") {
        this.stopAudioPlayback();
      }
    };

    this.websocket.onerror = (error: Event) => {
      console.error("WebSocket error:", error);
      this.stopCall();
    };

    this.websocket.onclose = () => {
      this.logger.info("WebSocket connection closed");
      this.stopCall();
    };
  }

  // Call this to queue a new audio payload
  private queueAudio(payload: string) {
    // You can also attach a mark to each item if needed:
    this.audioQueue.push({ payload, mark: null });
    this.logger.info(
      "Audio added to queue. Queue length:",
      this.audioQueue.length
    );

    // Start processing if not already doing so
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  // Process the audio queue sequentially.
  private async processQueue() {
    this.isProcessingQueue = true;

    while (this.audioQueue.length > 0) {
      // Get the next audio item.
      this.currentAudioItem = this.audioQueue.shift();
      // If there are any queued marks (from earlier mark events), and the current audio has no mark yet,
      // assign the earliest mark to it.
      if (this.currentAudioItem.mark === null && this.markQueue.length > 0) {
        this.currentAudioItem.mark = this.markQueue.shift();
      }

      try {
        // Wait until playback finishes.
        await this.playAudioAsync(this.currentAudioItem.payload);
      } catch (error) {
        console.error("Error during playback:", error);
      }

      // When playback completes, send the mark if one was attached.
      if (this.currentAudioItem.mark !== null) {
        const markMessage = {
          event: "mark",
          mark: this.currentAudioItem.mark,
          streamSid: "",
        };
        this.websocket?.send(JSON.stringify(markMessage));
        this.logger.info(
          "Sent mark for audio item:",
          this.currentAudioItem.mark
        );
      } else {
        console.warn("No mark available for this audio item.");
      }

      // Reset currentAudioItem.
      this.currentAudioItem = null;
    }

    this.logger.info("Finished processing audio queue.");
    this.isProcessingQueue = false;
  }

  // Wrap the playback in a promise so that we can await until it finishes.
  private async playAudioAsync(payload: string) {
    return new Promise((resolve, reject) => {
      // Convert the base64 payload into binary data
      const audioData = atob(payload);
      const audioBuffer = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioBuffer[i] = audioData.charCodeAt(i);
      }

      // Decode the audio data
      this.audioContext?.decodeAudioData(
        audioBuffer.buffer,
        (buffer) => {
          const source = this.audioContext!.createBufferSource();
          source.buffer = buffer;
          source.connect(this.audioContext!.destination);
          this.currentAudioSource = source;

          source.onended = () => {
            this.logger.info("Audio playback finished");
            this.currentAudioSource = null;
            resolve(undefined);
          };

          source.start(0);
          this.logger.info("Audio playing");
        },
        (error) => {
          console.error("Error decoding audio:", error);
          reject(error);
        }
      );
    });
  }

  /**
   * Sends the connected event message after the websocket is open.
   */
  private sendConnectedEvent(): void {
    if (!this.websocket) return;
    const connectedMessage = {
      event: "connected",
      protocol: "Call",
      version: "1.0.0",
    };
    this.websocket.send(JSON.stringify(connectedMessage));
    this.logger.info("Connected event sent");
  }

  /**
   * Sends a stop event to the server before closing the websocket.
   */
  private sendStopEvent(): void {
    if (!this.websocket) return;
    const stopMessage = {
      event: "stop",
      streamSid: CallManager.config.streamSid,
    };
    this.websocket.send(JSON.stringify(stopMessage));
    this.logger.info("Stop event sent");
  }

  /**
   * Begins audio streaming using getUserMedia and the AudioWorklet.
   */
  private startStreamingAudio(): void {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(async (stream: MediaStream) => {
        // Initialize (or reinitialize) the AudioContext.
        this.audioContext = new (window.AudioContext ||
          // @ts-ignore
          window.webkitAudioContext)();
        this.mediaStream = stream;
        const mediaSource = this.audioContext.createMediaStreamSource(stream);

        // Load an inline AudioWorkletProcessor.
        const processorCode = `
          class AudioProcessor extends AudioWorkletProcessor {
            process(inputs, outputs) {
              const input = inputs[0];
              if (input && input.length > 0) {
                const channelData = input[0];
                this.port.postMessage(channelData);
              }
              return true;
            }
          }
          registerProcessor('audio-processor', AudioProcessor);
        `;
        const blob = new Blob([processorCode], {
          type: "application/javascript",
        });
        const url = URL.createObjectURL(blob);
        await this.audioContext.audioWorklet.addModule(url);

        // Create and connect the AudioWorkletNode.
        this.workletNode = new AudioWorkletNode(
          this.audioContext,
          "audio-processor",
          {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [1],
          }
        );
        mediaSource.connect(this.workletNode);
        this.workletNode.connect(this.audioContext.destination);

        // Send the start event only once.
        if (!this.startEventSent) {
          const audioTrack = stream.getAudioTracks()[0];
          const settings = audioTrack.getSettings();
          const channels = settings.channelCount || 1;
          this.sendStartEvent(this.audioContext.sampleRate, channels);
          this.logger.info("Start Event Sent");
          this.startEventSent = true;
        }

        // Listen for audio data from the worklet.
        this.workletNode.port.onmessage = (event: MessageEvent) => {
          if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const float32Data = event.data;
            // Convert the float32 data to linear16.
            const linear16Data = this.convertFloat32ToLinear16(float32Data);
            this.sendMediaMessage(linear16Data);
          }
        };
      })
      .catch((err) => {
        console.error("Error accessing microphone:", err);
      });
  }

  /**
   * Sends the start event message including media format details.
   */
  private sendStartEvent(sampleRate: number, channels: number): void {
    if (!this.websocket) return;

    const browserInfo = this.getBrowserDetails();
    const startMessage = {
      event: "start",
      sequenceNumber: "1",
      start: {
        accountSid: CallManager.config.accountSid,
        streamSid: CallManager.config.streamSid,
        callSid: CallManager.config.callSid,
        tracks: ["inbound"],
        mediaFormat: {
          encoding: "linear16",
          sampleRate: sampleRate,
          channels: channels,
        },
        customParameters: {
          FirstName: "Jane",
          type: "browser",
          direction: "inbound",
          caller: browserInfo,
          LastName: "Doe",
          RemoteParty: "Bob",
        },
      },
      streamSid: CallManager.config.streamSid,
    };
    this.websocket.send(JSON.stringify(startMessage));
    this.logger.info(
      "Start event sent with sampleRate:",
      sampleRate,
      "channels:",
      channels
    );
  }

  // Handle incoming mark events.
  handleMarkEvent(mark: string) {
    this.logger.info("Mark event received:", mark);
    // If an audio is currently processing and no mark is attached yet, assign the mark.
    if (this.currentAudioItem !== null && this.currentAudioItem.mark === null) {
      this.currentAudioItem.mark = mark;
    } else {
      this.logger.info(`${this.markQueue}`, "Marks Queue from else");
      // Otherwise, store the mark for the next available audio item.
      this.markQueue.push(mark);
    }
  }

  stopAudioPlayback() {
    this.isPlaying = false;
    this.audioQueue = []; // Clear the queue

    // this.logger.info("Playback stopped, and queue cleared");
    this.markQueue.forEach((mark) => {
      const markMessage = {
        event: "mark",
        mark: mark,
        streamSid: "",
      };
      this.websocket?.send(JSON.stringify(markMessage));
    });
    this.markQueue = []; // Clear the mark queue

    // Stop the currently playing audio
    if (this.currentAudioSource) {
      this.currentAudioSource.stop(); // Stop the audio immediately
      this.currentAudioSource.disconnect(); // Clean up the audio node
      this.currentAudioSource = null; // Clear the reference
      // this.logger.info("Current audio playback stopped");
    }
  }

  /**
   * Helper: Convert Float32Array audio data to a linear16 Int16Array.
   */
  private convertFloat32ToLinear16(buffer: Float32Array): Int16Array {
    const l16Buffer = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      l16Buffer[i] = s < 0 ? s * 32768 : s * 32767;
    }
    return l16Buffer;
  }

  /**
   * Sends media (audio) messages over the WebSocket.
   */
  private sendMediaMessage(linear16Data: Int16Array): void {
    if (!this.websocket) return;
    // Convert Int16Array to a base64-encoded string.
    const uint8Data = new Uint8Array(linear16Data.buffer);
    let binary = "";
    for (let i = 0; i < uint8Data.byteLength; i++) {
      binary += String.fromCharCode(uint8Data[i]);
    }
    const payload = window.btoa(binary);
    const mediaMessage = {
      event: "media",
      sequenceNumber: Date.now().toString(),
      media: {
        track: "inbound",
        chunk: Date.now(),
        timestamp: Date.now(),
        payload: payload,
      },
      streamSid: CallManager.config.streamSid,
    };
    this.websocket.send(JSON.stringify(mediaMessage));
  }

  /**
   * Helper: Get browser details.
   */
  private getBrowserDetails(): string {
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    let os = "Unknown OS";
    let deviceType = "Desktop";

    if (/chrome|chromium|crios/i.test(ua)) {
      browser = "Chrome";
    } else if (/firefox|fxios/i.test(ua)) {
      browser = "Firefox";
    } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
      browser = "Safari";
    } else if (/edg/i.test(ua)) {
      browser = "Edge";
    } else if (/opr|opera/i.test(ua)) {
      browser = "Opera";
    }

    if (/win/i.test(ua)) {
      os = "Windows";
    } else if (/mac/i.test(ua)) {
      os = "MacOS";
    } else if (/linux/i.test(ua)) {
      os = "Linux";
    } else if (/android/i.test(ua)) {
      os = "Android";
      deviceType = "Mobile";
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      os = "iOS";
      deviceType = "Mobile";
    }

    return `${browser} on ${os} (${deviceType})`;
  }
}
