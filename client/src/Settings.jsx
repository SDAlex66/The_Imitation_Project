import { useState, useEffect } from "react";
import { motion } from "framer-motion";

function Settings({ easterEgg }) {
  const [elapsed, setElapsed] = useState(0);
  const active = easterEgg && easterEgg.holdStart > 0;

  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    const interval = setInterval(() => {
      setElapsed(Date.now() - easterEgg.holdStart);
    }, 100);
    return () => clearInterval(interval);
  }, [active, easterEgg?.holdStart]);

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

  const pot = active ? getPotency(elapsed) : 0;
  const multiplier = (1 + pot * 0.5).toFixed(2);
  const col = getColor(pot);

  return (
    <motion.div
      className="lobby-popup"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="lobby-title" style={{ fontSize: "2rem", marginBottom: "1.5rem", transition: "color 0.3s" }}>
        {active && elapsed > 30000 ? (
          <motion.span
            animate={{
              scale: [1, 1.08 + pot * 0.015, 0.9 - pot * 0.008, 1.05 + pot * 0.01, 0.94 - pot * 0.008, 1],
              rotate: [0, 1.5 + pot * 0.2, -(1.5 + pot * 0.2), 1 + pot * 0.1, -(1 + pot * 0.1), 0],
              x: [0, 3 + pot * 0.15, -(3 + pot * 0.15), 0]
            }}
            transition={{ duration: Math.max(0.3, 0.5 - pot * 0.02), repeat: Infinity, ease: "easeInOut" }}
            style={{ color: col, letterSpacing: "0.3rem", fontSize: "1.5rem" }}
          >
            k e e p  g o i n g
          </motion.span>
        ) : "Settings"}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <div style={{
          width: "100%", padding: "1.5rem", borderRadius: "8px", textAlign: "center",
          border: active ? `1px solid ${col}` : "1px dashed #444",
          transition: "border-color 0.3s"
        }}>
          {active ? (
              <motion.div
                animate={{
                  scale: [1, 1.05, 0.95, 1],
                  rotate: [0, -2, 2, 0]
                }}
                transition={{ duration: 0.3 + pot * 0.1, repeat: Infinity, ease: "easeInOut" }}
              >
                <p style={{ color: col, fontSize: `${1 + pot * 0.15}rem`, margin: "0 0 0.3rem 0", transition: "color 0.3s, font-size 0.3s" }}>
                  {(elapsed / 1000).toFixed(1)}s
                </p>
                <p style={{ color: col, fontSize: `${0.7 + pot * 0.1}rem`, margin: 0, opacity: 0.7, transition: "color 0.3s" }}>
                  x{multiplier}
                </p>
              </motion.div>
          ) : (
            <p style={{ color: "#666", fontSize: "1rem", margin: 0 }}>
              Coming soon
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default Settings;
