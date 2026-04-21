import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { promises as fs } from "fs";

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

type UserRole = "admin" | "defensor" | "analista";
type UserPlan = "trial" | "pro" | "enterprise";
type UserStatus = "active" | "pending" | "suspended";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  org: string;
  plan: UserPlan;
  status: UserStatus;
  lastActive: string;
  createdAt: string;
  expirationDate?: string;
}

interface CaseRecord {
  id: number;
  userId: string;
  description: string;
  minutaPeca: string;
  diagnostico: string;
  estrategiaBusca: string;
  createdAt: string;
}

interface SearchRecord {
  id: number;
  userId: string;
  term: string;
  result: string;
  createdAt: string;
}

interface RulingRecord {
  id: number;
  userId: string;
  text: string;
  result: string;
  createdAt: string;
}

interface JsonDB {
  users: UserRecord[];
  cases: CaseRecord[];
  searches: SearchRecord[];
  rulings: RulingRecord[];
  counters: {
    caseId: number;
    searchId: number;
    rulingId: number;
  };
}

const initialDB: JsonDB = {
  users: [],
  cases: [],
  searches: [],
  rulings: [],
  counters: {
    caseId: 1,
    searchId: 1,
    rulingId: 1,
  },
};

let db: JsonDB = structuredClone(initialDB);
let writeQueue = Promise.resolve();

async function ensureDbFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, `${JSON.stringify(initialDB, null, 2)}\n`, "utf-8");
  }
}

async function loadDb() {
  await ensureDbFile();

  try {
    const file = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(file) as Partial<JsonDB>;

    db = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      cases: Array.isArray(parsed.cases) ? parsed.cases : [],
      searches: Array.isArray(parsed.searches) ? parsed.searches : [],
      rulings: Array.isArray(parsed.rulings) ? parsed.rulings : [],
      counters: {
        caseId: Number(parsed.counters?.caseId ?? 1),
        searchId: Number(parsed.counters?.searchId ?? 1),
        rulingId: Number(parsed.counters?.rulingId ?? 1),
      },
    };
  } catch (error) {
    console.error("Failed to read data/db.json. Starting with empty DB:", error);
    db = structuredClone(initialDB);
  }
}

async function persistDb() {
  writeQueue = writeQueue.then(() =>
    fs.writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, "utf-8")
  );

  await writeQueue;
}

function nowIso() {
  return new Date().toISOString();
}

async function startServer() {
  await loadDb();

  const app = express();
  app.use(express.json());

  app.get("/api/users/me", async (req, res) => {
    const uid = req.headers["x-user-id"] as string | undefined;
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = db.users.find((u) => u.id === uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  });

  app.post("/api/users", async (req, res) => {
    const payload = req.body as Partial<UserRecord>;

    if (!payload.id || !payload.name || !payload.email) {
      return res.status(400).json({ error: "id, name and email are required" });
    }

    const existingIndex = db.users.findIndex((u) => u.id === payload.id);
    const timestamp = nowIso();

    const user: UserRecord = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: (payload.role as UserRole) || "defensor",
      org: payload.org || "DP-Geral",
      plan: (payload.plan as UserPlan) || "trial",
      status: (payload.status as UserStatus) || "active",
      expirationDate: payload.expirationDate,
      createdAt:
        existingIndex >= 0 ? db.users[existingIndex].createdAt : timestamp,
      lastActive: timestamp,
    };

    if (existingIndex >= 0) {
      db.users[existingIndex] = {
        ...db.users[existingIndex],
        ...user,
      };
    } else {
      db.users.push(user);
    }

    await persistDb();
    return res.json(existingIndex >= 0 ? db.users[existingIndex] : user);
  });

  app.patch("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const index = db.users.findIndex((u) => u.id === id);

    if (index < 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const payload = req.body as Partial<UserRecord>;
    const current = db.users[index];

    db.users[index] = {
      ...current,
      ...payload,
      id: current.id,
      createdAt: current.createdAt,
      lastActive: nowIso(),
    };

    await persistDb();
    return res.json(db.users[index]);
  });

  app.delete("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const before = db.users.length;
    db.users = db.users.filter((u) => u.id !== id);

    if (db.users.length === before) {
      return res.status(404).json({ error: "User not found" });
    }

    await persistDb();
    return res.status(204).send();
  });

  app.post("/api/cases", async (req, res) => {
    const { userId, description, minutaPeca, diagnostico, estrategiaBusca } = req.body as {
      userId?: string;
      description?: string;
      minutaPeca?: string;
      diagnostico?: string;
      estrategiaBusca?: string;
    };

    if (!userId || !description || !minutaPeca || !diagnostico || !estrategiaBusca) {
      return res.status(400).json({ error: "Missing required case fields" });
    }

    const record: CaseRecord = {
      id: db.counters.caseId++,
      userId,
      description,
      minutaPeca,
      diagnostico,
      estrategiaBusca,
      createdAt: nowIso(),
    };

    db.cases.push(record);
    await persistDb();
    return res.json(record);
  });

  app.post("/api/searches", async (req, res) => {
    const { userId, term, result } = req.body as {
      userId?: string;
      term?: string;
      result?: string;
    };

    if (!userId || !term || !result) {
      return res.status(400).json({ error: "Missing required search fields" });
    }

    const record: SearchRecord = {
      id: db.counters.searchId++,
      userId,
      term,
      result,
      createdAt: nowIso(),
    };

    db.searches.push(record);
    await persistDb();
    return res.json(record);
  });

  app.post("/api/rulings", async (req, res) => {
    const { userId, text, result } = req.body as {
      userId?: string;
      text?: string;
      result?: string;
    };

    if (!userId || !text || !result) {
      return res.status(400).json({ error: "Missing required ruling fields" });
    }

    const record: RulingRecord = {
      id: db.counters.rulingId++,
      userId,
      text,
      result,
      createdAt: nowIso(),
    };

    db.rulings.push(record);
    await persistDb();
    return res.json(record);
  });

  app.get("/api/admin/users", async (_req, res) => {
    const ordered = [...db.users].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    return res.json(ordered);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`JSON DB file: ${DB_PATH}`);
    if (process.env.DATABASE_URL) {
      console.log("DATABASE_URL detected in env (reserved for future PostgreSQL migration).");
    }
  });
}

startServer();
