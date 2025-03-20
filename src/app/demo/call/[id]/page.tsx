"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { X, Mic, Speaker, ChevronDown, MicOff } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { AnimatedMoon } from "@/components/AnimatedMoon";
import { motion } from "framer-motion";
import { AccessDialog } from "@/components/AccessDialog";
import { CallManager, CallManagerConfig } from "@/lib/CallManager"; // Adjust path as needed
import { BeepSound } from "@/lib/BeepSound";

// @ts-ignore
export default function CallPage({ params }) {
  // Unwrap params with React.use()
  // @ts-ignore
  const unwrappedParams = use(params);
  // @ts-ignore
  const businessId = unwrappedParams.id;

  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Use a ref to hold the CallManager instance
  const callManagerRef = useRef<CallManager | null>(null);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
    updateTime();
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
      name: "ABC Travel",
      phone: "+91 98765 XXXXX",
      map: {
        english: "3",
        hindi: "1",
      },
    },
    {
      id: "2",
      name: "Alolo Hospital",
      phone: "+91 98765 XXXXX",
      map: {
        english: "4",
        hindi: "5",
      },
    },
    {
      id: "3",
      name: "XYZ Logistics",
      phone: "+91 98765 XXXXX",
      map: {
        english: "6",
        hindi: "7",
      },
    },
  ];

  const business = businesses.find((b) => b.id === businessId) || businesses[0];

  // Initialize the CallManager when component mounts or language changes
  // Only run on client-side
  useEffect(() => {
    if (!isClient) return;

    // If there's an existing call, stop it first
    if (callManagerRef.current) {
      callManagerRef.current.stopCall();
    }

    console.log("This must hppen after");

    const config: CallManagerConfig = {
      // @ts-ignore
      deploymentUrl: process.env.NEXT_PUBLIC_DEPLOYMENT_URL,
      // @ts-ignore
      deploymentId: business?.map[selectedLanguage.toLowerCase()],
      streamSid: "MZXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      accountSid: "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      callSid: "CAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    };

    // Create a new CallManager instance
    callManagerRef.current = CallManager.getInstance(config);

    // Make the call with the new language configuration
    callManagerRef.current.makeCall().catch((error) => {
      console.error("Error initiating call:", error);
    });

    console.log(`Call initialized with language: ${selectedLanguage}`);

    // Cleanup function to stop call when component unmounts or language changes again
    return () => {
      if (callManagerRef.current) {
        console.log(`Stopping previous call for language: ${selectedLanguage}`);
        callManagerRef.current.stopCall();
      }
    };
  }, [selectedLanguage, isClient]); // Re-run effect when ID, language, or client state changes

  const handleEndCall = () => {
    if (callManagerRef.current) {
      callManagerRef.current.stopCall();
    }
    router.push("/demo");
  };

  const handleMuteToggle = () => {
    if (callManagerRef.current) {
      const newMuteState = callManagerRef.current.muteCall();
      setIsMuted(newMuteState);
    }
  };

  const languages = ["Hindi", "English"];

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col md:flex-row items-center justify-center bg-purple-50">
        {/* Language selection - hidden on mobile */}
        <div className="hidden md:flex w-full md:w-1/2 flex-col items-center">
          <div className="max-w-xs w-full">
            <h2 className="text-xl font-bold mb-8 text-center">
              Select Language
            </h2>
            <div className="flex flex-col space-y-4">
              {languages.map((language) => (
                <button
                  key={language}
                  onClick={() => setSelectedLanguage(language)}
                  className={`py-4 px-4 rounded-lg text-center font-medium transition-colors ${
                    selectedLanguage === language
                      ? "bg-purple-950 text-white"
                      : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8">
            <AccessDialog />
          </div>
        </div>

        {/* Phone interface - full width on mobile */}
        <div className="w-full md:w-1/2 h-screen md:h-auto flex items-center justify-center">
          <div className="relative w-full h-full md:w-[320px] md:h-[650px] bg-gradient-to-b from-gray-800 to-black md:rounded-[55px] md:p-[12px] md:shadow-xl md:border-[14px] border-black overflow-hidden">
            {/* iPhone notch - only visible on desktop */}
            <div className="hidden md:block absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-7 bg-black rounded-b-xl z-10"></div>

            {/* Phone UI - full height on mobile */}
            <div className="relative h-full md:rounded-[40px] flex flex-col">
              {/* Status bar */}
              <div className="pt-2 pb-2 px-5 flex justify-between items-center text-xs text-white">
                <span className="font-semibold">{currentTime || ""}</span>
                <div className="flex space-x-1">
                  <div className="w-4 h-2.5 bg-white rounded-sm"></div>
                  <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                  <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                </div>
              </div>

              {/* Language dropdown */}
              <div className="relative px-4 py-2">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center justify-between w-full bg-gray-700 text-white rounded-lg px-4 py-2 text-sm"
                >
                  <span>{selectedLanguage}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {isClient && showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 rounded-lg shadow-lg z-20 mx-4">
                    {languages.map((language) => (
                      <button
                        key={language}
                        onClick={() => {
                          setSelectedLanguage(language);
                          setShowDropdown(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600"
                      >
                        {language}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Full moon visualization with enhanced animation */}
              <div className="flex-1 flex items-center justify-center relative">
                {isClient && (
                  <>
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="relative"
                    >
                      <AnimatedMoon variant="sun" className="w-48 h-48" />
                    </motion.div>

                    {/* Enhanced ripple effects */}
                    <motion.div
                      className="absolute pointer-events-none"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [1, 2, 3], opacity: [0.3, 0.2, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        background:
                          "radial-gradient(circle, rgb(250, 204, 21) 0%, transparent 70%)",
                        width: "200px",
                        height: "200px",
                        borderRadius: "50%",
                      }}
                    />
                  </>
                )}

                {/* Non-animated fallback for server-side rendering */}
                {!isClient && (
                  <div className="relative w-48 h-48 bg-yellow-300 rounded-full"></div>
                )}
              </div>

              {/* Full screen ripple effect - only rendered client-side */}
              {isClient && (
                <motion.div
                  className="fixed inset-0 pointer-events-none"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 100, opacity: 0.1 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  style={{
                    background:
                      "radial-gradient(circle, rgb(243 244 246) 0%, transparent 70%)",
                    zIndex: -1,
                  }}
                />
              )}

              {/* Caller info */}
              <div className="text-center mb-6 px-4">
                <h3 className="text-xl font-bold mb-1 text-white">
                  {business.name}
                </h3>
                <p className="text-gray-400">{business.phone}</p>
                <p className="mt-2 text-sm text-gray-400">
                  Connected • {selectedLanguage}
                </p>
              </div>

              {/* Call controls */}
              <div className="grid grid-cols-3 gap-6 px-4 mb-8">
                <div className="flex flex-col items-center">
                  <button
                    onClick={handleMuteToggle}
                    className={`${
                      isMuted ? "bg-white" : "bg-gray-700"
                    } text-white rounded-full p-3 w-12 h-12 flex items-center justify-center`}
                  >
                    {isMuted ? (
                      <MicOff className="h-5 w-5 text-black" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </button>
                  <span className="text-xs mt-1 text-gray-400">
                    {isMuted ? "unmute" : "mute"}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <button
                    onClick={handleEndCall}
                    className="bg-red-600 text-white rounded-full p-3 w-12 h-12 flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <span className="text-xs mt-1 text-gray-400">end</span>
                </div>

                <div className="flex flex-col items-center">
                  <button className="bg-gray-700 text-white rounded-full p-3 w-12 h-12 flex items-center justify-center">
                    <Speaker className="h-5 w-5" />
                  </button>
                  <span className="text-xs mt-1 text-gray-400">speaker</span>
                </div>
              </div>

              {/* Home indicator */}
              <div className="mb-2 mx-auto w-1/3 h-1 bg-gray-600 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Show dialog trigger on mobile */}
        <div className="md:hidden">
          <AccessDialog />
        </div>
      </div>
    </PageTransition>
  );
}
