import React from "react";
import { motion } from "framer-motion";

function Home({ onFindMatch, onViewData }) {
  return (
    <motion.div
      className="lobby-popup"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8 }}
    >
      <h2 className="lobby-title">Make Your Choice...</h2>
      <p className="lobby-text">
        Select your destination. You can enter the matchmaking queue to test your intuition, or view live telemetry data from the database.
      </p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <button className="lobby-button" onClick={onFindMatch}>
          Find Match
        </button>
        <button className="lobby-button" onClick={onViewData}>
          Data Dashboard
        </button>
      </div>
    </motion.div>
  );
}

export default Home;