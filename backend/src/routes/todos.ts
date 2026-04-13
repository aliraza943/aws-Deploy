import { and, eq } from "drizzle-orm";
import { NextFunction, Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import { db } from "../db";
import { todos } from "../db/schema";
import { deleteFromS3, uploadToS3 } from "../lib/s3";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

// multer stores file in memory as a Buffer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// ── Auth middleware ───────────────────────────────────────────────────────────
function authenticate(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
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

router.use(authenticate);

// ── GET all todos ─────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const userTodos = await db.select().from(todos).where(eq(todos.userId, userId));
    return res.json(userTodos);
});

// ── CREATE todo with optional image ───────────────────────────────────────────
// upload.single("image") means accept one file with field name "image"
router.post("/", upload.single("image"), async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { title } = req.body;

    if (!title) return res.status(400).json({ error: "Title is required" });

    let imageUrl: string | null = null;

    // if image was uploaded, send it to S3
    if (req.file) {
        imageUrl = await uploadToS3(req.file.buffer, req.file.mimetype);
    }

    const [todo] = await db
        .insert(todos)
        .values({ userId, title, imageUrl })
        .returning();

    return res.status(201).json(todo);
});

// ── UPDATE todo with optional new image ───────────────────────────────────────
router.put("/:id", upload.single("image"), async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const todoId = parseInt(req.params.id);
    const { title, completed } = req.body;

    // get existing todo to check for old image
    const [existing] = await db
        .select()
        .from(todos)
        .where(and(eq(todos.id, todoId), eq(todos.userId, userId)));

    if (!existing) return res.status(404).json({ error: "Todo not found" });

    let imageUrl = existing.imageUrl; // keep old image by default

    if (req.file) {
        // delete old image from S3 if exists
        if (existing.imageUrl) {
            await deleteFromS3(existing.imageUrl);
        }
        // upload new image
        imageUrl = await uploadToS3(req.file.buffer, req.file.mimetype);
    }

    const [updated] = await db
        .update(todos)
        .set({ title, completed: completed === "true", imageUrl })
        .where(and(eq(todos.id, todoId), eq(todos.userId, userId)))
        .returning();

    return res.json(updated);
});

// ── DELETE todo + its image from S3 ──────────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const todoId = parseInt(req.params.id);

    const [deleted] = await db
        .delete(todos)
        .where(and(eq(todos.id, todoId), eq(todos.userId, userId)))
        .returning();

    if (!deleted) return res.status(404).json({ error: "Todo not found" });

    // delete image from S3 if exists
    if (deleted.imageUrl) {
        await deleteFromS3(deleted.imageUrl);
    }

    return res.json({ message: "Deleted" });
});

export default router;