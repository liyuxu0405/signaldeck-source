import { newPublishToken, toIndexItem, type PublicReport, type ReportIndexItem } from "./report";
import type { Listing } from "./marketplace";
import { campaignIsActive, validateCampaign, type CampaignRecord } from "./campaign";

export type UserRecord = { email: string; password: string; createdAt: string };

export type LeadRecord = {
  id: string;
  createdAt: string;
  name: string;
  contact: string;
  company: string;
  note: string;
  packageId: string;
};

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
  paidAt?: string;
  usdtAmount?: string;
  usdtMicro?: string;
  usdtTxHash?: string;
  verificationToken?: string;
  domainVerifiedAt?: string;
};

export type KvLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list?(options: { prefix?: string; cursor?: string }): Promise<{
    keys: Array<{ name: string }>;
    list_complete: boolean;
    cursor?: string;
  }>;
};

export type CommercialEvent = {
  kind: "impression" | "click";
  campaignId: string;
  placementId: string;
  eventId: string;
  occurredAt: string;
  path?: string;
};

export type CommercialMetricRow = {
  date: string;
  campaignId: string;
  placementId: string;
  impressions: number;
  clicks: number;
  ctr: number | null;
};

const REPORT_DRAFT_TTL = 60 * 15;
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
  async list(options) {
    return {
      keys: [...memory.keys()].filter((key) => key.startsWith(options.prefix ?? "")).map((name) => ({ name })),
      list_complete: true,
    };
  },
};

export async function getStore(): Promise<KvLike> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const kv = (ctx.env as { SIGNALDECK?: KvLike }).SIGNALDECK;
    if (kv) {
      return {
        get: (key) => kv.get(key),
        put: (key, value, options) => kv.put(key, value, options),
        delete: async (key) => {
          if (typeof kv.delete === "function") await kv.delete(key);
        },
        list: kv.list ? (options) => kv.list!(options) : undefined,
      };
    }
  } catch {
    /* next dev 无 Worker 绑定，使用进程内存储 */
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Cloudflare KV 未绑定，无法保存商务线索");
  }
  return memoryStore;
}

export async function saveReport(report: PublicReport, target?: KvLike) {
  const store = target ?? await getStore();
  await store.put(`report:${report.id}`, JSON.stringify(report));
  const current = await readIndex(store);
  await store.put(INDEX_KEY, JSON.stringify(mergeReportIndex(toIndexItem(report), current)));
}

export async function readReport(id: string, target?: KvLike) {
  if (!/^[a-z0-9]{8,20}$/.test(id)) return null;
  const store = target ?? await getStore();
  const raw = await store.get(`report:${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicReport;
  } catch {
    return null;
  }
}

export function mergeReportIndex(report: ReportIndexItem, current: ReportIndexItem[]) {
  const perHost = new Map<string, number>();
  return [report, ...current.filter((item) => item.id !== report.id)]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((item) => {
      const count = perHost.get(item.host) ?? 0;
      if (count >= 30) return false;
      perHost.set(item.host, count + 1);
      return true;
    })
    .slice(0, 1_000);
}

async function reportDraftKey(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `report-draft:${hash}`;
}

export async function saveReportDraft(report: PublicReport, target?: KvLike) {
  const token = newPublishToken();
  const store = target ?? await getStore();
  await store.put(await reportDraftKey(token), JSON.stringify(report), { expirationTtl: REPORT_DRAFT_TTL });
  return token;
}

export async function readReportDraft(token: string, target?: KvLike) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const store = target ?? await getStore();
  const raw = await store.get(await reportDraftKey(token));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicReport;
  } catch {
    return null;
  }
}

export async function publishReportDraft(token: string, target?: KvLike) {
  const store = target ?? await getStore();
  const report = await readReportDraft(token, store);
  if (!report) return null;
  await saveReport(report, store);
  return report;
}

export async function listRecentReports() {
  return readIndex(await getStore());
}

export async function saveLead(payload: Omit<LeadRecord, "id" | "createdAt">): Promise<LeadRecord> {
  const store = await getStore();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record: LeadRecord = { id, createdAt: new Date().toISOString(), ...payload };
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
  return record;
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
      return JSON.parse(item) as LeadRecord;
    } catch {
      return null;
    }
  }));
  return rows.filter((item): item is LeadRecord => item !== null);
}

export async function recordAffiliateClick(slug: string) {
  const store = await getStore();
  const key = `${CLICK_PREFIX}${slug}`;
  const current = Number(await store.get(key) ?? "0");
  await store.put(key, String(Number.isFinite(current) ? current + 1 : 1));
}

const commercialIdPattern = /^[a-z0-9][a-z0-9._-]{1,79}$/;

export async function recordCommercialEvent(event: CommercialEvent, target?: KvLike) {
  if (!commercialIdPattern.test(event.campaignId)
    || !commercialIdPattern.test(event.placementId)
    || !commercialIdPattern.test(event.eventId)) {
    throw new Error("商业归因参数无效");
  }
  const timestamp = Date.parse(event.occurredAt);
  if (!Number.isFinite(timestamp)) throw new Error("商业归因时间无效");
  const normalized = { ...event, occurredAt: new Date(timestamp).toISOString(), path: event.path?.slice(0, 160) };
  const date = normalized.occurredAt.slice(0, 10);
  const store = target ?? await getStore();
  const key = `metric:v1:${date}:${event.kind}:${event.campaignId}:${event.placementId}:${event.eventId}`;
  await store.put(key, JSON.stringify(normalized), { expirationTtl: 60 * 60 * 24 * 180 });
}

export async function listCommercialMetrics(
  range: { from: string; to: string },
  target?: KvLike,
): Promise<CommercialMetricRow[]> {
  const store = target ?? await getStore();
  if (!store.list) return [];
  const rows = new Map<string, CommercialMetricRow>();
  let cursor: string | undefined;
  do {
    const page = await store.list({ prefix: "metric:v1:", cursor });
    const events = await Promise.all(page.keys.map(async ({ name }) => {
      const raw = await store.get(name);
      if (!raw) return null;
      try { return JSON.parse(raw) as CommercialEvent; } catch { return null; }
    }));
    for (const event of events) {
      if (!event) continue;
      const date = event.occurredAt.slice(0, 10);
      if (date < range.from || date > range.to) continue;
      const key = `${date}:${event.campaignId}:${event.placementId}`;
      const row = rows.get(key) ?? {
        date,
        campaignId: event.campaignId,
        placementId: event.placementId,
        impressions: 0,
        clicks: 0,
        ctr: null,
      };
      if (event.kind === "impression") row.impressions += 1;
      else row.clicks += 1;
      rows.set(key, row);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return [...rows.values()].map((row) => ({
    ...row,
    ctr: row.impressions ? Number((row.clicks / row.impressions).toFixed(4)) : null,
  })).sort((a, b) => b.date.localeCompare(a.date) || a.campaignId.localeCompare(b.campaignId));
}

export async function consumeRateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowSeconds: number,
  target?: KvLike,
  now = Date.now(),
) {
  if (!/^[a-z0-9-]{1,40}$/.test(scope) || !identity || limit < 1 || windowSeconds < 1) return false;
  const store = target ?? await getStore();
  const window = Math.floor(now / (windowSeconds * 1_000));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const key = `rate:v1:${scope}:${window}:${hash}`;
  const current = Number(await store.get(key) ?? "0");
  if (Number.isFinite(current) && current >= limit) return false;
  await store.put(key, String(Number.isFinite(current) ? current + 1 : 1), {
    expirationTtl: Math.max(60, windowSeconds * 2),
  });
  return true;
}

export async function saveCampaign(campaign: CampaignRecord, target?: KvLike) {
  const record = validateCampaign(campaign);
  const store = target ?? await getStore();
  await store.put(`campaign:${record.id}`, JSON.stringify(record));
  const ids = await readIdList(store, "campaign-index");
  await store.put("campaign-index", JSON.stringify([record.id, ...ids.filter((id) => id !== record.id)].slice(0, 500)));
  return record;
}

export async function readCampaign(id: string, target?: KvLike) {
  if (!/^[a-z0-9][a-z0-9._-]{1,79}$/.test(id)) return null;
  const raw = await (target ?? await getStore()).get(`campaign:${id}`);
  if (!raw) return null;
  try { return validateCampaign(JSON.parse(raw) as CampaignRecord); } catch { return null; }
}

export async function listCampaigns(target?: KvLike) {
  const store = target ?? await getStore();
  const ids = await readIdList(store, "campaign-index");
  const rows = await Promise.all(ids.map((id) => readCampaign(id, store)));
  return rows.filter((item): item is CampaignRecord => item !== null);
}

export async function listActiveCampaigns(at = Date.now(), target?: KvLike) {
  return (await listCampaigns(target)).filter((campaign) => campaignIsActive(campaign, at));
}

async function readIndex(store: KvLike): Promise<ReportIndexItem[]> {
  const raw = await store.get(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ReportIndexItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 1_000) : [];
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
  return rows.filter((item): item is ListingApplication => item !== null && (!email || item.email === email));
}

export async function claimUsdtTx(txHash: string, applicationId: string) {
  const store = await getStore();
  const key = `usdt-tx:${txHash}`;
  const existing = await store.get(key);
  if (existing && existing !== applicationId) return false;
  await store.put(key, applicationId);
  return true;
}

export function listingIsLive(item: ListingApplication) {
  return item.status === "approved" && Boolean(item.paidAt);
}

export async function approvedOperatorListings(): Promise<Listing[]> {
  const apps = await listApplications();
  return apps.filter(listingIsLive).map((item) => ({
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
