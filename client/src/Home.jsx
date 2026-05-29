import { motion } from "framer-motion";

function Home({ onFindMatch }) {
  return (
    <motion.div
      className="lobby-popup"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.65, exit: { duration: 0.4 } }}
    >
      <h2 className="lobby-title">Ready to Play?</h2>
      <p className="lobby-text">
        Enter the queue to test your intuition against a stranger.
      </p>
      
      <button className="lobby-button" onClick={onFindMatch}>
        Find Match
      </button>
    </motion.div>
  );
}

export default Home;