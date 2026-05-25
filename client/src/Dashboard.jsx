import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

function Dashboard({ onBack }) {
  const [stats, setStats] = useState(null);
  const [featured, setFeatured] = useState(null);

  useEffect(() => {
    const fetchAllData = () => {
      fetch(`${API_BASE_URL}/api/stats`)
        .then((res) => res.json())
        .then((data) => {
          const formattedData = {
            ...data,
            modelPerformance: data.modelPerformance?.map(m => ({
              ...m,
              shortName: m.model.split("/").pop() 
            }))|| []
          };
          setStats(formattedData);
        });

      fetch(`${API_BASE_URL}/api/featured-chat`)
        .then((res) => res.json())
        .then((data) => setFeatured(data));
    };
    
    fetchAllData();

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    };
  }, []);

  return (

    <motion.div 
      className="lobby-popup" 
      style={{ 
        maxWidth: "1000px", 
        width: "90%", 
        minHeight: "500px", 
        margin: "10px auto 40px auto", 
        padding: "1.5rem", 
        display: "flex", 
        flexDirection: "column", 
        flexShrink: 0, 
        boxSizing: "border-box" 
     }}
      initial="hidden" 
      animate="show"
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
    >
      <motion.h2 variants={{ hidden: { opacity: 0, y: -20 }, show: { opacity: 1, y: 0 } }} className="lobby-title" style={{ marginBottom: "1rem", flexShrink: 0 }}>
        Performance Analytics
      </motion.h2>
      
      {stats && (
     
<div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: "15px", width: "100%", flexGrow: 1, overflow: "visible" }}>
          <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="stat-card" style={{ padding: "10px", border: "1px solid #fff", borderRadius: "8px", textAlign: "center", background: "rgba(255,255,255,0.05)" }}>
            <h3 style={{ fontSize: "1.8rem", margin: "5px 0" }}>{stats.winRate}%</h3>
            <p style={{ opacity: 0.9, fontSize: "0.9rem", margin: 0, fontWeight: "bold" }}>Human Win Rate</p>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="stat-card" style={{ padding: "10px", border: "1px solid #444", borderRadius: "8px", textAlign: "center" }}>
            <h3 style={{ fontSize: "1.5rem", margin: "5px 0" }}>{stats.totalMatches}</h3>
            <p style={{ opacity: 0.7, fontSize: "0.8rem", margin: 0 }}>Total Games</p>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="stat-card" style={{ padding: "10px", border: "1px solid #444", borderRadius: "8px", textAlign: "center" }}>
            <h3 style={{ fontSize: "1.5rem", margin: "5px 0" }}>{stats.avgDuration}s</h3>
            <p style={{ opacity: 0.7, fontSize: "0.8rem", margin: 0 }}>Avg Match Time</p>
          </motion.div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: "15px", width: "100%", flexGrow: 1, overflow: "auto" , minHeight: "300px"}}>
        
        <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <h3 className="lobby-title" style={{ fontSize: "1.1rem", marginBottom: "0.5rem", flexShrink: 0 }}>Deception Leaderboard</h3>
          
          <div style={{ flex: 1, minHeight: 0, width: "100%", marginBottom: "1rem", display: "flex" }}>
            {stats && stats.modelPerformance?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.modelPerformance} margin={{ top: 5, right: 5, left: -25, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="shortName" stroke="#aaa" fontSize={10} angle={-20} textAnchor="end" tickMargin={5} />
                  <YAxis stroke="#aaa" fontSize={10} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #444", borderRadius: "8px" }} />
                  <Bar dataKey="deceptionRate" fill="#fff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", border: "1px dashed #333", borderRadius: "8px", color: "#555", fontSize: "0.9rem" }}>
                Awaiting Telemetry Data
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", paddingRight: "5px" }}>
            {stats?.modelPerformance.map((m) => (
              <div key={m.model} className="stat-card" style={{ padding: "10px", border: "1px solid #333", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.3)" }}>
                <div>
                  <strong style={{ fontSize: "0.8rem" }}>{m.shortName}</strong>
                  <div style={{ fontSize: "0.7rem", opacity: 0.6 }}>{m.totalEncounters} matches</div>
                </div>
                <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{m.deceptionRate}%</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <h3 className="lobby-title" style={{ fontSize: "1.1rem", marginBottom: "0.5rem", flexShrink: 0, textAlign: "center" }}>Model Performance Matrix</h3>
          
          <div style={{ flex: 1, minHeight: 0, width: "100%", marginBottom: "1rem", display: "flex" }}>
            {stats && stats.modelPerformance?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={stats.modelPerformance}>
                  <PolarGrid stroke="#444" />
                  <PolarAngleAxis dataKey="shortName" tick={{ fill: "#352828", fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Deception Rate" dataKey="deceptionRate" stroke="#fff" fill="#fff" fillOpacity={0.4} />
                  <Radar name="Avg Confidence" dataKey="avgConfidence" stroke="#555" fill="#555" fillOpacity={0.4} />
                  <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #444", borderRadius: "8px" }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", border: "1px dashed #333", borderRadius: "8px", color: "#555", fontSize: "0.9rem" }}>
                Awaiting Telemetry Data
              </div>
            )}
          </div>


          <div className="stat-card" style={{ padding: "8px", border: "1px solid rgba(255, 100, 100, 0.3)", borderRadius: "8px", textAlign: "center", background: "rgba(255, 50, 50, 0.05)", flexShrink: 0 }}>
            <h3 style={{ fontSize: "1.3rem", margin: "0 0 5px 0", color: "#ff8888" }}>{stats?.humanSabotage || 0}</h3>
            <p style={{ opacity: 0.9, fontSize: "0.85rem", margin: 0 }}>Human Sabotage Incidents</p>
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexShrink: 0 }}>
            <h3 className="lobby-title" style={{ fontSize: "1.1rem", margin: 0 }}>Featured Chat</h3>
          </div>
          
        
          <div className="simple-chatbox" style={{ width: "100%", flexGrow: 1, minHeight: "200px", height: "auto", display: "flex", flexDirection: "column", overflow: "auto" }}>
            <div className="messages-container" style={{ paddingRight: "10px", flexGrow: 1, overflowY: "auto" }}>
              {featured && featured.messages && featured.messages.length > 0 ? (
                  featured.messages.map((msg, i) => {
                    const isUser = msg.senderFlag === "user";
                    return (
                      <div key={i} className={`chat-message ${isUser ? "user-message" : "bot-message"}`}>
                        {msg.payload}
                      </div>
                    );
                  })
              ) : (
                  <p style={{ color: "#777", fontSize: "0.85rem", textAlign: "center", marginTop: "2rem" }}>
                    No chats featured yet. Check back soon!
                  </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      
      <motion.button 
        className="lobby-button" 
        style={{ marginTop: "1rem", flexShrink: 0, alignSelf: "center", minWidth: "120px" }} 
        onClick={onBack}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Back
      </motion.button>
    </motion.div>
  );
}

export default Dashboard;