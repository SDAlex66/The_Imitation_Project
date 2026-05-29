import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const getPotency = (ms) => {
  if (ms <= 20000) return Math.sqrt(ms / 5000);
  return 2 + (ms - 20000) / 10000;
};
const getColor = (pot) => {
  if (pot < 1) { const t = pot; return `hsl(${15 - t * 15}, ${t * 100}%, ${88 - t * 38}%)`; }
  if (pot < 2) { const t = pot - 1; return `hsl(${350 - t * 70}, 100%, ${50 - t * 12}%)`; }
  if (pot < 3) { const t = pot - 2; return `hsl(${280 - t * 40}, 100%, ${38 - t * 5}%)`; }
  if (pot < 4.9) { const t = (pot - 3) / 1.9; return `hsl(${240 - t * 40}, 100%, ${33 - t * 5}%)`; }
  const hue = ((pot - 4.9) * 60) % 360;
  return `hsl(${hue}, 100%, 50%)`;
};

function SecretDimension({ holdStart, released, onExit }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (released) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - holdStart);
    }, 100);
    return () => clearInterval(interval);
  }, [holdStart, released]);

  useEffect(() => {
    return () => {
      document.getElementById("shake-css")?.remove();
    };
  }, []);

  const pot = getPotency(elapsed);
  const col = getColor(pot);
  const multiplier = (1 + pot * 0.5).toFixed(2);
  const hue = parseInt(col.match(/hsl\((\d+)/)?.[1] || "280");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.3, filter: "blur(10px)" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", fontFamily: "'Goudy Old Style', serif",
        position: "relative", overflow: "hidden",
        borderRadius: "12px",
        background: `radial-gradient(ellipse at center, #0a00102c 0%, #0000001f 100%)`,
        border: `1px solid ${col}40`,
        boxShadow: `0 0 40px ${col}20`,
        transition: "border-color 0.3s, box-shadow 0.3s",
        padding: "3rem 2rem", minHeight: "300px", width: "100%",
        maxWidth: "500px", margin: "0 auto"
      }}
    >
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse at center, hsla(${hue}, 80%, 40%, 0.04) 0%, transparent 60%)`,
        transition: "background 0.5s"
      }} />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.08,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 0, 255, 0.18) 2px, rgba(255, 0, 255, 0.07) 4px)"
      }} />

      <motion.span
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 0.15, repeat: Infinity }}
        style={{ fontSize: "0.8rem", color: col, letterSpacing: "0.3rem", marginBottom: "1rem", opacity: 0.7 }}
      >
        Y O U  S H O U L D  N O T  B E  H E R E
      </motion.span>

      <motion.span
        animate={{
          scale: [1, 1.06 + pot * 0.016, 0.92 - pot * 0.008, 1.04 + pot * 0.012, 0.94 - pot * 0.008, 1],
          rotate: [0, 1.5 + pot * 0.2, -(1.5 + pot * 0.2), 1 + pot * 0.12, -(1 + pot * 0.12), 0],
          x: [0, 2.5 + pot * 0.12, -(2.5 + pot * 0.12), 0]
        }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ fontSize: "0.9rem", color: col, letterSpacing: "0.3rem", marginBottom: "1.5rem", transition: "color 0.3s" }}
      >
        k e e p  g o i n g
      </motion.span>

      <motion.div
        animate={{
          scale: [1, 1.06 + pot * 0.012, 0.94 - pot * 0.006, 1.04 + pot * 0.01, 0.96 - pot * 0.006, 1],
          rotate: [0, 1 + pot * 0.15, -(1 + pot * 0.15), 0.6 + pot * 0.1, -(0.6 + pot * 0.1), 0],
          x: [0, 2 + pot * 0.1, -(2 + pot * 0.1), 0]
        }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          fontSize: "4.5rem", color: col,
          filter: `brightness(1.5) drop-shadow(0 0 30px ${col})`,
          marginBottom: "0.5rem", letterSpacing: "0.1rem"
        }}
      >
        {(elapsed / 1000).toFixed(1)}s
      </motion.div>

      <motion.div
        animate={{
          scale: [1, 1.08 + pot * 0.015, 0.92 - pot * 0.008, 1.05 + pot * 0.012, 0.95 - pot * 0.008, 1],
          rotate: [0, -(1.5 + pot * 0.2), 1.5 + pot * 0.2, -(0.8 + pot * 0.12), 0.8 + pot * 0.12, 0],
          x: [0, -(3 + pot * 0.15), 3 + pot * 0.15, 0]
        }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          fontSize: "3.5rem", color: col,
          filter: "brightness(1.3)", marginBottom: "2rem", letterSpacing: "0.05rem"
        }}
      >
        x{multiplier}
      </motion.div>

      {released && (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 60, damping: 8 }}
            style={{
              fontSize: "1rem", color: col,
              border: `1px solid ${col}50`, borderRadius: "4px",
              padding: "0.5rem 1.5rem",
              background: `${col}15`
            }}
          >
          
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={onExit}
            style={{
              marginTop: "3rem", padding: "0.6rem 2rem",
              background: "transparent", border: `1px solid ${col}60`,
              color: col, cursor: "pointer",
              fontFamily: "'Goudy Old Style', serif", fontSize: "0.9rem",
              letterSpacing: "0.1rem", transition: "color 0.3s, border-color 0.3s"
            }}
            onMouseEnter={(e) => e.target.style.color = col}
            onMouseLeave={(e) => e.target.style.color = col}
          >
            Return
          </motion.button>
        </>
      )}
    </motion.div>
  );
}

export default SecretDimension;
