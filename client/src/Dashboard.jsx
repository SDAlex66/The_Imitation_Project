import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const filterSelectStyle = {
  padding: "4px 8px",
  fontSize: "0.75rem",
  background: "rgba(0,0,0,0.4)",
  color: "#ccc",
  border: "1px solid #444",
  borderRadius: "4px",
  outline: "none",
  cursor: "pointer"
};

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [models, setModels] = useState([]);
  const [chats, setChats] = useState([]);
  const [filters, setFilters] = useState({ model: "", opponentType: "", hasComment: "", correct: "", hasMessages: "true", search: "", sort: "newest" });
  const [selectedChat, setSelectedChat] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dashHeight, setDashHeight] = useState("auto");
  const isMobile = "ontouchstart" in window || window.innerWidth < 768;

  useEffect(() => {
    if (isMobile) return setDashHeight("auto");
    const measure = () => {
      const header = document.querySelector(".header-container");
      const footer = document.querySelector("footer");
      const nav = document.querySelector(".nav-bar-pc");
      if (!header || !footer) return;
      const h = header.offsetHeight + (nav?.offsetHeight || 0) + footer.offsetHeight;
      const avail = window.innerHeight - h - 28;
      setDashHeight(`${Math.max(avail, 350)}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isMobile]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/stats`)
      .then((res) => res.json())
      .then((data) => {
        setStats({
          ...data,
          modelPerformance: data.modelPerformance?.map(m => ({
            ...m,
            shortName: m.model.split("/").pop()
          }))|| []
        });
      });
    fetch(`${API_BASE_URL}/api/models`)
      .then((res) => res.json())
      .then(setModels);
  }, []);

  const fetchChats = (append = false) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.model) params.set("model", filters.model);
    if (filters.opponentType) params.set("opponentType", filters.opponentType);
    if (filters.hasComment) params.set("hasComment", filters.hasComment);
    if (filters.correct) params.set("correct", filters.correct);
    if (filters.hasMessages) params.set("hasMessages", filters.hasMessages);
    if (filters.search) params.set("search", filters.search);
    if (filters.sort) params.set("sort", filters.sort);
    if (append) params.set("offset", chats.length);
    params.set("limit", "9");

    fetch(`${API_BASE_URL}/api/all-chats?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const newLen = append ? chats.length + data.chats.length : data.chats.length;
        setChats(append ? c => [...c, ...data.chats] : data.chats);
        setHasMore(data.total > newLen);
        setLoading(false);
      });
  }

  useEffect(() => { fetchChats(false); }, [filters]);

  return (
    <motion.div 
      className="lobby-popup dashboard-popup" 
      style={{ 
        maxWidth: "1000px", 
        width: "90%",
        height: dashHeight,
        margin: isMobile ? "5px auto" : "8px auto 0 auto", 
        padding: isMobile ? "0.75rem" : "1.25rem 1.25rem 0.75rem 1.25rem", 
        display: "flex", 
        flexDirection: "column", 
        flexShrink: 0, 
        boxSizing: "border-box",
        overflow: "hidden"
     }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: "15px", width: "100%", flexShrink: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="stat-card" style={{ padding: "10px", border: "1px solid #fff", borderRadius: "8px", textAlign: "center", background: "rgba(255,255,255,0.05)" }}
          >
            <h3 style={{ fontSize: "1.8rem", margin: "5px 0" }}>{stats.winRate}%</h3>
            <p style={{ opacity: 0.9, fontSize: "0.9rem", margin: 0, fontWeight: "bold" }}>Human Win Rate</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="stat-card" style={{ padding: "10px", border: "1px solid #444", borderRadius: "8px", textAlign: "center" }}
          >
            <h3 style={{ fontSize: "1.5rem", margin: "5px 0" }}>{stats.totalMatches}</h3>
            <p style={{ opacity: 0.7, fontSize: "0.8rem", margin: 0 }}>Total Games</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="stat-card" style={{ padding: "10px", border: "1px solid #444", borderRadius: "8px", textAlign: "center" }}
          >
            <h3 style={{ fontSize: "1.5rem", margin: "5px 0" }}>{stats.avgDuration}s</h3>
            <p style={{ opacity: 0.7, fontSize: "0.8rem", margin: 0 }}>Avg Match Time</p>
          </motion.div>
        </motion.div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr 1fr", gap: "15px", width: "100%", flex: 1, minHeight: 0, overflow: "hidden" }}>
        
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}
        >
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

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", paddingRight: "5px", flexShrink: 0 }}>
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

    <motion.div
      style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}
    >
      <h3 className="lobby-title" style={{ fontSize: "1.1rem", marginBottom: "0.5rem", flexShrink: 0 }}>Chat Database</h3>

          <div className="db-filters" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "0.5rem", flexShrink: 0 }}>
            <input
              type="text" placeholder="Search messages..." value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              style={{ ...filterSelectStyle, minWidth: "80px", flex: 1 }}
            />
            <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))} style={filterSelectStyle}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="messages">Most Messages</option>
            </select>
            <select value={filters.model} onChange={e => setFilters(f => ({ ...f, model: e.target.value }))} style={filterSelectStyle}>
              <option value="">All Models</option>
              {models.map(m => (
                <option key={m} value={m}>{m.split("/").pop()}</option>
              ))}
            </select>
            <select value={filters.opponentType} onChange={e => setFilters(f => ({ ...f, opponentType: e.target.value }))} style={filterSelectStyle}>
              <option value="">All Types</option>
              <option value="Human">Human</option>
              <option value="AI">AI</option>
            </select>
            <select value={filters.correct} onChange={e => setFilters(f => ({ ...f, correct: e.target.value }))} style={filterSelectStyle}>
              <option value="">All Results</option>
              <option value="true">Correct</option>
              <option value="false">Incorrect</option>
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", color: "#aaa", fontSize: "0.75rem", cursor: "pointer" }}>
              <input type="checkbox" checked={filters.hasComment === "true"} onChange={e => setFilters(f => ({ ...f, hasComment: e.target.checked ? "true" : "" }))} />
              Comment
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", color: "#aaa", fontSize: "0.75rem", cursor: "pointer" }}>
              <input type="checkbox" checked={filters.hasMessages !== "true"} onChange={e => setFilters(f => ({ ...f, hasMessages: e.target.checked ? "" : "true" }))} />
              Empty
            </label>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", paddingRight: "4px" }}>
            {chats.length === 0 ? (
              <div style={{ color: "#555", fontSize: "0.85rem", textAlign: "center", marginTop: "2rem" }}>
                No chats match the filters.
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.matchId}
                  onClick={() => setSelectedChat(chat)}
                  role="button" tabIndex={0}
                  onKeyDown={e => e.key === "Enter" && setSelectedChat(chat)}
                  aria-label={`Chat #${chat.matchId} with ${chat.opponentType}`}
                  style={{ border: "1px solid #333", borderRadius: "6px", background: "rgba(0,0,0,0.3)", overflow: "hidden", flexShrink: 0, cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.3)"}
                >
                  <div style={{ padding: "7px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                    <div style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap" }}>
                      <span className="pill pill-id">#{chat.matchId}</span>
                      <span className={`pill pill-type-${chat.opponentType?.toLowerCase()}`}>{chat.opponentType}</span>
                      {chat.wasSwapped && <span className="pill pill-type-swapped">Swapped</span>}
                      {chat.assignedModel && (
                        <span className="pill pill-model">{chat.assignedModel.split("/").pop()}</span>
                      )}
                      {chat.evaluation && (
                        <span className={`pill pill-result-${chat.evaluation.correct ? "correct" : "wrong"}`}>
                          {chat.evaluation.correct ? "✓" : "✗"}
                        </span>
                      )}
                      <span className="pill pill-msgs">{chat.messages.length} msgs</span>
                    </div>
                    <span style={{ color: "#555", fontSize: "0.7rem" }}>▶</span>
                  </div>
                </div>
              ))
            )}
            {hasMore && (
              <button onClick={() => fetchChats(true)} disabled={loading} style={{ padding: "6px", fontSize: "0.75rem", background: "rgba(255,255,255,0.08)", color: "#ccc", border: "1px solid #444", borderRadius: "4px", cursor: "pointer", marginTop: "2px", flexShrink: 0, transition: "background 0.2s" }}>
                {loading ? "Loading..." : "Show More"}
              </button>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}
        >
          <h3 className="lobby-title" style={{ fontSize: "1.1rem", marginBottom: "0.5rem", flexShrink: 0, textAlign: "center" }}>Model Performance Matrix</h3>
          
          <div style={{ flex: 1, minHeight: 0, width: "100%", marginBottom: "1rem", display: "flex" }}>
            {stats && stats.modelPerformance?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={stats.modelPerformance}>
                  <PolarGrid stroke="#444" />
                  <PolarAngleAxis dataKey="shortName" tick={{ fill: "#aaa", fontSize: 10 }} />
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
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedChat && (
          <motion.div key="overlay"
            className="modal-overlay"
            onClick={() => setSelectedChat(null)}
            role="dialog" aria-label="Chat conversation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div key="content" className="modal-content" onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", color: "#fff" }}>Chat #{selectedChat.matchId}</h3>
                  <div style={{ display: "flex", gap: "5px", marginTop: "6px", flexWrap: "wrap" }}>
                    <span className={`pill pill-type-${selectedChat.opponentType?.toLowerCase()}`}>{selectedChat.opponentType}</span>
                    {selectedChat.wasSwapped && <span className="pill pill-type-swapped">Swapped</span>}
                  {selectedChat.assignedModel && (
                    <span className="pill pill-model">{selectedChat.assignedModel.split("/").pop()}</span>
                  )}
                  <span className="pill pill-msgs">{selectedChat.messages.length} messages</span>
                </div>
                {selectedChat.evaluation && (
                  <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "#aaa" }}>
                    <span>Guessed: {selectedChat.evaluation.guessedIdentity}</span>
                    <span style={{ margin: "0 8px" }}>|</span>
                    <span>Actual: {selectedChat.evaluation.actualIdentity}</span>
                    <span style={{ margin: "0 8px" }}>|</span>
                    <span className={`pill pill-result-${selectedChat.evaluation.correct ? "correct" : "wrong"}`}>
                      {selectedChat.evaluation.correct ? "Correct ✓" : "Wrong ✗"}
                    </span>
                    {selectedChat.evaluation.comment && (
                      <div style={{ marginTop: "4px", color: "#ffd700", fontStyle: "italic" }}>
                        "{selectedChat.evaluation.comment}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedChat(null)}
                className="modal-close"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
            <div className="modal-messages">
              {selectedChat.messages.map((msg, i) => (
                <div key={i} className={`${msg.senderFlag === "user" ? "user-wrapper" : "bot-wrapper"}`}>
                  <div className={`chat-message ${msg.senderFlag === "user" ? "user-message" : "bot-message"}`}>
                    {msg.payload}
                  </div>
                  <span className="timestamp">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
              ))}
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Dashboard;