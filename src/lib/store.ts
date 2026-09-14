import { toIndexItem, type PublicReport, type ReportIndexItem } from "./report";
import type { Listing } from "./marketplace";

export type UserRecord = { email: string; password: string; createdAt: string };

export type ListingApplication = {
  id: string;
  email: string;
  name: string;
  domain: string;
  summary: string;
  href: string;
  packageId: string;
  group?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type KvLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
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
  async delete(key) {
    memory.delete(key);
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

export async function getUser(email: string) {
  const raw = await (await getStore()).get(`user:${email}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserRecord;
  } catch {
    return null;
  }
}

export async function saveUser(user: UserRecord) {
  await (await getStore()).put(`user:${user.email}`, JSON.stringify(user));
}

export async function saveSession(id: string, email: string) {
  await (await getStore()).put(`session:${id}`, email, { expirationTtl: 60 * 60 * 24 * 14 });
}

export async function readSession(id: string) {
  if (!id || id.length > 80) return null;
  return (await getStore()).get(`session:${id}`);
}

export async function deleteSession(id: string) {
  await (await getStore()).delete(`session:${id}`);
}

export async function saveApplication(app: ListingApplication) {
  const store = await getStore();
  await store.put(`listing-app:${app.id}`, JSON.stringify(app));
  const ids = await readIdList(store, "listing-app-index");
  await store.put("listing-app-index", JSON.stringify([app.id, ...ids.filter((item) => item !== app.id)].slice(0, 200)));
}

export async function readApplication(id: string) {
  const raw = await (await getStore()).get(`listing-app:${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ListingApplication;
  } catch {
    return null;
  }
}

export async function listApplications(email?: string) {
  const store = await getStore();
  const ids = await readIdList(store, "listing-app-index");
  const rows = await Promise.all(ids.map(async (id) => {
    const raw = await store.get(`listing-app:${id}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ListingApplication;
    } catch {
      return null;
    }
  }));
  return rows.filter((item): item is ListingApplication => Boolean(item) && (!email || item.email === email));
}

export async function approvedOperatorListings(): Promise<Listing[]> {
  const apps = await listApplications();
  return apps.filter((item) => item.status === "approved").map((item) => ({
    id: item.id,
    name: item.name,
    domain: item.domain,
    summary: item.summary,
    href: item.href,
    featured: item.packageId === "featured" || item.packageId === "pro",
    pro: item.packageId === "pro",
    paid: true as const,
    ownerEmail: item.email,
  }));
}

async function readIdList(store: KvLike, key: string) {
  const raw = await store.get(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
