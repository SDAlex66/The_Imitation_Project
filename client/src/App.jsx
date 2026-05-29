import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Header from "./Header";
import Footer from "./Footer";

import ChatBox from "./ChatBox";
import Welcome from "./Welcome";
import Home from "./Home";
import Matchmaking from "./Matchmaking";
import Evaluation from "./Evaluation";
import Dashboard from "./Dashboard";
import MobileDatabase from "./MobileDatabase";
import NavBar from "./NavBar";
import PatchNotes from "./PatchNotes";
import Settings from "./Settings";
import SecretDimension from "./SecretDimension";
import DownForMaintenance from "./DownForMaintenance";
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
  const [gameState, setGameState] = useState("welcome");
  const [finalResult, setFinalResult] = useState(null);
  const [recoveredSession, setRecoveredSession] = useState(null);
  const [secretData, setSecretData] = useState(null);
  const [serverDown, setServerDown] = useState(false);
  const [easterEggData, setEasterEggData] = useState(null);
  const [secretReleased, setSecretReleased] = useState(false);
  const downTimerRef = useRef(null);

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

  useEffect(() => {
    socket.on("session_expired", () => {
      setGameState("welcome");
      setRecoveredSession(null);
      setFinalResult(null);
    });
    return () => socket.off("session_expired");
  }, [socket]);

  // Connection health: grace timer before showing "down for maintenance"
  useEffect(() => {
    const onConnect = () => {
      if (downTimerRef.current) {
        clearTimeout(downTimerRef.current);
        downTimerRef.current = null;
      }
      setServerDown(false);
    };
    const onError = () => {
      if (!downTimerRef.current) {
        downTimerRef.current = setTimeout(() => setServerDown(true), 10000);
      }
    };
    socket.on("connect", onConnect);
    socket.on("connect_error", onError);
    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
      if (downTimerRef.current) clearTimeout(downTimerRef.current);
    };
  }, [socket]);

  // Lock body scroll on PC when dashboard is open
  useEffect(() => {
    const isMobile = "ontouchstart" in window || window.innerWidth < 768;
    if (gameState === "dashboard" && !isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [gameState]);

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
        </div>
        {["home", "dashboard", "database", "patchnotes", "settings", "secret"].includes(gameState) && (
          <NavBar current={gameState} onNavigate={setGameState} onSecret={(d) => { setSecretData(d); setSecretReleased(false); setGameState("secret"); }} onEasterEggUpdate={setEasterEggData} onSecretRelease={() => setSecretReleased(true)} />
        )}

        <div className="card-container" style={["matchmaking","chat","evaluation","result"].includes(gameState) ? {} : { padding: "0.5rem 0", overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            {gameState === "welcome" && serverDown && (
              <DownForMaintenance 
                key="maintenance" 
                onRetry={() => { setServerDown(false); socket.connect(); }} 
              />
            )}

            {gameState === "welcome" && !serverDown && (
              <Welcome 
                key="welcome" 
                onStart={() => setGameState("home")} 
              />
            )}

            {gameState === "home" && (
              <Home 
                key="home" 
                onFindMatch={() => setGameState("matchmaking")}
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="lobby-popup"
              >
                <h2 className="lobby-title">
                  {finalResult.correct ? "Correct!" : "Incorrect."}
                </h2>
                <p className="lobby-text">
                  The stranger was {finalResult.actualIdentity}.
                </p>

                {finalResult.wasSwapped && (
                  <p className="lobby-text" style={{ fontSize: "0.9rem", opacity: 0.6, marginTop: "0.3rem" }}>
                    Your original partner left and was replaced by AI.
                  </p>
                )}

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
              <Dashboard key="dashboard" />
            )}

            {gameState === "database" && (
              <MobileDatabase key="database" />
            )}

            {gameState === "patchnotes" && (
              <PatchNotes key="patchnotes" />
            )}

            {gameState === "settings" && (
              <Settings key="settings" easterEgg={easterEggData} />
            )}

            {gameState === "secret" && secretData && (
              <SecretDimension key="secret" holdStart={secretData.holdStart} released={secretReleased} onExit={() => { setGameState("home"); setSecretReleased(false); }} />
            )}
         
          </AnimatePresence>
        </div>
        
        <Footer />
      </div>
      <Analytics />
      <SpeedInsights />
    </motion.div>
  );
}

export default App;