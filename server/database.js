import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, 'telemetry.db');

let dbInstance = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    const db = dbInstance;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS Matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      opponentType TEXT,
      assignedModel TEXT,
      wasSwapped INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS Messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matchId INTEGER REFERENCES Matches(id),
      payload TEXT,
      senderFlag VARCHAR,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matchId INTEGER REFERENCES Matches(id),
      guessedIdentity VARCHAR,
      actualIdentity VARCHAR,
      correct BOOLEAN,
      confidence INTEGER,
      duration INTEGER,
      comment TEXT
    );
  `);

  try {
    await db.run("ALTER TABLE Matches ADD COLUMN wasSwapped INTEGER DEFAULT 0");
  } catch {
    // column already exists
  }

  console.log("Database tables verified and ready.");
  
}
  return dbInstance;
}

