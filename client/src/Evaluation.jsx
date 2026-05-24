import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function Evaluation({ socket, onComplete }) {
  const [guess, setGuess] = useState(null);
  const [confidence, setConfidence] = useState(50);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!guess) return;

    socket.emit("submit_guess", {
      guess,
      confidence,
      comment
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        className="lobby-popup"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h2 className="lobby-title">Thank You ❤</h2>
        <p className="lobby-text">Your result has successfully been recorded.</p>
      </motion.div>
    );
  }

  
  return (
    <AnimatePresence mode="wait">
      {submitted ? (
        <motion.div
          key="thank-you"
          className="lobby-popup evaluation-window-compact"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h2 className="lobby-title">Thank You ❤</h2>
          <p className="lobby-text">Your result has successfully been recorded.</p>
        </motion.div>
      ) : (
        <motion.div
          key="guess-form"
          className="lobby-popup evaluation-window-compact"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 1 }}
        >
          <h2 className="lobby-title">Make Your Guess</h2>

          <div className="evaluation-options">
            <button
              className={`evaluation-option-btn ${guess === "Human" ? "active" : ""}`}
              onClick={() => setGuess("Human")}
            >
              Human
            </button>
            <button
              className={`evaluation-option-btn ${guess === "AI" ? "active" : ""}`}
              onClick={() => setGuess("AI")}
            >
              AI
            </button>
          </div>

          <div style={{ width: "100%", marginBottom: "2.5rem", textAlign: "left" }}>
            <label className="lobby-text" style={{ fontSize: "1.2rem" }}>
              Confidence: {confidence}%
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              className="evaluation-slider"
              style={{
                background: `linear-gradient(to right, #ffffff ${confidence}%, rgba(255, 255, 255, 0.1) ${confidence}%)`
              }}
            />
          </div>

          <div style={{ width: "100%", marginBottom: "2.5rem" }}>
            <textarea
              placeholder="Leave a comment... (Optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="evaluation-textarea"
            />
          </div>

          <button
            className={`evaluation-submit-btn ${guess ? "ready" : ""}`}
            onClick={handleSubmit}
            disabled={!guess}
          >
            Submit
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Evaluation;