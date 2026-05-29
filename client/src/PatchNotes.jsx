import { motion } from "framer-motion";

const notes = [
  { version: "1.1", title: "The First Update", date: "10:57 29/05/2026" },
];

function PatchNotes() {
  return (
    <motion.div
      className="lobby-popup"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="lobby-title" style={{ fontSize: "2rem", marginBottom: "1.5rem" }}>
        Patch Notes
      </h2>
      {notes.map((n) => (
        <div key={n.version} style={{ width: "100%", textAlign: "left", marginBottom: "1.5rem", borderBottom: "1px solid #333", paddingBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h3 style={{ margin: 0, color: "#ffd700", fontSize: "1.2rem" }}>V{n.version} - The First</h3>
            <span style={{ color: "#666", fontSize: "0.8rem" }}>{n.date}</span>
          </div>
          

          <p style={{ color: "#aaa", fontSize: "0.9rem", margin: 0, lineHeight: 1.6 }}>
            - Complete UI overhaul with new animations, UI and improved mobile support.<br />
            - Matchmaking rebuilt from the ground up, Human players are prioritized.<br />
            - Every major bug that I know of has been fixed.<br />
            - Replaced “Featured Chat” with a massive, filterable database of past matches.<br />
            - Includes search bar, many sorting options and mobile support.<br />
            - Grok 4.20 has been added 💀<br />
            - Prompt improvements and Proactive AI.<br />
            - Lower queue times.<br />
            - 1 Million Bugfixes<br /><br/>
            - New <span style={{ color: "#ffd700", fontSize: "0.9rem", margin: 0, lineHeight: 1.6 }}>secret</span> for you to discover.
          </p>
        </div>
      ))}
    </motion.div>
  );
}

export default PatchNotes;
