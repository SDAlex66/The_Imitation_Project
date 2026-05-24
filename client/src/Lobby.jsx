import React from "react";
import { motion } from "framer-motion";

function Lobby({ onStart }) {
  return (
    <motion.div 
      className="lobby-popup"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7, transition: { duration: 1 } }} 
      transition={{ duration: 2 }} 
    >
      <h2 className="lobby-title">Welcome</h2>
      <p className="lobby-text">
        You are about to enter an anonymous chatroom. You will be paired with either a real human participant or an artificial intelligence. 
        By proceeding, you consent to your chat logs being recorded purely for academic telemetry and research.
      </p>
      <button className="lobby-button" onClick={onStart}>
        Acknowledge & Start
      </button>
    </motion.div>
  );
}

export default Lobby;