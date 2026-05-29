import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

function MobileDatabase() {
  const [chats, setChats] = useState([]);
  const [filters, setFilters] = useState({ model: "", opponentType: "", hasComment: "", correct: "", hasMessages: "true", search: "", sort: "newest" });
  const [selectedChat, setSelectedChat] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/models`).then(r => r.json()).then(setModels);
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
      .then(r => r.json())
      .then(data => {
        const newLen = append ? chats.length + data.chats.length : data.chats.length;
        setChats(append ? c => [...c, ...data.chats] : data.chats);
        setHasMore(data.total > newLen);
        setLoading(false);
      });
  };

  useEffect(() => { fetchChats(false); }, [filters]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      style={{ width: "100%", maxWidth: "100%", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <h3 className="lobby-title" style={{ fontSize: "1.1rem", marginBottom: "0.5rem", marginTop: "0.5rem", flexShrink: 0, textAlign: "center" }}>Chat Database</h3>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: "80px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "0.5rem", padding: "0 0.5rem", flexShrink: 0 }}>
        <input type="text" placeholder="Search..." value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          style={{ ...filterSelectStyle, minWidth: "70px", flex: 1, fontSize: "0.65rem", padding: "3px 5px" }}
        />
        <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))} style={{ ...filterSelectStyle, fontSize: "0.65rem", padding: "3px 5px" }}>
          <option value="newest">New</option>
          <option value="oldest">Old</option>
          <option value="messages">Most</option>
        </select>
        <select value={filters.model} onChange={e => setFilters(f => ({ ...f, model: e.target.value }))} style={{ ...filterSelectStyle, fontSize: "0.65rem", padding: "3px 5px" }}>
          <option value="">All</option>
          {models.map(m => <option key={m} value={m}>{m.split("/").pop()}</option>)}
        </select>
        <select value={filters.opponentType} onChange={e => setFilters(f => ({ ...f, opponentType: e.target.value }))} style={{ ...filterSelectStyle, fontSize: "0.65rem", padding: "3px 5px" }}>
          <option value="">All Types</option>
          <option value="Human">Human</option>
          <option value="AI">AI</option>
        </select>
        <select value={filters.correct} onChange={e => setFilters(f => ({ ...f, correct: e.target.value }))} style={{ ...filterSelectStyle, fontSize: "0.65rem", padding: "3px 5px" }}>
          <option value="">All Results</option>
          <option value="true">Correct</option>
          <option value="false">Incorrect</option>
        </select>
        <div style={{ display: "flex", gap: "6px", alignItems: "center", width: "100%" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "3px", color: "#aaa", fontSize: "0.6rem", cursor: "pointer" }}>
            <input type="checkbox" checked={filters.hasComment === "true"} onChange={e => setFilters(f => ({ ...f, hasComment: e.target.checked ? "true" : "" }))} />
            Comment
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "3px", color: "#aaa", fontSize: "0.6rem", cursor: "pointer" }}>
            <input type="checkbox" checked={filters.hasMessages !== "true"} onChange={e => setFilters(f => ({ ...f, hasMessages: e.target.checked ? "" : "true" }))} />
            Empty
          </label>
        </div>
      </div>

      {chats.length === 0 ? (
        <div style={{ color: "#555", fontSize: "0.85rem", textAlign: "center", marginTop: "2rem", flexShrink: 0 }}>No chats match.</div>
      ) : (
        chats.map(chat => (
          <div key={chat.matchId} onClick={() => setSelectedChat(chat)}
            role="button" tabIndex={0} aria-label={`Chat ${chat.matchId}`}
            style={{ border: "1px solid #333", borderRadius: "6px", background: "rgba(0,0,0,0.3)", padding: "7px 10px", flexShrink: 0, cursor: "pointer", margin: "0 0.5rem" }}
          >
            <div style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap" }}>
              <span className="pill pill-id">#{chat.matchId}</span>
              <span className={`pill pill-type-${chat.opponentType?.toLowerCase()}`}>{chat.opponentType}</span>
              {chat.wasSwapped && <span className="pill pill-type-swapped">Swapped</span>}
              {chat.assignedModel && <span className="pill pill-model">{chat.assignedModel.split("/").pop()}</span>}
              {chat.evaluation && (
                <span className={`pill pill-result-${chat.evaluation.correct ? "correct" : "wrong"}`}>
                  {chat.evaluation.correct ? "✓" : "✗"}
                </span>
              )}
              <span className="pill pill-msgs">{chat.messages.length} msgs</span>
            </div>
          </div>
        ))
      )}
      {hasMore && (
        <button onClick={() => fetchChats(true)} disabled={loading}
          style={{ padding: "6px", fontSize: "0.75rem", background: "rgba(255,255,255,0.08)", color: "#ccc", border: "1px solid #444", borderRadius: "4px", cursor: "pointer", flexShrink: 0, margin: "0 0.5rem" }}>
          {loading ? "Loading..." : "Show More"}
        </button>
      )}
      </div>
      <AnimatePresence>
        {selectedChat && (
          <motion.div key="overlay" className="modal-overlay" onClick={() => setSelectedChat(null)} role="dialog"
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
                  {selectedChat.assignedModel && <span className="pill pill-model">{selectedChat.assignedModel.split("/").pop()}</span>}
                  <span className="pill pill-msgs">{selectedChat.messages.length} messages</span>
                </div>
                {selectedChat.evaluation && (
                  <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "#aaa" }}>
                    <span>Guessed: {selectedChat.evaluation.guessedIdentity} | Actual: {selectedChat.evaluation.actualIdentity}</span>
                    <span className={`pill pill-result-${selectedChat.evaluation.correct ? "correct" : "wrong"}`} style={{ marginLeft: "6px" }}>
                      {selectedChat.evaluation.correct ? "Correct ✓" : "Wrong ✗"}
                    </span>
                    {selectedChat.evaluation.comment && (
                      <div style={{ marginTop: "4px", color: "#ffd700", fontStyle: "italic" }}>"{selectedChat.evaluation.comment}"</div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedChat(null)} className="modal-close" aria-label="Close">✕</button>
            </div>
            <div className="modal-messages">
              {selectedChat.messages.map((msg, i) => (
                <div key={i} className={msg.senderFlag === "user" ? "user-wrapper" : "bot-wrapper"}>
                  <div className={`chat-message ${msg.senderFlag === "user" ? "user-message" : "bot-message"}`}>{msg.payload}</div>
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

export default MobileDatabase;
