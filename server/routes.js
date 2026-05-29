import { getDb } from "./database.js";

export function registerRoutes(app) {
  app.get("/api/stats", async (req, res) => {
    try {
      const db = await getDb();
      
      const total = await db.get("SELECT COUNT(*) as count FROM Evaluations");
      const wins = await db.get("SELECT COUNT(*) as count FROM Evaluations WHERE correct = 1");
      const avg = await db.get("SELECT AVG(duration) as avg FROM Evaluations");

      const modelStats = await db.all(`
        SELECT 
          Matches.assignedModel,
          COUNT(*) as total_encounters,
          AVG(Evaluations.confidence) as avg_confidence,
          SUM(CASE WHEN Evaluations.correct = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as deception_rate
        FROM Evaluations
        JOIN Matches ON Evaluations.matchId = Matches.id
        WHERE Matches.opponentType = 'AI'
        GROUP BY Matches.assignedModel
        ORDER BY deception_rate DESC
      `);

      res.json({
        totalMatches: total.count,
        winRate: total.count > 0 ? Math.round((wins.count / total.count) * 100) : 0,
        avgDuration: Math.round(avg.avg || 0),
        modelPerformance: modelStats.map(m => ({
          model: m.assignedModel,
          totalEncounters: m.total_encounters,
          avgConfidence: Math.round(m.avg_confidence || 0),
          deceptionRate: Math.round(m.deception_rate || 0)
        }))
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/models", async (req, res) => {
    try {
      const db = await getDb();
      const models = await db.all("SELECT DISTINCT assignedModel FROM Matches WHERE assignedModel IS NOT NULL AND assignedModel != '' ORDER BY assignedModel");
      res.json(models.map(m => m.assignedModel));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  app.get("/api/all-chats", async (req, res) => {
    try {
      const db = await getDb();
      const { model, opponentType, hasComment, hasMessages, correct, search, sort, offset = 0, limit = 10 } = req.query;

      let where = [];
      let params = [];

      if (model) {
        where.push("m.assignedModel = ?");
        params.push(model);
      }
      if (opponentType) {
        where.push("m.opponentType = ?");
        params.push(opponentType);
      }
      if (hasComment === "true") {
        where.push("e.comment IS NOT NULL AND e.comment != ''");
      }
      if (correct === "true") {
        where.push("e.correct = 1");
      } else if (correct === "false") {
        where.push("e.correct = 0");
      }
      if (hasMessages === "true") {
        where.push("EXISTS (SELECT 1 FROM Messages WHERE matchId = m.id)");
      }
      if (search && search.trim()) {
        where.push("EXISTS (SELECT 1 FROM Messages WHERE matchId = m.id AND payload LIKE ?)");
        params.push(`%${search.trim()}%`);
      }

      const whereClause = where.length > 0 ? "WHERE " + where.join(" AND ") : "";

      const countResult = await db.get(`
        SELECT COUNT(DISTINCT m.id) as total
        FROM Matches m
        LEFT JOIN Evaluations e ON e.matchId = m.id
        ${whereClause}
      `, ...params);

      let orderBy = "m.id DESC";
      if (sort === "oldest") orderBy = "m.id ASC";
      else if (sort === "messages") orderBy = "(SELECT COUNT(*) FROM Messages WHERE matchId = m.id) DESC";

      const matches = await db.all(`
        SELECT m.id, m.opponentType, m.assignedModel, m.timestamp, m.wasSwapped,
               e.correct, e.comment, e.guessedIdentity, e.actualIdentity
        FROM Matches m
        LEFT JOIN Evaluations e ON e.matchId = m.id
        ${whereClause}
        GROUP BY m.id
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `, ...params, Number(limit), Number(offset));

      const chats = [];
      for (let match of matches) {
        const messages = await db.all("SELECT * FROM Messages WHERE matchId = ? ORDER BY timestamp ASC", [match.id]);
        chats.push({
          matchId: match.id,
          opponentType: match.opponentType,
          assignedModel: match.assignedModel,
          wasSwapped: !!match.wasSwapped,
          timestamp: match.timestamp,
          evaluation: match.correct !== null ? {
            correct: match.correct,
            comment: match.comment,
            guessedIdentity: match.guessedIdentity,
            actualIdentity: match.actualIdentity
          } : null,
          messages
        });
      }
      res.json({ chats, total: countResult.total, offset: Number(offset), limit: Number(limit) });
    } catch (error) {
      console.error("Chat fetch error:", error);
      res.status(500).json({ error: "Failed to fetch chat database" });
    }
  });
}
