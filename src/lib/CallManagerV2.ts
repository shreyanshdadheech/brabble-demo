import * as protobuf from "protobufjs";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface CallManagerOptions {
  deploymentUrl: string;
  onConnectionStatusUpdated: (status: ConnectionStatus) => void;
  onAudioReceived?: (audioData: ArrayBuffer) => void;
  sampleRate?: number;
  numChannels?: number;
  onFunctionCall?: (data: any) => void;
  onFunctionResult?: (data: any) => void;
  onJsonMessage?: (data: any) => void;
}

export class CallManagerV2 {
  private static instance: CallManagerV2 | null = null;
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private audioNode: AudioWorkletNode | ScriptProcessorNode | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private playTime: number = 0;
  private lastMessageTime: number = 0;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private frameType: any = null;
  private deploymentUrl: string;
  private onConnectionStatusUpdated: (status: ConnectionStatus) => void;
  private onAudioReceived?: (audioData: ArrayBuffer) => void;
  private onFunctionCall?: (data: any) => void;
  private onFunctionResult?: (data: any) => void;
  private onJsonMessage?: (data: any) => void;
  private readonly SAMPLE_RATE: number;
  private readonly NUM_CHANNELS: number;
  private readonly PLAY_TIME_RESET_THRESHOLD_MS: number = 1.0;
  private functionHistory: Array<{
    type: string;
    data: any;
    timestamp: string;
  }> = [];
  private isInitialized: boolean = false;

  private constructor(options: CallManagerOptions) {
    this.deploymentUrl = options.deploymentUrl;
    this.onConnectionStatusUpdated = options.onConnectionStatusUpdated;
    this.onAudioReceived = options.onAudioReceived;
    this.onFunctionCall = options.onFunctionCall;
    this.onFunctionResult = options.onFunctionResult;
    this.onJsonMessage = options.onJsonMessage;
    this.SAMPLE_RATE = options.sampleRate || 16000;
    this.NUM_CHANNELS = options.numChannels || 1;

    this.loadProtobufDefinitions();
  }

  public static getInstance(options?: CallManagerOptions): CallManagerV2 {
    if (!CallManagerV2.instance) {
      if (!options) {
        throw new Error("CallManagerV2 must be initialized with options first");
      }
      CallManagerV2.instance = new CallManagerV2(options);
      CallManagerV2.instance.isInitialized = true;
    } else if (options && CallManagerV2.instance.isInitialized) {
      CallManagerV2.instance.updateOptions(options);
    }
    return CallManagerV2.instance;
  }

  public static resetInstance(): void {
    if (CallManagerV2.instance) {
      CallManagerV2.instance.stopCall();
    }
    CallManagerV2.instance = null;
  }

  private updateOptions(options: CallManagerOptions): void {
    this.deploymentUrl = options.deploymentUrl;
    this.onConnectionStatusUpdated = options.onConnectionStatusUpdated;
    this.onAudioReceived = options.onAudioReceived;
    this.onFunctionCall = options.onFunctionCall;
    this.onFunctionResult = options.onFunctionResult;
    this.onJsonMessage = options.onJsonMessage;
  }

  private loadProtobufDefinitions(): void {
    try {
      protobuf.load("/frames.proto", (err, root) => {
        if (err) {
          console.error("Failed to load protobuf definitions:", err);
          return;
        }
        if (!root) {
          console.error("Root is undefined after loading protobuf definitions");
          return;
        }
        this.frameType = root.lookupType("brabble.Frame");
        console.log("Protobuf definitions loaded successfully");
      });
    } catch (error) {
      console.error("Error in loadProtobufDefinitions:", error);
    }
  }

  public async makeCall(deploymentId?: string): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("Cannot make calls in a non-browser environment");
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("getUserMedia is not supported in your browser");
    }

    this.stopCall();

    this.onConnectionStatusUpdated("connecting");
    this.isPlaying = true;

    try {
      await this.initWebSocket(deploymentId);
    } catch (error) {
      this.stopCall();
      throw error;
    }
  }

  public muteCall(mute: boolean): void {
    this.isMuted = mute;
    if (this.source && this.audioNode) {
      if (mute) {
        try {
          this.source.disconnect(this.audioNode);
        } catch (e) {
          console.warn("Error while muting:", e);
        }
      } else {
        try {
          this.source.connect(this.audioNode);
        } catch (e) {
          console.warn("Error while unmuting:", e);
        }
      }
    }
  }

  public stopCall(): void {
    this.playTime = 0;
    this.isPlaying = false;

    if (this.ws) {
      try {
        if (
          this.ws.readyState === WebSocket.OPEN ||
          this.ws.readyState === WebSocket.CONNECTING
        ) {
          this.ws.close();
        }
      } catch (e) {
        console.warn("Error closing WebSocket:", e);
      }
      this.ws = null;
    }

    if (this.audioNode) {
      try {
        this.audioNode.disconnect();
      } catch (e) {
        console.warn("Error disconnecting audio node:", e);
      }
      this.audioNode = null;
    }

    if (this.source) {
      try {
        this.source.disconnect();
      } catch (e) {
        console.warn("Error disconnecting source:", e);
      }
      this.source = null;
    }

    if (this.microphoneStream) {
      try {
        this.microphoneStream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn("Error stopping microphone tracks:", e);
      }
      this.microphoneStream = null;
    }

    if (this.audioContext) {
      try {
        if (
          this.audioContext.state !== "closed" &&
          this.audioContext.state !== "closing"
        ) {
          this.audioContext
            .close()
            .catch((err) => console.warn("Error closing audio context:", err));
        }
      } catch (e) {
        console.warn("Error closing audio context:", e);
      }
      this.audioContext = null;
    }

    this.onConnectionStatusUpdated("disconnected");
  }

  public getFunctionHistory(): Array<{
    type: string;
    data: any;
    timestamp: string;
  }> {
    return [...this.functionHistory];
  }

  public clearFunctionHistory(): void {
    this.functionHistory = [];
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  private async initWebSocket(deploymentId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const useMockServer = false;

        const wsUrl = deploymentId
          ? `${this.deploymentUrl}/browser/${deploymentId}`
          : `${this.deploymentUrl}/ws`;

        console.log(`Connecting to WebSocket: ${wsUrl}`);

        if (this.ws) {
          try {
            if (
              this.ws.readyState === WebSocket.OPEN ||
              this.ws.readyState === WebSocket.CONNECTING
            ) {
              this.ws.close();
            }
          } catch (e) {
            console.warn("Error closing existing WebSocket:", e);
          }
        }

        if (useMockServer) {
          console.log("Using mock WebSocket server");
          setTimeout(() => {
            this.onConnectionStatusUpdated("connected");
            resolve();
          }, 1000);
          return;
        }

        this.ws = new WebSocket(wsUrl);
        this.ws.binaryType = "arraybuffer";

        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            reject(new Error("WebSocket connection timeout"));
          }
        }, 10000);

        this.ws.addEventListener("open", async () => {
          console.log("WebSocket connection established");
          clearTimeout(connectionTimeout);
          try {
            await this.sendDeviceInformation();
            await this.handleWebSocketOpen();
            resolve();
          } catch (error) {
            console.error("Error after WebSocket open:", error);
            reject(error);
          }
        });

        this.ws.addEventListener(
          "message",
          this.handleWebSocketMessage.bind(this)
        );

        this.ws.addEventListener("close", (event) => {
          console.log("WebSocket connection closed.", event.code, event.reason);
          clearTimeout(connectionTimeout);
          this.stopCall();
        });

        this.ws.addEventListener("error", (event) => {
          console.error("WebSocket error:", event);
          clearTimeout(connectionTimeout);
          reject(new Error("WebSocket error"));
        });
      } catch (error) {
        console.error("Error in initWebSocket:", error);
        reject(error);
      }
    });
  }

  private async sendDeviceInformation(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not open");
    }

    try {
      const deviceInfo = {
        sampleRate: this.audioContext?.sampleRate || this.SAMPLE_RATE,
        messageType: "deviceInfo",
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        language: navigator.language,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        connectionType: (navigator as any).connection
          ? (navigator as any).connection.effectiveType
          : "unknown",
      };

      let locationPromise: Promise<void> = Promise.resolve();

      if (navigator.geolocation) {
        locationPromise = new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              (deviceInfo as any).location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              };
              resolve();
            },
            (error) => {
              console.warn("Geolocation failed:", error.message);
              resolve();
            },
            { timeout: 10000, maximumAge: 60000 }
          );
        });
      }

      await locationPromise;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(deviceInfo));
        console.log("Device information sent successfully");
      } else {
        throw new Error("WebSocket closed during device info sending");
      }
    } catch (error) {
      console.error("Error sending device information:", error);
      throw error;
    }
  }

  private getAudioConstraints(): MediaStreamConstraints {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    };

    if (navigator.userAgent.indexOf("Chrome") !== -1) {
      (constraints.audio as MediaTrackConstraints).sampleRate =
        this.SAMPLE_RATE;
    }

    return constraints;
  }

  private async handleWebSocketOpen(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        this.getAudioConstraints()
      );
      this.microphoneStream = stream;

      const actualTrackSettings = this.microphoneStream
        .getAudioTracks()[0]
        .getSettings();
      const actualSampleRate =
        actualTrackSettings.sampleRate ?? this.SAMPLE_RATE;

      console.log("Actual audio track sample rate:", actualSampleRate);

      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      console.log(
        "Created AudioContext with sample rate:",
        this.audioContext.sampleRate
      );

      this.source = this.audioContext.createMediaStreamSource(stream);

      if (this.audioContext.audioWorklet) {
        console.log("Using modern AudioWorklet API");

        await this.audioContext.audioWorklet.addModule("/audio-processor.js");
        this.audioWorkletNode = new AudioWorkletNode(
          this.audioContext,
          "audio-processor",
          {
            processorOptions: {
              actualSampleRate: this.audioContext.sampleRate,
            },
          }
        );

        this.audioWorkletNode.port.onmessage = (event) => {
          if (!this.ws || !event.data || !event.data.audioData || this.isMuted)
            return;

          const pcmByteArray = new Uint8Array(event.data.audioData);
          this.sendAudioFrame(pcmByteArray);
        };

        this.source.connect(this.audioWorkletNode);
        this.audioNode = this.audioWorkletNode;
      } else {
        console.log("AudioWorklet not supported, using fallback");
        this.setupFallbackAudioProcessing();
      }

      this.onConnectionStatusUpdated("connected");
    } catch (err) {
      console.error("Error setting up audio processing:", err);
      throw new Error("Error setting up audio: " + (err as Error).message);
    }
  }

  private setupFallbackAudioProcessing(): void {
    if (!this.audioContext || !this.source) return;

    const bufferSize = 4096;
    const scriptProcessor = this.audioContext.createScriptProcessor(
      bufferSize,
      this.NUM_CHANNELS,
      this.NUM_CHANNELS
    );

    this.source.connect(scriptProcessor);
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0;
    scriptProcessor.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    scriptProcessor.onaudioprocess = (event) => {
      if (!this.ws || this.isMuted) return;

      const inputData = event.inputBuffer.getChannelData(0);

      const resampledData = this.resampleAudio(
        inputData,
        this.audioContext!.sampleRate,
        this.SAMPLE_RATE
      );

      const pcmS16Array = this.convertFloat32ToS16PCM(resampledData);
      const pcmByteArray = new Uint8Array(pcmS16Array.buffer);

      this.sendAudioFrame(pcmByteArray);
    };

    this.audioNode = scriptProcessor;
  }

  private resampleAudio(
    audioData: Float32Array,
    fromSampleRate: number,
    toSampleRate: number
  ): Float32Array {
    if (fromSampleRate === toSampleRate) return audioData;

    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.floor(audioData.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const position = i * ratio;
      const index = Math.floor(position);
      const fraction = position - index;

      if (index + 1 < audioData.length) {
        result[i] =
          audioData[index] * (1 - fraction) + audioData[index + 1] * fraction;
      } else {
        result[i] = audioData[index];
      }
    }

    return result;
  }

  private sendAudioFrame(pcmByteArray: Uint8Array): void {
    if (!this.frameType || !this.ws || this.ws.readyState !== WebSocket.OPEN)
      return;

    const frame = this.frameType.create({
      audio: {
        audio: Array.from(pcmByteArray),
        sampleRate: this.SAMPLE_RATE,
        numChannels: this.NUM_CHANNELS,
      },
    });

    const encodedFrame = new Uint8Array(this.frameType.encode(frame).finish());
    this.ws.send(encodedFrame);
  }

  private convertFloat32ToS16PCM(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = Math.round(sample < 0 ? sample * 32768 : sample * 32767);
    }
    return int16Array;
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    if (typeof event.data === "string") {
      try {
        const jsonMessage = JSON.parse(event.data);
        this.handleJsonMessage(jsonMessage);
        return;
      } catch (e) {
        console.warn("Received string message that's not valid JSON:", e);
      }
    }

    const arrayBuffer = event.data;

    if (this.onAudioReceived) {
      this.onAudioReceived(arrayBuffer);
      return; // Let the consumer handle audio directly with improved buffering
    }

    if (this.isPlaying) {
      requestAnimationFrame(() => {
        this.enqueueAudioFromProto(arrayBuffer);
      });
    }
  }

  private handleJsonMessage(jsonMessage: any): void {
    console.log("Received JSON message:", jsonMessage);

    if (
      jsonMessage.event === "function_call_in_progress" &&
      this.onFunctionCall
    ) {
      this.addToFunctionHistory("call", jsonMessage);
      this.onFunctionCall(jsonMessage);
    } else if (
      jsonMessage.event === "function_call_result" &&
      this.onFunctionResult
    ) {
      this.addToFunctionHistory("result", jsonMessage);
      this.onFunctionResult(jsonMessage);
    } else if (this.onJsonMessage) {
      this.onJsonMessage(jsonMessage);
    }
  }

  private addToFunctionHistory(type: string, data: any): void {
    const currentTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    this.functionHistory.push({
      type,
      data,
      timestamp: currentTime,
    });

    if (this.functionHistory.length > 50) {
      this.functionHistory.shift();
    }
  }

  private enqueueAudioFromProto(arrayBuffer: ArrayBuffer): boolean {
    if (!this.frameType || !this.audioContext) return false;

    try {
      const parsedFrame = this.frameType.decode(new Uint8Array(arrayBuffer));
      if (!parsedFrame?.audio) {
        return false;
      }

      const currentTime = this.audioContext.currentTime;
      const diffTime = currentTime - this.lastMessageTime;

      if (
        this.playTime === 0 ||
        diffTime > this.PLAY_TIME_RESET_THRESHOLD_MS ||
        this.playTime < currentTime
      ) {
        this.playTime = currentTime + 0.05;
      }
      this.lastMessageTime = currentTime;

      const audioVector = Array.from(parsedFrame.audio.audio);
      const audioArray = new Uint8Array(audioVector);

      try {
        const decodePromise = new Promise<AudioBuffer>((resolve, reject) => {
          this.audioContext!.decodeAudioData(
            audioArray.buffer,
            (buffer) => resolve(buffer),
            (error) => reject(error)
          );
        });

        decodePromise
          .then((buffer) => {
            if (!this.audioContext) return;

            const source = new AudioBufferSourceNode(this.audioContext);
            source.buffer = buffer;

            const gainNode = this.audioContext.createGain();
            gainNode.gain.setValueAtTime(0, this.playTime);
            gainNode.gain.linearRampToValueAtTime(0.8, this.playTime + 0.01);

            const compressor = this.audioContext.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 30;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            source.connect(gainNode);
            gainNode.connect(compressor);
            compressor.connect(this.audioContext.destination);

            source.onended = () => {
              try {
                source.disconnect();
                gainNode.disconnect();
                compressor.disconnect();
              } catch (e) {
                console.warn("Error during audio source cleanup:", e);
              }
            };

            source.start(this.playTime);

            this.playTime = this.playTime + buffer.duration;
          })
          .catch((err) => {
            console.error("Failed to decode audio data:", err);
            this.playTime = currentTime + 0.1;
          });

        return true;
      } catch (decodingError) {
        console.error("Exception during audio decoding setup:", decodingError);
        return false;
      }
    } catch (err) {
      console.error("Exception while decoding audio frame:", err);
      return false;
    }
  }
}
