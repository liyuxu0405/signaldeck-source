import { toIndexItem, type PublicReport, type ReportIndexItem } from "@/lib/report";

type KvLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

const REPORT_TTL = 60 * 60 * 24 * 90;
const INDEX_KEY = "report-index";
const CLICK_PREFIX = "aff-click:";
const memory = new Map<string, string>();

const memoryStore: KvLike = {
  async get(key) {
    return memory.get(key) ?? null;
  },
  async put(key, value) {
    memory.set(key, value);
  },
};

export async function getStore(): Promise<KvLike> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const kv = (ctx.env as { SIGNALDECK?: KvLike }).SIGNALDECK;
    if (kv) return kv;
  } catch {
    /* next dev 无 Worker 绑定，使用进程内存储 */
  }
  return memoryStore;
}

export async function saveReport(report: PublicReport) {
  const store = await getStore();
  await store.put(`report:${report.id}`, JSON.stringify(report), { expirationTtl: REPORT_TTL });
  const current = await readIndex(store);
  const next = [toIndexItem(report), ...current.filter((item) => item.id !== report.id)].slice(0, 40);
  await store.put(INDEX_KEY, JSON.stringify(next), { expirationTtl: REPORT_TTL });
}

export async function readReport(id: string) {
  if (!/^[a-z0-9]{8,20}$/.test(id)) return null;
  const store = await getStore();
  const raw = await store.get(`report:${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicReport;
  } catch {
    return null;
  }
}

export async function listRecentReports() {
  return readIndex(await getStore());
}

export async function saveLead(payload: Record<string, string>) {
  const store = await getStore();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record = { id, createdAt: new Date().toISOString(), ...payload };
  await store.put(`lead:${id}`, JSON.stringify(record), {
    expirationTtl: 60 * 60 * 24 * 180,
  });
  const raw = await store.get("lead-index");
  let index: string[] = [];
  try {
    index = raw ? JSON.parse(raw) as string[] : [];
  } catch {
    index = [];
  }
  if (!Array.isArray(index)) index = [];
  await store.put("lead-index", JSON.stringify([id, ...index].slice(0, 200)));
}

export async function listLeads() {
  const store = await getStore();
  const raw = await store.get("lead-index");
  let ids: string[] = [];
  try {
    ids = raw ? JSON.parse(raw) as string[] : [];
  } catch {
    ids = [];
  }
  if (!Array.isArray(ids)) return [];
  const rows = await Promise.all(ids.slice(0, 100).map(async (id) => {
    const item = await store.get(`lead:${id}`);
    if (!item) return null;
    try {
      return JSON.parse(item) as Record<string, string>;
    } catch {
      return null;
    }
  }));
  return rows.filter((item): item is Record<string, string> => Boolean(item));
}

export async function recordAffiliateClick(slug: string) {
  const store = await getStore();
  const key = `${CLICK_PREFIX}${slug}`;
  const current = Number(await store.get(key) ?? "0");
  await store.put(key, String(Number.isFinite(current) ? current + 1 : 1));
}

async function readIndex(store: KvLike): Promise<ReportIndexItem[]> {
  const raw = await store.get(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ReportIndexItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 40) : [];
  } catch {
    return [];
  }
}
