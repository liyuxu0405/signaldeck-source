export async function workerSecret(name: string) {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const value = (ctx.env as Record<string, unknown> | undefined)?.[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  } catch {
    /* 本地 next dev 没有 Worker 绑定 */
  }
  return "";
}
