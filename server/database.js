import sqlite3 from "sqlite3";
import { open } from "sqlite";

let db;

export async function getDb() {
  if (db) return db;

  db = await open({
    filename: "./telemetry.db",
    driver: sqlite3.Database
  });

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
  return db;
}