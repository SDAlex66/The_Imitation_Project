import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";


const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";


function Dashboard({ onBack }) {
  const [stats, setStats] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [timeLeft, setTimeLeft] = useState(900);

 
  useEffect(() => {
    const fetchAllData = () => {
      fetch(`${API_BASE_URL}/api/stats`)
        .then((res) => res.json())
        .then((data) => {
          const formattedData = {
            ...data,
            modelPerformance: data.modelPerformance.map(m => ({
              ...m,
              shortName: m.model.split("/").pop() 
            }))
          };
          setStats(formattedData);
        });

      fetch(`${API_BASE_URL}/api/featured-chat`)
        .then((res) => res.json())
        .then((data) => {
          setFeatured(data);
          localStorage.setItem("nextRefresh", data.nextRefreshTime);
        });
    };

    
    fetchAllData();

    // Timer logic that triggers a refresh at zero
    const timer = setInterval(() => {
      const savedDeadline = parseInt(localStorage.getItem("nextRefresh"));
      if (savedDeadline) {
        const remaining = Math.floor((savedDeadline - Date.now()) / 1000);
        if (remaining <= 0) {
          localStorage.removeItem("nextRefresh"); 
          setTimeLeft(900); 
          setTimeout(() => {
            fetchAllData();
          }, 2000);
        } else {
          setTimeLeft(remaining);
        }
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <motion.div 
      className="lobby-popup evaluation-window-compact" 
      style={{ maxWidth: "1200px", width: "95%" }}
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
    >
      <h2 className="lobby-title">Performance Analytics</h2>
      
      {/* Top Stats Row */}
      {stats && (
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "2rem" }}>
          <div className="stat-card" style={{ padding: "15px", border: "1px solid #444", borderRadius: "8px", textAlign: "center" }}>
            <h3>{stats.totalMatches}</h3>
            <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>Total Games</p>
          </div>
          <div className="stat-card" style={{ padding: "15px", border: "1px solid #444", borderRadius: "8px", textAlign: "center" }}>
            <h3>{stats.winRate}%</h3>
            <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>Human Win Rate</p>
          </div>
          <div className="stat-card" style={{ padding: "15px", border: "1px solid #444", borderRadius: "8px", textAlign: "center" }}>
            <h3>{stats.avgDuration}s</h3>
            <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>Avg Match Time</p>
          </div>
        </div>
      )}

      
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px", textAlign: "left" }}>
        
        {/* Left Column: Graph & Rankings */}
        <div>
          <h3 className="lobby-title" style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Deception Rate by Model</h3>
          
          
          {stats && (
            <div style={{ height: "220px", width: "100%", marginBottom: "1rem" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.modelPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis 
                    dataKey="shortName" 
                    stroke="#aaa" 
                    fontSize={12} 
                    angle={-20} 
                    textAnchor="end" 
                    tickMargin={10} 
                  />
                  <YAxis stroke="#aaa" fontSize={12} unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#111", border: "1px solid #444", borderRadius: "8px" }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="deceptionRate" fill="#fff" name="Deception Rate" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {stats?.modelPerformance.map((m) => (
              <div key={m.model} className="stat-card" style={{ padding: "10px 15px", border: "1px solid #444", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: "0.9rem" }}>{m.shortName}</strong>
                  <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{m.totalEncounters} encounters</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: "bold" }}>{m.deceptionRate}% Dec.</div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>{m.avgConfidence}% Conf.</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Featured Chat */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 className="lobby-title" style={{ fontSize: "1.2rem", margin: 0 }}>Featured Chat</h3>
            <span style={{ fontSize: "0.8rem", color: "#aaa", background: "#222", padding: "4px 8px", borderRadius: "12px" }}>
              Refresh in {formatTime(timeLeft)}
            </span>
          </div>
          

          <div 
            className="chat-preview" 
            style={{ 
              flexGrow: 1, 
              minHeight: "300px", 
              overflowY: "auto", 
              background: "#0a0a0a", 
              padding: "20px", 
              border: "1px solid #333",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            {featured && featured.messages && featured.messages.length > 0 ? (
                featured.messages.map((msg, i) => {
                  const isUser = msg.senderFlag === "user";
                  return (
                    <div 
                      key={i} 
                      style={{ 
                        display: "flex", 
                        justifyContent: isUser ? "flex-end" : "flex-start",
                        width: "100%" 
                      }}
                    >
                      <div 
                        style={{
                          maxWidth: "75%",
                          padding: "10px 14px",
                          borderRadius: isUser ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                          background: isUser ? "#fff" : "#222",
                          color: isUser ? "#000" : "#fff",
                          fontSize: "0.9rem",
                          lineHeight: "1.4"
                        }}
                      >
                        {msg.payload}
                      </div>
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
      </div>
      
      <button className="lobby-button" style={{ marginTop: "2rem" }} onClick={onBack}>Back</button>
    </motion.div>
  );
}

export default Dashboard;