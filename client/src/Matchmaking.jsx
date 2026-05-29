import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

function Matchmaking({ onComplete, socket }) {
  const onCompleteRef = useRef(onComplete);
  const hasQueued = useRef(false);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!hasQueued.current) {
      hasQueued.current = true;
      socket.emit("join_queue");
    }

    socket.on("match_found", () => {
      onCompleteRef.current();
    });

    return () => socket.off("match_found");
  }, [socket]);

  return (
    <motion.div
      className="lobby-popup"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="lobby-title">Searching for Opponent...</h2>
      <p className="lobby-text">
        Establishing secure connection with the routing network...
      </p>
    </motion.div>
  );
}

export default Matchmaking;