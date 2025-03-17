"use client"

import { motion } from "framer-motion"

interface AnimatedMoonProps {
  variant: "crescent" | "full" | "sun"
  className?: string
  onClick?: () => void
}

export function AnimatedMoon({ variant, className = "", onClick }: AnimatedMoonProps) {
  const moonVariants = {
    crescent: {
      background: "rgb(243 244 246)",
      x: "32px",
      scale: 1,
      boxShadow: "none"
    },
    full: {
      background: "rgb(243 244 246)",
      x: "0px",
      scale: 1,
      boxShadow: "0 0 60px 30px rgba(243, 244, 246, 0.3)"
    },
    sun: {
      background: "rgb(250, 204, 21)",
      x: "0px",
      scale: 1.2,
      boxShadow: "0 0 60px 30px rgba(250, 204, 21, 0.4), 0 0 100px 60px rgba(250, 204, 21, 0.3)"
    }
  }

  const rays = variant === "sun" && (
    <motion.div
      className="absolute inset-0"
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    >
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-16 bg-yellow-400 left-1/2 top-1/2 -translate-x-1/2 origin-bottom"
          style={{ rotate: `${i * 45}deg` }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ delay: i * 0.1 }}
        />
      ))}
    </motion.div>
  )

  return (
    <motion.div 
      className={`relative ${className}`}
      onClick={onClick}
    >
      {rays}
      <div className="absolute inset-0 bg-gray-800 rounded-full"></div>
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={variant}
        animate={variant}
        variants={moonVariants}
        transition={{ duration: 1, ease: "easeInOut" }}
      ></motion.div>
    </motion.div>
  )
}
