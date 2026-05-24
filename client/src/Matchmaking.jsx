import React, { useEffect } from "react";
import { motion } from "framer-motion";

function Matchmaking({ onComplete, socket }) {
  useEffect(() => {
    
    socket.emit("join_queue");
    socket.on("match_found", () => {
      onComplete();
    });

    return () => socket.off("match_found");
  }, [socket, onComplete]);

  return (
    <motion.div
      className="lobby-popup"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7, transition: { duration: 1 } }} // The slow fade out
      transition={{ duration: 1.5 }} // The slow fade in
    >
      <h2 className="lobby-title">Searching for Opponent...</h2>
      <p className="lobby-text">
        Establishing secure connection with the routing network...
      </p>
    </motion.div>
  );
}

export default Matchmaking;