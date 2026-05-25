import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import Header from "./Header";
import Footer from "./Footer";
import Text from "./Text";
import ChatBox from "./ChatBox";
import Lobby from "./Lobby";
import Home from "./Home";
import Matchmaking from "./Matchmaking";
import Evaluation from "./Evaluation";
import Dashboard from "./Dashboard";
import videoBG from "./assets/background-video.mp4";

// Persistent id even when browser sleeps
let persistentUserId = localStorage.getItem("imitation_user_id");
if (!persistentUserId) {
  persistentUserId = Math.random().toString(36).substring(2, 15);
  localStorage.setItem("imitation_user_id", persistentUserId);
}
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const socket = io(API_BASE_URL, {
  auth: { userId: persistentUserId }
});

function App() {
  const [gameState, setGameState] = useState("lobby");
  const [finalResult, setFinalResult] = useState(null);
  const [recoveredSession, setRecoveredSession] = useState(null);

  // Listener for evaluation results
  useEffect(() => {
    socket.on("evaluation_result", (data) => {
      setFinalResult(data);
      setGameState("result");
    });
    return () => socket.off("evaluation_result");
  }, [socket]);

  // Listener for state recovery (with guard clause to prevent screen hijacking)
  useEffect(() => {
    socket.on("recover_session", (data) => {
      setGameState((currentState) => {
        // Only recover if we are at the start of the app, ignore if game is finished
        if (currentState === "result" || currentState === "evaluation") {
          console.log("Ignoring session recovery; game is finished.");
          return currentState;
        }
        console.log("Recovering session, syncing chat...");
        setRecoveredSession(data);
        return "chat";
      });
    });
    return () => socket.off("recover_session");
  }, [socket]);

  return (
    <motion.div 
      className="app-wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2 }}
    >
      <div className="background-video-container">
        <video src={videoBG} autoPlay loop muted />
      </div>
    
      <div className="page-content">
        <div className="header-container">
          <Header />
          <Text text="Is it human or machine?" />
        </div>

        <div className="card-container">
          <AnimatePresence mode="wait">
            {gameState === "lobby" && (
              <Lobby 
                key="lobby" 
                onStart={() => setGameState("home")} 
              />
            )}

            {gameState === "home" && (
              <Home 
                key="home" 
                onFindMatch={() => setGameState("matchmaking")}
                onViewData={() => setGameState("dashboard")} 
              />
            )}
            
            {gameState === "matchmaking" && (
              <Matchmaking 
                key="matchmaking" 
                socket={socket}
                onComplete={() => setGameState("chat")} 
              />
            )}

            {gameState === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 1.5 }}
              >
                <ChatBox 
                  key="chatbox"
                  socket={socket}
                  onEndRound={() => {
                    setGameState("evaluation");
                    setRecoveredSession(null); 
                  }}
                  recoveredSession={recoveredSession}
                />
              </motion.div>
            )}

            {gameState === "evaluation" && (
              <Evaluation 
                key="evaluation"
                socket={socket}
                onComplete={() => setGameState("home")}
              />
            )}

            {gameState === "result" && finalResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 1.5 }}
                className="lobby-popup"
              >
                <h2 className="lobby-title">
                  {finalResult.correct ? "Correct!" : "Incorrect."}
                </h2>
                <p className="lobby-text">
                  The stranger was {finalResult.actualIdentity}.
                </p>
                
                {finalResult.actualIdentity === "AI" && (
                  <p className="lobby-text" style={{ fontSize: "1.1rem", opacity: 0.7 }}>
                    Model: {finalResult.modelName || "Unknown AI"}
                  </p>
                )}

                <button 
                  className="lobby-button" 
                  onClick={() => setGameState("home")}
                >
                  Home
                </button>
              </motion.div>
              )}

            {gameState === "dashboard" && (
              <Dashboard 
                key="dashboard" 
                onBack={() => setGameState("home")} 
              />
            )}
        
          </AnimatePresence>
        </div>
        
        <Footer />
      </div>
      <Analytics />
    </motion.div>
  );
}

export default App;