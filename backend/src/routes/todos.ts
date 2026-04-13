import { and, eq } from "drizzle-orm";
import { NextFunction, Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { todos } from "../db/schema";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ── Auth middleware ───────────────────────────────────────────────────────────
function authenticate(req: Request, res: Response, next: NextFunction) {

    const header = req.headers.authorization;       // "Bearer <token>"
    console.log("headers----->", header)
    if (!header) return res.status(401).json({ error: "No token" });

    const token = header.split(" ")[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
        (req as any).userId = payload.userId;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}

// Apply auth middleware to all todo routes
router.use(authenticate);

// ── GET all todos for logged-in user ──────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    // SELECT * FROM todos WHERE user_id = ?
    const userTodos = await db
        .select()
        .from(todos)
        .where(eq(todos.userId, userId));

    return res.json(userTodos);
});

// ── CREATE a todo ─────────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { title } = req.body;

    if (!title) return res.status(400).json({ error: "Title is required" });

    // INSERT INTO todos (user_id, title) VALUES (?, ?) RETURNING *
    const [todo] = await db
        .insert(todos)
        .values({ userId, title })
        .returning();

    return res.status(201).json(todo);
});

// ── UPDATE a todo (toggle complete or rename) ─────────────────────────────────
router.put("/:id", async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const todoId = parseInt(req.params.id);
    const { title, completed } = req.body;

    // and() lets you chain multiple WHERE conditions
    // This ensures users can only update their own todos
    const [updated] = await db
        .update(todos)
        .set({ title, completed })
        .where(and(eq(todos.id, todoId), eq(todos.userId, userId)))
        .returning();

    if (!updated) return res.status(404).json({ error: "Todo not found" });

    return res.json(updated);
});

// ── DELETE a todo ─────────────────────────────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const todoId = parseInt(req.params.id);

    const [deleted] = await db
        .delete(todos)
        .where(and(eq(todos.id, todoId), eq(todos.userId, userId)))
        .returning();

    if (!deleted) return res.status(404).json({ error: "Todo not found" });

    return res.json({ message: "Deleted" });
});

export default router;