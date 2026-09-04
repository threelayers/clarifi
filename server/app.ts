import cookieParser from "cookie-parser";
import { RedisStore } from "connect-redis";
import cors from "cors";
import express from "express";
import session from "express-session";
import { z } from "zod";
import { allowedOrigins, corsOrigin, deploymentChecks, isProduction, sessionCookieOptions } from "./config.js";
import { clauses, profile } from "./domain.js";
import { asyncRoute } from "./middleware/asyncRoute.js";
import { authenticate } from "./middleware/auth.js";
import { getAppStore } from "./repositories/appStore.js";
import { aiRouter } from "./routes/ai.js";
import { authRouter } from "./routes/auth.js";
import { policiesRouter } from "./routes/policies.js";
import { sessionsRouter } from "./routes/sessions.js";
import { checkRedis, getRedis, readJson, rememberJson } from "./services/cache.js";

export const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), payment=(), usb=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
});
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "4mb" }));
app.use(cookieParser());
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const redis = getRedis();
if (redis) {
  app.use(session({
    name: "clarifi.sid",
    store: new RedisStore({ client: redis, prefix: "clarifi:sess:", ttl: 8 * 60 * 60 }),
    secret: process.env.SESSION_SECRET || "clarifi-dev-session",
    resave: false,
    saveUninitialized: false,
    cookie: sessionCookieOptions
  }));
} else if (!isProduction) {
  app.use(session({
    name: "clarifi.sid",
    secret: process.env.SESSION_SECRET || "clarifi-dev-session",
    resave: false,
    saveUninitialized: false,
    cookie: sessionCookieOptions
  }));
}

app.use(asyncRoute(authenticate));

app.get("/api/health", asyncRoute(async (_req, res) => {
  const [redisHealth, database] = await Promise.all([checkRedis(), getAppStore().health()]);
  res.json({
    ok: true,
    service: "clarifi-api",
    stack: ["Express", "PostgreSQL/Drizzle", "JWT/session", "PDF extraction", "Vercel Blob/S3"],
    readiness: deploymentChecks(),
    database,
    redis: redisHealth,
    profile,
    clauses: clauses.length,
    demoAccounts: 1,
    allowedOrigins: allowedOrigins.size
  });
}));

app.get("/api/ready", asyncRoute(async (_req, res) => {
  const [redisHealth, database] = await Promise.all([checkRedis(), getAppStore().health()]);
  const readiness = deploymentChecks();
  const statusCode = readiness.status === "misconfigured" || !database.ok ? 503 : 200;
  res.status(statusCode).json({ ok: statusCode === 200, readiness, database, redis: redisHealth });
}));

app.get("/api/policy", asyncRoute(async (_req, res) => {
  const cached = await readJson("clarifi:policy");
  if (cached) return res.json(cached);
  const payload = { profile, clauses };
  await rememberJson("clarifi:policy", payload, 3600);
  res.json(payload);
}));

app.use("/api/auth", authRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/policies", policiesRouter);
app.use("/api", aiRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: "Invalid request", issues: err.issues.map((issue) => issue.message) });
  }
  const message = err instanceof Error ? err.message : "Unexpected error";
  const status = /Only PDF|file too large/i.test(message) ? 400 : 500;
  if (!isProduction) console.error(err);
  res.status(status).json({ error: isProduction && status === 500 ? "The request could not be completed" : message });
});

declare module "express-session" {
  interface SessionData {
    user?: { id: string; email: string; name: string; role: "advisor" | "client" };
  }
}
