import "dotenv/config";
import { getAppStore } from "../repositories/appStore.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed PostgreSQL");
}

await getAppStore().ensureDemoData();
console.log("Seeded ClariFi demo users and session.");
