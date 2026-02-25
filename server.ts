import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("quizgrid.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    category TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    percentage REAL NOT NULL,
    grade_letter TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/scores", (req, res) => {
    const { name, grade, category, score, total_questions, percentage, grade_letter } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO scores (name, grade, category, score, total_questions, percentage, grade_letter)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(name, grade, category, score, total_questions, percentage, grade_letter);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving score:", error);
      res.status(500).json({ error: "Failed to save score" });
    }
  });

  app.get("/api/leaderboard", (req, res) => {
    try {
      // Get all scores, ordered by grade, category, and then score descending
      const stmt = db.prepare(`
        SELECT * FROM scores 
        ORDER BY grade ASC, category ASC, score DESC, created_at DESC
      `);
      const scores = stmt.all();
      res.json(scores);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.delete("/api/scores/:id", (req, res) => {
    const { id } = req.params;
    try {
      const stmt = db.prepare("DELETE FROM scores WHERE id = ?");
      stmt.run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting score:", error);
      res.status(500).json({ error: "Failed to delete score" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
