"use client";

import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Gradient background bubbles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-[10%] top-[20%] w-[500px] h-[500px] rounded-full bg-[#FF375F] opacity-20 blur-[100px]" />
          <div className="absolute -right-[10%] top-[40%] w-[500px] h-[500px] rounded-full bg-[#5E5CE6] opacity-20 blur-[100px]" />
          <div className="absolute left-[40%] top-[10%] w-[400px] h-[400px] rounded-full bg-[#FF9F0A] opacity-10 blur-[100px]" />
          <div className="absolute right-[25%] bottom-[10%] w-[600px] h-[600px] rounded-full bg-[#32D74B] opacity-10 blur-[100px]" />
          <div className="absolute left-[20%] bottom-[20%] w-[450px] h-[450px] rounded-full bg-[#BF5AF2] opacity-10 blur-[100px]" />
        </div>

        <div className="max-w-2xl w-full relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-8 bg-white/[0.05] p-12 rounded-3xl backdrop-blur-xl border border-white/[0.05] shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-6xl font-bold tracking-tight bg-gradient-to-r from-[#FF375F] via-[#FF9F0A] to-[#5E5CE6] bg-clip-text text-transparent font-[var(--font-space-grotesk)]"
            >
              brabble.ai
            </motion.div>

            <motion.h1
              className="text-4xl font-medium text-white/90 font-[var(--font-space-grotesk)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Taking a Moment to Rebuild
            </motion.h1>

            <motion.p
              className="text-xl text-white/60 font-light max-w-lg mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              We're crafting something extraordinary behind the scenes. Our team
              is dedicated to bringing you an even more amazing experience.
            </motion.p>

            <motion.div
              className="pt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-white/[0.05] border border-white/[0.05]">
                <span className="w-2 h-2 bg-[#30D158] rounded-full animate-pulse" />
                <span className="text-white/60 font-medium">
                  Updates Coming Soon
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
