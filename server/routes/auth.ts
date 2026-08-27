import bcrypt from "bcryptjs";
import Router from "express-promise-router";
import { z } from "zod";
import { publicDemoAccounts } from "../auth/demoAccounts.js";
import { signUser } from "../auth/jwt.js";
import { jwtCookieOptions, sessionMode } from "../config.js";
import { publicUser, requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { getAppStore } from "../repositories/appStore.js";

export const authRouter = Router();

authRouter.get("/demo-accounts", (_req, res) => {
  res.json({ accounts: publicDemoAccounts() });
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(1).max(128) }).parse(req.body);
  const store = getAppStore();
  await store.ensureDemoData();
  const user = await store.getUserByEmail(body.email);
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const safeUser = publicUser(user);
  const token = signUser(safeUser);
  if (req.session) req.session.user = safeUser;
  res.cookie("clarifi.jwt", token, jwtCookieOptions);
  await store.writeAudit({ conversationId: null, actorId: user.id, action: "auth.login", metadata: { mode: "password" }, success: true });
  res.json({ user: safeUser, token, sessionMode: sessionMode(), persistenceMode: store.mode });
});

authRouter.post("/demo-login", authLimiter, async (req, res) => {
  const body = z.object({
    accountId: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().optional()
  }).parse(req.body || {});
  const store = getAppStore();
  await store.ensureDemoData();
  const user = body.accountId
    ? await store.getUserByDemoAccount(body.accountId)
    : body.email
      ? await store.getUserByEmail(body.email)
      : await store.getUserByDemoAccount("advisor-demo");
  if (!user) return res.status(404).json({ error: "Account not found" });
  if (!body.accountId && (!body.password || !(await bcrypt.compare(body.password, user.passwordHash)))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const safeUser = publicUser(user);
  const token = signUser(safeUser);
  if (req.session) req.session.user = safeUser;
  res.cookie("clarifi.jwt", token, jwtCookieOptions);
  await store.writeAudit({ conversationId: null, actorId: user.id, action: "auth.login", metadata: { mode: user.demoAccountId ? "demo" : "password" }, success: true });
  res.json({ user: safeUser, token, sessionMode: sessionMode(), persistenceMode: store.mode });
});

authRouter.post("/register", authLimiter, async (req, res) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(10).max(128),
    name: z.string().trim().min(2).max(80),
    role: z.enum(["advisor", "client"])
  }).parse(req.body);
  const store = getAppStore();
  if (await store.getUserByEmail(body.email)) return res.status(409).json({ error: "Email is already registered" });
  const user = await store.createUser({
    email: body.email,
    name: body.name,
    role: body.role,
    passwordHash: await bcrypt.hash(body.password, 12),
    demoAccountId: null
  });
  const safeUser = publicUser(user);
  res.cookie("clarifi.jwt", signUser(safeUser), jwtCookieOptions);
  await store.writeAudit({ conversationId: null, actorId: user.id, action: "auth.register", metadata: { role: user.role }, success: true });
  res.status(201).json({ user: safeUser, persistenceMode: store.mode });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user!) });
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie("clarifi.jwt", { path: "/" });
  if (!req.session) return res.json({ ok: true });
  req.session.destroy(() => res.clearCookie("clarifi.sid").json({ ok: true }));
});
