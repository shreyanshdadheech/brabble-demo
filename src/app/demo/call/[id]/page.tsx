"use client";

import { PageTransition } from "@/components/PageTransition";
import {
  CallManagerOptions,
  CallManagerV2,
  ConnectionStatus,
} from "@/lib/CallManagerV2";
import {
  faAddressBook,
  faBatteryFull,
  faKeyboard,
  faMicrophone,
  faMicrophoneSlash,
  faPlus,
  faSignal,
  faVideo,
  faVolumeUp,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import { Phone, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";

// @ts-ignore
export default function CallPage({ params }) {
  // Unwrap params with React.use()
  // @ts-ignore
  const unwrappedParams = use(params);
  // @ts-ignore
  const businessId = unwrappedParams.id;

  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [duration, setDuration] = useState<string>("00:00");
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const [functionHistory, setFunctionHistory] = useState<
    Array<{
      type: string;
      data: any;
      timestamp: string;
    }>
  >([]);
  const [showFunctionHistory, setShowFunctionHistory] = useState(false);
  const [functionCallCount, setFunctionCallCount] = useState(0);
  const [showFunctionModal, setShowFunctionModal] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    functionName: string;
    arguments?: any;
    result?: any;
    isResult: boolean;
  } | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      type: string;
      title: string;
      content: string;
      timestamp: string;
    }>
  >([]);

  // Use ref to hold CallManagerV2 instance
  const callManagerV2Ref = useRef<CallManagerV2 | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;

  // Audio buffer queue improvements
  const audioQueueRef = useRef<
    Array<{
      source: AudioBufferSourceNode;
      endTime: number;
    }>
  >([]);
  const audioBufferQueueRef = useRef<AudioBuffer[]>([]);
  const isBufferingRef = useRef<boolean>(false);
  const isFirstAudioReceivedRef = useRef<boolean>(true);
  const MIN_BUFFER_SIZE = 3; // Min buffer chunks before playback
  const BUFFER_AHEAD_TIME = 0.3; // Buffer time in seconds
  let playTime = 0;

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
    updateTime();

    // Reset CallManagerV2 instance when component mounts
    CallManagerV2.resetInstance();

    return () => {
      // Clean up on unmount
      if (callManagerV2Ref.current) {
        callManagerV2Ref.current.stopCall();
        callManagerV2Ref.current = null;
      }
    };
  }, []);

  // Function to update time with consistent formatting
  const updateTime = () => {
    const now = new Date();
    // Use a fixed format that doesn't depend on locale
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const ampm = now.getHours() >= 12 ? "PM" : "AM";
    setCurrentTime(`${hours}:${minutes} ${ampm}`);
  };

  // Update time every minute
  useEffect(() => {
    if (!isClient) return;

    updateTime(); // Initial update

    const timer = setInterval(() => {
      updateTime();
    }, 60000);

    return () => clearInterval(timer);
  }, [isClient]);

  const businesses = [
    {
      id: "1",
      name: "City Central Hospital",
      phone: "+91 98765 XXXXX",
      deploymentId: "205397",
    },
    {
      id: "2",
      name: "IFSC Bank",
      phone: "+91 98765 XXXXX",
      deploymentId: "205398",
    },
  ];

  const business = businesses.find((b) => b.id === businessId) || businesses[0];

  // Add toasts and track function calls
  const addToast = (data: any, isResult: boolean) => {
    const id = `toast-${Date.now()}`;
    const currentTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const title = isResult
      ? `${data.function_name} (Result)`
      : data.function_name;
    const content = isResult
      ? typeof data.result === "object"
        ? JSON.stringify(data.result)
        : data.result
      : typeof data.arguments === "object"
      ? JSON.stringify(data.arguments)
      : data.arguments;

    setToasts((prev) => [
      ...prev,
      {
        id,
        type: isResult ? "result" : "call",
        title,
        content,
        timestamp: currentTime,
      },
    ]);

    // Auto remove toast after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);

    // Add to function history
    addToFunctionHistory(data, isResult, currentTime);

    // Increment function call counter
    setFunctionCallCount((prev) => prev + 1);
  };

  // Add to function history
  const addToFunctionHistory = (
    data: any,
    isResult: boolean,
    timestamp: string
  ) => {
    setFunctionHistory((prev) => [
      ...prev,
      {
        type: isResult ? "result" : "call",
        data,
        timestamp,
      },
    ]);
  };

  // Show function modal
  const showFunctionDetails = (data: any, isResult: boolean) => {
    setModalData({
      title: isResult ? "Function Result" : "Function Call",
      functionName: data.function_name,
      arguments: !isResult ? data.arguments : undefined,
      result: isResult ? data.result : undefined,
      isResult,
    });
    setShowFunctionModal(true);
  };

  // Handle connection status and duration timer
  useEffect(() => {
    if (!isClient) return;

    if (connectionStatus === "connected" && !startTimeRef.current) {
      startTimeRef.current = Date.now();

      durationIntervalRef.current = setInterval(() => {
        if (!startTimeRef.current) return;

        const elapsed = Date.now() - startTimeRef.current;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        setDuration(
          `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`
        );
      }, 1000);
    } else if (connectionStatus !== "connected") {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      startTimeRef.current = null;
      setDuration("00:00");
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isClient, connectionStatus]);

  // Initialize CallManagerV2 when call becomes active
  useEffect(() => {
    if (!isClient || !isCallActive) return;

    // Clear previous error state
    setConnectionError(null);

    // Initialize CallManagerV2
    const initializeCallManager = async () => {
      try {
        // Clean up existing call manager if exists
        if (callManagerV2Ref.current) {
          callManagerV2Ref.current.stopCall();
          callManagerV2Ref.current = null;
        }

        // Reset instance to ensure we start clean
        CallManagerV2.resetInstance();

        // Reset audio buffering state
        audioBufferQueueRef.current = [];
        isFirstAudioReceivedRef.current = true;
        isBufferingRef.current = false;

        // Initialize with options
        const options: CallManagerOptions = {
          // @ts-ignore

          deploymentUrl: process.env.NEXT_PUBLIC_DEPLOYMENT_URL,
          onConnectionStatusUpdated: (status) => {
            setConnectionStatus(status);
            if (status === "connected") {
              setConnectionRetries(0);
            }
          },
          sampleRate: 16000,
          numChannels: 1,
          onAudioReceived: (arrayBuffer) => {
            handleReceivedAudio(arrayBuffer);
          },
          onFunctionCall: (data) => {
            addToast(data, false);
          },
          onFunctionResult: (data) => {
            addToast(data, true);
          },
          onJsonMessage: (data) => {
            // Handle other JSON messages if needed
            console.log("Received JSON message:", data);
          },
        };

        callManagerV2Ref.current = CallManagerV2.getInstance(options);

        await callManagerV2Ref.current.makeCall(business.deploymentId);
      } catch (error) {
        console.error("Error starting V2 call:", error);

        // Handle retry logic
        if (connectionRetries < maxRetries) {
          setConnectionRetries((prev) => prev + 1);
          // @ts-ignore

          addErrorToast(
            `Connection attempt ${
              connectionRetries + 1
            }/${maxRetries} failed. Retrying...`
          );

          // Wait before retrying
          setTimeout(() => {
            if (isCallActive) {
              initializeCallManager();
            }
          }, 2000);
        } else {
          setConnectionError((error as Error).message);
          setIsCallActive(false);
          setConnectionStatus("disconnected");
          // @ts-ignore
          addErrorToast(
            "Failed to connect after several attempts: " +
              (error as Error).message
          );
        }
      }
    };

    initializeCallManager();

    return () => {
      // Clean up on effect cleanup
      if (callManagerV2Ref.current) {
        callManagerV2Ref.current.stopCall();
      }

      // Clean up audio resources
      cleanupAudio();
    };
  }, [isClient, isCallActive, connectionRetries, business.deploymentId]);

  // Function to handle received audio with improved buffering
  const handleReceivedAudio = (arrayBuffer: ArrayBuffer) => {
    // @ts-ignore

    if (!callManagerV2Ref.current?.frameType || !isClient) return;

    try {
      // @ts-ignore

      const parsedFrame = callManagerV2Ref.current.frameType.decode(
        new Uint8Array(arrayBuffer)
      );
      if (!parsedFrame?.audio) return;

      const audioVector = Array.from(parsedFrame.audio.audio);
      // @ts-ignore

      const audioArray = new Uint8Array(audioVector);

      // Get audio context from CallManagerV2
      const audioContext = callManagerV2Ref.current.getAudioContext();
      if (!audioContext) return;

      // Decode audio data
      audioContext.decodeAudioData(
        audioArray.buffer,
        (buffer) => {
          // Add to buffer queue
          audioBufferQueueRef.current.push(buffer);

          // Handle first audio received or buffering mode
          if (isFirstAudioReceivedRef.current || isBufferingRef.current) {
            if (isFirstAudioReceivedRef.current) {
              isFirstAudioReceivedRef.current = false;
              isBufferingRef.current = true;
            }

            // Start playback when buffer is filled
            if (audioBufferQueueRef.current.length >= MIN_BUFFER_SIZE) {
              isBufferingRef.current = false;
              playBufferedAudio(audioContext);
            }
            return;
          }

          // Normal playback when not buffering
          if (
            !isBufferingRef.current &&
            audioBufferQueueRef.current.length === 1
          ) {
            playBufferedAudio(audioContext);
          }
        },
        (error) => {
          console.error("Error decoding audio data:", error);
        }
      );
    } catch (error) {
      console.error("Exception while processing audio:", error);
    }
  };

  // Function to play buffered audio with reduced stuttering
  const playBufferedAudio = (audioContext: AudioContext) => {
    if (audioBufferQueueRef.current.length === 0 || !isClient || !isSpeakerOn)
      return;

    const currentTime = audioContext.currentTime;

    if (startTimeRef.current === null || playTime <= currentTime) {
      // Adding a small delay to ensure smooth playback
      playTime = currentTime + 0.05;
    }

    while (audioBufferQueueRef.current.length > 0) {
      const buffer = audioBufferQueueRef.current.shift();
      if (!buffer) continue;

      const source = audioContext.createBufferSource();
      source.buffer = buffer;

      // Create gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.8; // Somewhat loud but not max

      // Add high-pass filter to reduce feedback
      const highPassFilter = audioContext.createBiquadFilter();
      highPassFilter.type = "highpass";
      highPassFilter.frequency.value = 200;

      // Add low-pass filter to reduce high-frequency noise
      const lowPassFilter = audioContext.createBiquadFilter();
      lowPassFilter.type = "lowpass";
      lowPassFilter.frequency.value = 4000;

      // Connect the audio processing chain
      source.connect(highPassFilter);
      highPassFilter.connect(lowPassFilter);
      lowPassFilter.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Start playback at the scheduled time
      source.start(playTime);

      // Add to cleanup queue
      audioQueueRef.current.push({
        source,
        endTime: playTime + buffer.duration,
      });

      // Update next play time
      playTime += buffer.duration;
    }

    // Clean up finished audio sources
    cleanupAudioQueue(currentTime, audioContext);
  };

  // Function to clean up finished audio sources
  const cleanupAudioQueue = (
    currentTime: number,
    audioContext: AudioContext
  ) => {
    while (
      audioQueueRef.current.length > 0 &&
      audioQueueRef.current[0].endTime < currentTime
    ) {
      const oldNode = audioQueueRef.current.shift();
      if (!oldNode) continue;

      try {
        oldNode.source.disconnect();
      } catch (e) {
        console.warn("Error cleaning up audio node:", e);
      }
    }
  };

  // Function to clean up all audio resources
  const cleanupAudio = () => {
    // Stop and disconnect all active audio sources
    audioQueueRef.current.forEach((item) => {
      try {
        item.source.stop();
        item.source.disconnect();
      } catch (e) {
        console.warn("Error stopping audio source:", e);
      }
    });

    // Clear queues
    audioQueueRef.current = [];
    audioBufferQueueRef.current = [];
    isFirstAudioReceivedRef.current = true;
    isBufferingRef.current = false;
    playTime = 0;
  };

  const handleEndCall = () => {
    if (callManagerV2Ref.current) {
      callManagerV2Ref.current.stopCall();
    }
    setIsCallActive(false);
    setConnectionStatus("disconnected");
    cleanupAudio(); // Clean up audio resources
  };

  const handleMuteToggle = () => {
    if (callManagerV2Ref.current) {
      callManagerV2Ref.current.muteCall(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const handleConnect = async () => {
    try {
      // Reset connection retries
      setConnectionRetries(0);
      setConnectionError(null);

      // Check for permissions before connecting
      await checkPermissions();
      setIsCallActive(true);
    } catch (error) {
      console.error("Permission error:", error);
      // @ts-ignore

      addErrorToast((error as Error).message);
    }
  };

  const checkPermissions = async (): Promise<void> => {
    // Check microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      throw new Error(
        "Microphone access denied. Please allow microphone permission and try again."
      );
    }

    // Check location permission
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => reject(error),
          { timeout: 10000 }
        );
      });
    } catch (error) {
      throw new Error(
        "Location access denied. Please allow location permission and try again."
      );
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[linear-gradient(135deg,_#4b6cb7_0%,_#182848_100%)] p-4">
        <div className="relative w-full max-w-[375px] h-[770px] bg-gray-900 rounded-[55px] shadow-2xl border border-gray-800 p-3 overflow-hidden">
          {/* Side buttons */}
          <div className="absolute right-[-4px] top-[120px] w-1 h-[35px] bg-gray-800 rounded-l-sm"></div>
          <div className="absolute left-[-4px] top-[100px] w-1 h-[75px] bg-gray-800 rounded-r-sm"></div>

          {/* Screen */}
          <div className="w-full h-full  bg-[linear-gradient(135deg,_#081c24_0%,_#0a1014_100%)]  rounded-[45px] overflow-hidden relative flex flex-col">
            {/* Notch */}
            <div className="absolute top-0 left-0 w-full h-[35px] z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[180px] h-[35px] bg-[#1a1a1a] rounded-b-[18px] z-10 flex justify-center">
                <div className="w-[60px] h-[6px] rounded-[3px] bg-gray-800 mt-[10px]"></div>
                <div className="absolute right-[40px] top-[10px] w-[12px] h-[12px] rounded-full bg-gray-800"></div>
              </div>
            </div>

            {/* Status bar */}
            <div className="absolute top-2 left-0 right-0 px-5 flex justify-between text-white text-xs font-semibold z-10">
              <span>{currentTime || ""}</span>
              <div className="flex gap-1.5 margin 2">
                <FontAwesomeIcon icon={faSignal} fontSize={14} />
                <FontAwesomeIcon icon={faBatteryFull} fontSize={15} />
              </div>
            </div>

            {/* Call screen */}
            <div
              className="flex-1 flex flex-col pt-[48px] px-5 pb-10"
              style={{
                background:
                  "linear-gradient(160deg, rgba(14, 30, 43, 1) 0%, rgba(27, 42, 73, 1) 50%, rgba(14, 30, 43, 1) 100%)",
              }}
            >
              {/* Debug and history toggles */}
              <button
                onClick={() => setShowFunctionHistory((prev) => !prev)}
                className="absolute top-[50px] left-2.5 opacity-50 text-white bg-black/50 border-none rounded-full w-10 h-10 flex items-center justify-center z-20"
              >
                <span className="text-xs">{"{ }"}</span>
                {functionCallCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {functionCallCount}
                  </div>
                )}
              </button>

              {/* Connection error message */}
              {connectionError && (
                <div className="mx-auto my-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-center">
                  <p className="text-red-400 text-sm font-medium">
                    Connection Error
                  </p>
                  <p className="text-red-300 text-xs">{connectionError}</p>
                  <button
                    onClick={handleConnect}
                    className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white transition-colors"
                  >
                    Retry Connection
                  </button>
                </div>
              )}

              {/* Call header */}
              <div className="text-center my-12">
                <h3 className="text-xl font-bold mb-1 text-white">
                  {business.name}
                </h3>
                <p className="text-gray-400">{business.phone}</p>
                <div className="flex flex-col items-center gap-2 mt-2">
                  {connectionStatus !== "connected" ? (
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full transition-colors duration-300 ${
                        connectionStatus === "connecting"
                          ? "bg-yellow-500/10"
                          : "bg-red-500/10"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full animate-pulse ${
                          connectionStatus === "connecting"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      />
                      <span
                        className={
                          connectionStatus === "connecting"
                            ? "text-yellow-500 text-sm"
                            : "text-red-500 text-sm"
                        }
                      >
                        {connectionStatus === "connecting"
                          ? connectionRetries > 0
                            ? `Connecting (${connectionRetries}/${maxRetries})`
                            : "Connecting..."
                          : "Disconnected"}
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-sm text-green-500">
                        Duration: {duration}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Call options */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-3 gap-5 mb-12 px-2.5">
                  <div className="flex flex-col items-center">
                    <button
                      onClick={handleMuteToggle}
                      className={`${
                        isMuted ? "bg-red-600" : "bg-[rgba(255,255,255,0.15)]"
                      } text-white rounded-full p-3 w-[70px] h-[70px] flex items-center justify-center hover:bg-opacity-90 transition-colors`}
                    >
                      {isMuted ? (
                        <FontAwesomeIcon icon={faMicrophone} fontSize={24} />
                      ) : (
                        <FontAwesomeIcon
                          icon={faMicrophoneSlash}
                          fontSize={24}
                        />
                      )}
                    </button>
                    <span className="text-xs mt-1.5 text-gray-400">
                      {isMuted ? "Unmute" : "Mute"}
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <button className="bg-[rgba(255,255,255,0.15)] text-white rounded-full p-3 w-[70px] h-[70px] flex items-center justify-center hover:bg-opacity-25 transition-colors">
                      <FontAwesomeIcon icon={faKeyboard} fontSize={24} />
                    </button>
                    <span className="text-xs mt-1.5 text-gray-400">Keypad</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                      className={`${
                        !isSpeakerOn
                          ? "bg-red-600"
                          : "bg-[rgba(255,255,255,0.15)]"
                      } text-white rounded-full p-3 w-[70px] h-[70px] flex items-center justify-center hover:bg-opacity-90 transition-colors`}
                    >
                      <FontAwesomeIcon icon={faVolumeUp} fontSize={24} />
                    </button>
                    <span className="text-xs mt-1.5 text-gray-400">
                      Speaker
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <button className="bg-[rgba(255,255,255,0.15)] text-white rounded-full p-3 w-[70px] h-[70px] flex items-center justify-center hover:bg-opacity-90 transition-colors">
                      <FontAwesomeIcon icon={faPlus} fontSize={24} />
                    </button>
                    <span className="text-xs mt-1.5 text-gray-400">
                      Add Call
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <button className="bg-[rgba(255,255,255,0.15)] text-white rounded-full p-3 w-[70px] h-[70px] flex items-center justify-center hover:bg-opacity-90 transition-colors">
                      <FontAwesomeIcon icon={faVideo} fontSize={24} />
                    </button>
                    <span className="text-xs mt-1.5 text-gray-400">
                      FaceTime
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <button className="bg-[rgba(255,255,255,0.15)] text-white rounded-full p-3 w-[70px] h-[70px] flex items-center justify-center hover:bg-opacity-90 transition-colors">
                      <FontAwesomeIcon icon={faAddressBook} fontSize={24} />
                    </button>
                    <span className="text-xs mt-1.5 text-gray-400">
                      Contacts
                    </span>
                  </div>
                </div>
              </div>

              {/* End call or connect button */}
              <div className="text-center mt-auto mb-10">
                {!isCallActive ? (
                  <button
                    onClick={handleConnect}
                    className="w-[70px] h-[70px] rounded-full bg-green-500 border-none flex items-center justify-center mx-auto cursor-pointer shadow-lg shadow-green-500/40 hover:scale-105 transition-transform"
                    disabled={connectionStatus === "connecting"}
                  >
                    <Phone size={28} />
                  </button>
                ) : (
                  <button
                    onClick={handleEndCall}
                    className="w-[70px] h-[70px] rounded-full bg-red-600 border-none flex items-center justify-center mx-auto cursor-pointer shadow-lg shadow-red-500/40 hover:scale-105 transition-transform"
                  >
                    <Phone className="rotate-[135deg]" size={28} />
                  </button>
                )}
              </div>
            </div>

            {/* Function call toasts */}
            <div className="absolute top-[60px] right-2.5 w-[300px] max-w-[90%] z-30 flex flex-col-reverse gap-2 pointer-events-none">
              {toasts.map((toast) => (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.3 }}
                  className={`bg-black/70 text-white p-3 rounded-lg shadow-lg border-l-4 ${
                    toast.type === "result"
                      ? "border-blue-500"
                      : toast.type === "error"
                      ? "border-red-500"
                      : "border-green-500"
                  } cursor-pointer pointer-events-auto`}
                  onClick={() => {
                    // @ts-ignore

                    if (toast.type !== "error" && toast.data) {
                      // @ts-ignore

                      showFunctionDetails(toast.data, toast.type === "result");
                    }
                  }}
                >
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-xs">{toast.title}</span>
                    <span className="text-[10px] text-gray-300">
                      {toast.timestamp}
                    </span>
                  </div>
                  <div className="text-xs overflow-hidden text-ellipsis max-h-[60px] overflow-y-auto">
                    {toast.content}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Function history panel */}
            <motion.div
              className="absolute top-0 right-0 w-[350px] h-full bg-gradient-to-b from-gray-900 to-black z-40 p-4 border-l border-gray-800 flex flex-col"
              initial={{ right: "-350px" }}
              animate={{ right: showFunctionHistory ? 0 : "-350px" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="flex justify-between items-center pb-2.5 border-b border-gray-700 mb-2.5">
                <h3 className="font-bold text-white">Function Call History</h3>
                <button
                  onClick={() => setShowFunctionHistory(false)}
                  className="bg-transparent border-none text-gray-400 text-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5">
                {functionHistory.map((item, index) => (
                  <div
                    key={index}
                    className={`bg-white/5 rounded-lg p-2.5 border-l-4 ${
                      item.type === "result"
                        ? "border-blue-500"
                        : "border-green-500"
                    } text-xs cursor-pointer hover:bg-white/10`}
                    onClick={() => {
                      showFunctionDetails(item.data, item.type === "result");
                    }}
                  >
                    <div className="flex justify-between mb-1">
                      <span className="font-bold">
                        {item.type === "result"
                          ? `${item.data.function_name} (Result)`
                          : item.data.function_name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {item.timestamp}
                      </span>
                    </div>
                    <div className="text-gray-300 break-words">
                      {item.type === "result"
                        ? typeof item.data.result === "object"
                          ? JSON.stringify(item.data.result).substring(0, 50) +
                            "..."
                          : String(item.data.result).substring(0, 50)
                        : typeof item.data.arguments === "object"
                        ? JSON.stringify(item.data.arguments).substring(0, 50) +
                          "..."
                        : String(item.data.arguments).substring(0, 50)}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Function modal */}
            {showFunctionModal && (
              <div
                className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center"
                onClick={() => setShowFunctionModal(false)}
              >
                <div
                  className="bg-gray-900 w-[90%] max-w-[600px] rounded-xl shadow-2xl flex flex-col h-[50%] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/30">
                    <h3 className="text-base font-bold text-white">
                      {modalData?.title}
                    </h3>
                    <button
                      className="bg-transparent border-none text-gray-400 text-xl cursor-pointer"
                      onClick={() => setShowFunctionModal(false)}
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto">
                    <div className="mb-4">
                      <div className="text-sm text-gray-400 mb-1">
                        Function Name:
                      </div>
                      <div className="font-mono bg-black/30 p-2.5 rounded text-green-500 whitespace-pre-wrap break-words text-sm">
                        {modalData?.functionName}
                      </div>
                    </div>

                    {modalData?.arguments && (
                      <div className="mb-4">
                        <div className="text-sm text-gray-400 mb-1">
                          Arguments:
                        </div>
                        <div className="font-mono bg-black/30 p-2.5 rounded text-green-500 whitespace-pre-wrap break-words text-sm overflow-x-auto">
                          {typeof modalData.arguments === "object"
                            ? JSON.stringify(modalData.arguments, null, 2)
                            : modalData.arguments}
                        </div>
                      </div>
                    )}

                    {modalData?.result && (
                      <div className="mb-4">
                        <div className="text-sm text-gray-400 mb-1">
                          Result:
                        </div>
                        <div className="font-mono bg-black/30 p-2.5 rounded text-blue-500 whitespace-pre-wrap break-words text-sm overflow-x-auto">
                          {typeof modalData.result === "object"
                            ? JSON.stringify(modalData.result, null, 2)
                            : modalData.result}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Home indicator */}
            <div className="mb-2 mx-auto w-[130px] h-[5px] bg-white/70 rounded-full"></div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
