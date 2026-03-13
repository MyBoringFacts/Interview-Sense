"use client";

import { motion } from "framer-motion";

interface AudioVisualizerProps {
  state: "disconnected" | "connecting" | "connected" | "speaking" | "listening";
}

export function AudioVisualizer({ state }: AudioVisualizerProps) {
  // Determine color and animation behavior based on the agent state
  let ringsColor = "border-primary/20";
  let centerColor = "bg-primary/20";
  let animatePulse = false;
  let animateWaves = false;

  switch (state) {
    case "disconnected":
      ringsColor = "border-muted/20";
      centerColor = "bg-muted";
      break;
    case "connecting":
      ringsColor = "border-yellow-500/20";
      centerColor = "bg-yellow-500/40";
      animatePulse = true;
      break;
    case "connected":
    case "listening":
      ringsColor = "border-blue-500/20";
      centerColor = "bg-blue-500";
      animatePulse = true;
      break;
    case "speaking":
      ringsColor = "border-accent/30";
      centerColor = "bg-accent";
      animateWaves = true;
      break;
  }

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer Rings */}
      {[1, 2, 3].map((ring) => (
        <motion.div
          key={ring}
          className={`absolute rounded-full border-2 ${ringsColor}`}
          initial={{ width: 80, height: 80, opacity: 0 }}
          animate={
            animateWaves
              ? {
                  width: [80, 100 + ring * 40, 80],
                  height: [80, 100 + ring * 40, 80],
                  opacity: [0.5, 0, 0.5],
                }
              : animatePulse
              ? {
                  width: 80 + ring * 20,
                  height: 80 + ring * 20,
                  opacity: 0.2,
                }
              : {
                  width: 80 + ring * 20,
                  height: 80 + ring * 20,
                  opacity: 0.1,
                }
          }
          transition={
            animateWaves
              ? {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: ring * 0.2,
                }
              : animatePulse
              ? {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0,
                }
              : {}
          }
        />
      ))}

      {/* Center Core */}
      <motion.div
        className={`relative z-10 w-20 h-20 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.3)] shadow-${centerColor.split('-')[1]} ${centerColor}`}
        animate={
          animateWaves
            ? { scale: [1, 1.2, 1] }
            : animatePulse
            ? { scale: [1, 1.05, 1] }
            : { scale: 1 }
        }
        transition={{
          duration: animateWaves ? 1 : 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
