const HOURS_8 = 8 * 60 * 60 * 1000;

export const isProduction = process.env.NODE_ENV === "production";
export const demoFallbackEnabled = process.env.ENABLE_DEMO_FALLBACK !== "false";

const withoutTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "";

export const appUrl = withoutTrailingSlash(process.env.APP_URL || vercelProductionUrl || vercelUrl || "https://clarifi-mu.vercel.app");

export const jwtCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProduction,
  maxAge: HOURS_8,
  path: "/"
};

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProduction,
  maxAge: HOURS_8
};

const configuredOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => withoutTrailingSlash(origin.trim()))
  .filter(Boolean);

export const allowedOrigins = new Set([
  appUrl,
  vercelUrl,
  vercelProductionUrl,
  "https://clarifi-mu.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...configuredOrigins
].filter(Boolean));

export const corsOrigin = (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
  if (!origin) return callback(null, true);
  if (!isProduction) return callback(null, true);
  return callback(null, allowedOrigins.has(withoutTrailingSlash(origin)));
};

const hasStrongSecret = (value = "") => value.length >= 32 && !/clarifi-dev|replace-with/i.test(value);

export const sessionMode = () => {
  if (process.env.REDIS_URL) return "redis";
  if (isProduction) return "jwt-only";
  return "memory-dev";
};

export const deploymentChecks = () => {
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
  const hasRedis = Boolean(process.env.REDIS_URL);
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  const hasS3 =
    Boolean(process.env.S3_BUCKET) &&
    Boolean(process.env.S3_ACCESS_KEY_ID) &&
    Boolean(process.env.S3_SECRET_ACCESS_KEY);
  const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const authSecretsReady = !isProduction || (hasStrongSecret(process.env.JWT_SECRET) && hasStrongSecret(process.env.SESSION_SECRET));

  const checks = [
    {
      name: "openai",
      ready: hasOpenAi || demoFallbackEnabled,
      mode: hasOpenAi ? "live" : demoFallbackEnabled ? "demo-fallback" : "missing"
    },
    {
      name: "auth-secrets",
      ready: authSecretsReady,
      mode: authSecretsReady ? "ready" : "weak-or-missing"
    },
    {
      name: "sessions",
      ready: true,
      mode: sessionMode()
    },
    {
      name: "postgres",
      ready: true,
      mode: hasDatabase ? "configured" : "not-configured"
    },
    {
      name: "redis",
      ready: hasRedis || sessionMode() === "jwt-only" || sessionMode() === "memory-dev",
      mode: hasRedis ? "configured" : "not-configured"
    },
    {
      name: "document-storage",
      ready: true,
      mode: hasBlob ? "vercel-blob" : hasS3 ? "s3" : "not-configured"
    }
  ];

  const blocking = checks.filter((check) => !check.ready);
  const optionalMissing = checks.filter((check) => check.mode === "not-configured");

  return {
    status: blocking.length > 0 ? "misconfigured" : optionalMissing.length > 0 ? "degraded" : "ready",
    appUrl,
    environment: isProduction ? "production" : "development",
    checks
  };
};
