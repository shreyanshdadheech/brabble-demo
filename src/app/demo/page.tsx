"use client";

import { AnimatedMoon } from "@/components/AnimatedMoon";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Clock,
  Navigation,
  Phone,
  Search,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SearchPage() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [moonVariant, setMoonVariant] = useState<"crescent" | "full" | "sun">(
    "crescent"
  );

  // Determine initial moon state based on time
  useEffect(() => {
    const hour = currentTime.getHours();

    // Simulate loading state
    setTimeout(() => {
      if (hour >= 6 && hour < 12) {
        setMoonVariant("crescent"); // Morning
      } else if (hour >= 12 && hour < 18) {
        setMoonVariant("sun"); // Afternoon
      } else {
        setMoonVariant("full"); // Evening/Night
      }
      setIsLoading(false);
    }, 2000);
  }, []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const businesses = [
    {
      id: 1,
      name: "City Central Hospital",
      phone: "+91 98765 XXXXX",
      rating: 4.7,
      reviews: 253,
      distance: "1.2 km",
      status: "Open",
      address: "123 Main St, Mumbai",
      map: {
        english: "3",
        hindi: "1",
      },
    },
    {
      id: 2,
      name: "IFSC Bank",
      phone: "+91 98765 XXXXX",
      rating: 4.3,
      reviews: 512,
      distance: "2.5 km",
      status: "Open • Closes 10 PM",
      address: "456 Health Ave, Mumbai",
      map: {
        english: "4",
        hindi: "5",
      },
    },
  ];

  const handleMoonClick = (id: number) => {
    setMoonVariant("sun");
    setTimeout(() => {
      handleCall(id);
    }, 1000);
  };

  const handleCall = (id: number) => {
    router.push(`/demo/call/${id}`);
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col md:flex-row items-center justify-center p-4 bg-purple-50">
        {/* Left side - iPhone with Google Maps */}
        {/* iPhone notch */}

        {/* Phone UI */}

        <div className="w-full md:w-1/2 h-screen md:h-auto flex items-center justify-center">
          {/* iPhone 16 Pro frame */}
          <div className="relative w-full h-full md:w-[320px] md:h-[650px] bg-gradient-to-b from-gray-800 to-black md:rounded-[55px] md:shadow-xl md:border-[14px] border-black overflow-hidden">
            {/* iPhone notch */}
            <div className="hidden md:block absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-7 bg-black rounded-b-xl z-10"></div>

            {/* Google Maps interface */}
            <div className="flex flex-col h-full md:rounded-[40px]  bg-white">
              {/* Status bar */}
              <div className="pt-7 pb-2 px-5 flex justify-between items-center text-xs text-black ">
                <span className="font-semibold">
                  {currentTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
                <div className="flex space-x-1">
                  <div className="w-4 h-2.5 bg-black rounded-sm"></div>
                  <div className="w-2.5 h-2.5 bg-black rounded-full"></div>
                  <div className="w-2.5 h-2.5 bg-black rounded-full"></div>
                </div>
              </div>
              {/* Google Maps search header */}
              <div className="bg-white p-3 shadow-sm z-10 ">
                <div className="flex items-center">
                  <div className="flex items-center mr-2">
                    <ChevronDown className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      {/* Google "G" logo */}
                      <div className="w-5 h-5 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center border border-gray-200">
                          <span className="text-[10px] font-bold text-blue-500">
                            G
                          </span>
                        </div>
                      </div>
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full text-gray-900 shadow-sm leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Search Google Maps"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center ">
                      <div className="h-5 w-5 text-gray-400">
                        <Search className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map background */}
              <div className="relative flex-1">
                <div className="absolute inset-0">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d98052.22306166755!2d72.85430521323832!3d19.089836148599304!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sin!4v1742221006130!5m2!1sen!2sin"
                    className="w-full h-full"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  {/* Google Maps overlay elements */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#4CAF50]/20 to-transparent pointer-events-none"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#4CAF50]/20 flex items-center justify-center pointer-events-none">
                    <div className="w-4 h-4 rounded-full bg-[#4CAF50]"></div>
                  </div>
                </div>
              </div>

              {/* Business listings */}
              <div className="bg-white rounded-t-xl shadow-lg -mt-4 relative z-10 max-h-[300px] overflow-y-auto">
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto my-2"></div>

                {businesses.map((business) => (
                  <div
                    key={business.id}
                    className="p-3 border-b border-gray-200 hover:bg-gray-50"
                  >
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{business.name}</h3>
                        <div className="flex items-center mt-1 text-xs">
                          <div className="flex items-center text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            <span className="ml-1 text-gray-900">
                              {business.rating}
                            </span>
                          </div>
                          <span className="mx-1 text-gray-400">•</span>
                          <span className="text-gray-600">
                            {business.reviews} reviews
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {business.address}
                        </div>
                        <div className="flex items-center mt-1 text-xs">
                          <Navigation className="h-2.5 w-2.5 text-gray-500 mr-1" />
                          <span className="text-gray-600">
                            {business.distance}
                          </span>
                          <span className="mx-1 text-gray-400">•</span>
                          <Clock className="h-2.5 w-2.5 text-gray-500 mr-1" />
                          <span
                            className={`${
                              business.status.includes("Closed")
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {business.status}
                          </span>
                        </div>
                      </div>
                      <button
                        // @ts-ignore
                        onClick={() => handleMoonClick(business.id)}
                        className="ml-2 p-2 text-blue-600 hover:bg-blue-50 rounded-full self-start"
                        aria-label={`Call ${business.name}`}
                      >
                        <Phone className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1/3 h-1 bg-gray-800 rounded-full"></div>
          </div>
        </div>

        {/* Right side - Enhanced Moon/Sun visualization */}
        <div className="w-full md:w-1/2 flex items-center justify-center">
          <motion.div
            className="relative"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <AnimatedMoon
              variant={moonVariant}
              className="w-64 h-64 cursor-pointer"
              // onClick={()=>handleMoonClick(busine)}
              isLoading={isLoading}
            />
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mix-blend-overlay rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: moonVariant === "sun" ? 0.3 : 0 }}
              transition={{ duration: 0.5 }}
            />
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
