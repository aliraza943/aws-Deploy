import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { refreshTokens, users } from "../db/schema";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_SECRET!;
const ACCESS_TOKEN_EXPIRY = "1m";
const REFRESH_TOKEN_EXPIRY = "30d";

// ── Helper: generate both tokens ──────────────────────────────────────────────
function generateAccessToken(userId: number) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(userId: number) {
    return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

// ── Helper: save refresh token in DB ─────────────────────────────────────────
async function saveRefreshToken(userId: number, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    await db.insert(refreshTokens).values({ userId, token, expiresAt });
}

// ── SIGNUP ────────────────────────────────────────────────────────────────────
router.post("/signup", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ error: "Email and password required" });

    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0)
        return res.status(409).json({ error: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);

    const [newUser] = await db
        .insert(users)
        .values({ email, password: hashed })
        .returning({ id: users.id, email: users.email });

    const accessToken = generateAccessToken(newUser.id);
    const refreshToken = generateRefreshToken(newUser.id);

    // save refresh token in DB
    await saveRefreshToken(newUser.id, refreshToken);

    return res.status(201).json({
        accessToken,
        refreshToken,
        user: newUser
    });
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user)
        return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
        return res.status(401).json({ error: "Invalid credentials" });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await saveRefreshToken(user.id, refreshToken);

    return res.json({
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email }
    });
});

// ── REFRESH ───────────────────────────────────────────────────────────────────
// Client calls this when accessToken expires (gets 401)
router.post("/refresh", async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken)
        return res.status(400).json({ error: "Refresh token required" });

    // 1. Verify the token signature and expiry
    let payload: { userId: number };
    try {
        payload = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: number };
    } catch {
        return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    // 2. Check if token exists in DB (not logged out / not stolen)
    const [stored] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, refreshToken));

    if (!stored)
        return res.status(401).json({ error: "Refresh token not found, please login again" });

    // 3. Check expiry from DB as well
    if (stored.expiresAt < new Date())
        return res.status(401).json({ error: "Refresh token expired" });

    // 4. Issue new access token
    const newAccessToken = generateAccessToken(payload.userId);

    return res.json({ accessToken: newAccessToken });
});

// ── LOGOUT ────────────────────────────────────────────────────────────────────
router.post("/logout", async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken)
        return res.status(400).json({ error: "Refresh token required" });

    // Delete from DB — now even if someone stole the token, it's useless
    await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.token, refreshToken));

    return res.json({ message: "Logged out successfully" });
});

export default router;