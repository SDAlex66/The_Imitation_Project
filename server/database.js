import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';


const dbPath = process.env.DB_PATH || path.resolve('telemetry.db');

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
      assignedModel TEXT
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

  console.log("Database tables verified and ready.");
  
}
  return dbInstance;
}

