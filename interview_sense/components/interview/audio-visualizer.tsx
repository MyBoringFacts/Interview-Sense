"use client";

import { motion } from "framer-motion";

interface AudioVisualizerProps {
  state: "disconnected" | "connecting" | "connected" | "listening" | "speaking";
}

export function AudioVisualizer({ state }: AudioVisualizerProps) {
  const isSpeaking = state === "speaking";
  const isListening = state === "connected" || state === "listening";
  const isConnecting = state === "connecting";

  const orbGradient = isSpeaking
    ? "radial-gradient(circle at 38% 32%, #e9d5ff, #7c3aed 55%, #4c1d95)"
    : isListening
    ? "radial-gradient(circle at 38% 32%, #bfdbfe, #2563eb 55%, #1e3a8a)"
    : isConnecting
    ? "radial-gradient(circle at 38% 32%, #fef3c7, #d97706 55%, #92400e)"
    : "radial-gradient(circle at 38% 32%, #cbd5e1, #475569 55%, #1e293b)";

  const orbGlow = isSpeaking
    ? "0 0 50px rgba(139,92,246,0.7), 0 0 100px rgba(139,92,246,0.25), 0 0 160px rgba(139,92,246,0.08)"
    : isListening
    ? "0 0 40px rgba(59,130,246,0.6), 0 0 80px rgba(59,130,246,0.2), 0 0 140px rgba(59,130,246,0.06)"
    : "0 0 20px rgba(0,0,0,0.5)";

  return (
    <div className="relative flex items-center justify-center w-80 h-80">

      {/* Ambient background bloom */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: isSpeaking
            ? "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)"
            : isListening
            ? "radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 65%)"
            : "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 65%)",
        }}
        animate={{ scale: isSpeaking ? [1, 1.4, 1] : isListening ? [1, 1.15, 1] : 1 }}
        transition={{ duration: isSpeaking ? 1.8 : 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Ripple rings — speaking */}
      {isSpeaking &&
        [1, 2, 3, 4].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full"
            style={{
              border: "1px solid rgba(167,139,250,0.35)",
              width: 88,
              height: 88,
            }}
            animate={{
              width: [88, 88 + ring * 62],
              height: [88, 88 + ring * 62],
              opacity: [0.7, 0],
              borderColor: [
                "rgba(167,139,250,0.5)",
                "rgba(167,139,250,0)",
              ],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeOut",
              delay: ring * 0.4,
            }}
          />
        ))}

      {/* Soft pulse rings — listening */}
      {isListening &&
        !isSpeaking &&
        [1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full"
            style={{
              border: "1px solid rgba(147,197,253,0.2)",
            }}
            animate={{
              width: [88 + ring * 28, 88 + ring * 38, 88 + ring * 28],
              height: [88 + ring * 28, 88 + ring * 38, 88 + ring * 28],
              opacity: [0.5, 0.15, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: ring * 0.5,
            }}
          />
        ))}

      {/* Center orb */}
      <motion.div
        className="relative z-10 w-22 h-22 rounded-full"
        style={{
          width: 88,
          height: 88,
          background: orbGradient,
          boxShadow: orbGlow,
        }}
        animate={
          isSpeaking
            ? { scale: [1, 1.18, 0.94, 1.12, 1] }
            : isListening
            ? { scale: [1, 1.07, 1] }
            : isConnecting
            ? { scale: [1, 1.1, 1] }
            : { scale: 1 }
        }
        transition={{
          duration: isSpeaking ? 1.3 : isConnecting ? 1.2 : 2.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Specular highlight */}
        <div className="absolute top-3 left-4 w-6 h-3.5 rounded-full bg-white/35 blur-[3px]" />
        <div className="absolute top-4 left-5 w-3 h-2 rounded-full bg-white/20 blur-[1px]" />
      </motion.div>
    </div>
  );
}
