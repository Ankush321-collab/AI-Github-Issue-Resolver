import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const [key, ...rest] = trimmed.split("=");
    if (key === "DATABASE_URL") {
      databaseUrl = rest.join("=").trim().replace(/^"|"$/g, "");
      break;
    }
  }
}

export default {
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
};
