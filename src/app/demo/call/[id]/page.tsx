"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, Mic, Speaker, ChevronDown } from "lucide-react"
import { PageTransition } from "@/components/PageTransition"
import { AnimatedMoon } from "@/components/AnimatedMoon"
import { motion } from "framer-motion"

export default function CallPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [selectedLanguage, setSelectedLanguage] = useState("English")
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showDropdown, setShowDropdown] = useState(false)

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const businesses = [
    {
      id: "1",
      name: "ABC Travel",
      phone: "+91 98765 43210",
    },
    {
      id: "2",
      name: "Alolo Hospital",
      phone: "+91 98765 12345",
    },
    {
      id: "3",
      name: "XYZ Logistics",
      phone: "+91 98765 67890",
    },
  ]

  const business = businesses.find((b) => b.id === params.id) || businesses[0]
  const languages = ["Hindi", "English", "Marathi", "Kannada"]

  const handleEndCall = () => {
    router.push("/demo")
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col md:flex-row items-center justify-center p-4 bg-gray-100">
        {/* Left side - Language selection */}
        <div className="w-full md:w-1/2 flex flex-col items-center mb-8 md:mb-0">
          <div className="max-w-xs w-full">
            <h2 className="text-xl font-bold mb-8 text-center">Select Language</h2>
            <div className="flex flex-col space-y-4">
              {languages.map((language) => (
                <button
                  key={language}
                  onClick={() => setSelectedLanguage(language)}
                  className={`py-4 px-4 rounded-lg text-center font-medium transition-colors ${
                    selectedLanguage === language
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - iPhone call interface with full moon */}
        <div className="w-full md:w-1/2 flex justify-center">
          {/* iPhone 16 Pro frame */}
          <div className="relative w-[320px] h-[650px] bg-black rounded-[55px] p-[12px] shadow-xl border-[14px] border-black overflow-hidden">
            {/* iPhone notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-7 bg-black rounded-b-xl z-10"></div>

            {/* Phone UI */}
            <div className="bg-gradient-to-b from-gray-800 to-black h-full rounded-[40px] flex flex-col">
              {/* Status bar */}
              <div className="pt-7 pb-2 px-5 flex justify-between items-center text-xs text-white">
                <span className="font-semibold">
                  {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
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

                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 rounded-lg shadow-lg z-20 mx-4">
                    {languages.map((language) => (
                      <button
                        key={language}
                        onClick={() => {
                          setSelectedLanguage(language)
                          setShowDropdown(false)
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
                    background: "radial-gradient(circle, rgb(250, 204, 21) 0%, transparent 70%)",
                    width: "200px",
                    height: "200px",
                    borderRadius: "50%",
                  }}
                />
              </div>

              {/* Full screen ripple effect */}
              <motion.div
                className="fixed inset-0 pointer-events-none"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 100, opacity: 0.1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{
                  background: "radial-gradient(circle, rgb(243 244 246) 0%, transparent 70%)",
                  zIndex: -1,
                }}
              />

              {/* Caller info */}
              <div className="text-center mb-6 px-4">
                <h3 className="text-xl font-bold mb-1 text-white">{business.name}</h3>
                <p className="text-gray-400">{business.phone}</p>
                <p className="mt-2 text-sm text-gray-400">Connected • {selectedLanguage}</p>
              </div>

              {/* Call controls */}
              <div className="grid grid-cols-3 gap-6 px-4 mb-8">
                <div className="flex flex-col items-center">
                  <button className="bg-gray-700 text-white rounded-full p-3 w-12 h-12 flex items-center justify-center">
                    <Mic className="h-5 w-5" />
                  </button>
                  <span className="text-xs mt-1 text-gray-400">mute</span>
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
      </div>
    </PageTransition>
  )
}

