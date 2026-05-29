import { motion } from "framer-motion";

function Welcome({ onStart }) {
  return (
    <motion.div 
      className="lobby-popup"
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0, rotate: 20, skewY: 4 }}
      transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94], exit: { duration: 0.25, ease: [0.55, 0, 1, 0.45] } }}
    >
      <h2 className="lobby-title">Welcome</h2>
      <p className="lobby-text">
        You are about to enter an anonymous chatroom. You will be paired with either a real human participant or an artificial intelligence. 
        By proceeding, you consent to your chat logs being recorded purely for academic telemetry and research.
      </p>
      <p className="lobby-text" style={{ fontSize: "1rem", fontWeight: "bold", color: "#ffd700", marginTop: "1rem", textAlign: "center" }}>
        Update 1.0: <br />
        — Human matchmaking has been improved, more likely to be paired with a real person. <br/> 
        — Grok 4.20 has been added 💀
      </p>
      <button className="lobby-button" onClick={onStart}>
        Acknowledge & Start
      </button>
    </motion.div>
  );
}

export default Welcome;