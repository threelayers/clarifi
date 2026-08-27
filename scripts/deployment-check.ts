const baseUrl = (process.env.DEPLOYMENT_URL || "https://clarifi-mu.vercel.app").replace(/\/$/, "");
const requireManagedServices = process.env.REQUIRE_MANAGED_SERVICES === "1";

async function getJson(path: string) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "follow" });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

async function main() {
  const page = await fetch(`${baseUrl}/ClariFi.dc.html`, { redirect: "follow" });
  if (!page.ok || !(await page.text()).includes("ClariFi")) {
    throw new Error("The production client entry point did not render ClariFi.");
  }

  const health = await getJson("/api/health");
  if (health.ok !== true) throw new Error("The API health check did not report ok=true.");
  if (requireManagedServices && (health.readiness as { status?: string })?.status !== "ready") {
    throw new Error("Managed-service readiness is degraded.");
  }

  const accounts = await getJson("/api/auth/demo-accounts");
  if (!Array.isArray(accounts.accounts) || accounts.accounts.length < 2) {
    throw new Error("Demo accounts are unavailable.");
  }

  console.log(`Deployment check passed for ${baseUrl}`);
  console.log(`Readiness: ${(health.readiness as { status?: string })?.status ?? "unknown"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
