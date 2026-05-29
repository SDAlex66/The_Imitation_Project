import { motion } from "framer-motion";

export default function DownForMaintenance({ onRetry }) {
  return (
    <motion.div
      key="maintenance"
      className="lobby-popup"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="lobby-title" style={{ color: "#ff6a33" }}>
         Server Unreachable
      </h2>
      <p className="lobby-text" style={{ marginTop: "1rem" }}>
        The server appears to be down for maintenance.
      </p>
      <p className="lobby-text" style={{ fontSize: "0.85rem", opacity: 0.5, marginTop: "0.3rem" }}>
        Check back in a few minutes d-.-b
      </p>
      <button className="lobby-button" onClick={onRetry} style={{ marginTop: "1.5rem" }}>
        Retry Connection
      </button>
    </motion.div>
  );
}
