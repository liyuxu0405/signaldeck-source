import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

function applyDevVars() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".dev.vars"), "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq);
      if (process.env[key] === undefined) process.env[key] = line.slice(eq + 1);
    }
  } catch {
    /* 本地没有 .dev.vars 时跳过 */
  }
}

applyDevVars();

const nextConfig: NextConfig = {};

export default nextConfig;

initOpenNextCloudflareForDev();
