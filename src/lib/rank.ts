import { catalogStations, hostFromEndpoint } from "./catalog";
import type { ReportIndexItem } from "./report";

export type RankedStation = {
  name: string;
  domain: string;
  endpoint?: string;
  protocol?: string;
  summary?: string;
  score?: number;
  verdict?: string;
  reportId?: string;
  sampleCount?: number;
  latestScore?: number;
  lastCheckedAt?: string;
  pending: boolean;
};

export type RankingOptions = {
  now?: number;
  windowDays?: number;
  halfLifeDays?: number;
  maxSamples?: number;
};

export function calculateHistoricalScore(reports: ReportIndexItem[], options: RankingOptions = {}) {
  const now = options.now ?? Date.now();
  const windowDays = options.windowDays ?? 30;
  const halfLifeDays = options.halfLifeDays ?? 14;
  const maxSamples = options.maxSamples ?? 14;
  const cutoff = now - windowDays * 86_400_000;
  const daily = new Map<string, ReportIndexItem>();
  for (const report of [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const timestamp = Date.parse(report.createdAt);
    if (!Number.isFinite(timestamp) || timestamp < cutoff || timestamp > now + 300_000) continue;
    const day = report.createdAt.slice(0, 10);
    if (!daily.has(day)) daily.set(day, report);
  }
  const samples = [...daily.values()].slice(0, maxSamples);
  const latest = samples[0];
  if (!latest) return null;
  let total = 0;
  let weights = 0;
  for (const report of samples) {
    const ageDays = Math.max(0, (now - Date.parse(report.createdAt)) / 86_400_000);
    const weight = 0.5 ** (ageDays / halfLifeDays);
    total += report.score * weight;
    weights += weight;
  }
  return {
    score: Math.round(total / weights),
    sampleCount: samples.length,
    latest,
    oldestAt: samples.at(-1)!.createdAt,
  };
}

export function buildStationBoard(reports: ReportIndexItem[], options: RankingOptions = {}): { ranked: RankedStation[]; pending: RankedStation[] } {
  const grouped = new Map<string, ReportIndexItem[]>();
  for (const report of reports) {
    const host = report.host.toLowerCase();
    grouped.set(host, [...(grouped.get(host) ?? []), report]);
  }

  const ranked: RankedStation[] = [];
  const pending: RankedStation[] = [];
  const covered = new Set<string>();

  for (const station of catalogStations) {
    const host = hostFromEndpoint(station.endpoint) || station.domain;
    covered.add(host);
    const aggregate = calculateHistoricalScore(grouped.get(host) ?? [], options);
    const report = aggregate?.latest;
    const row: RankedStation = {
      name: station.name,
      domain: host,
      endpoint: station.endpoint,
      protocol: report?.protocol ?? station.protocol,
      summary: station.summary,
      score: aggregate?.score,
      verdict: report?.verdict,
      reportId: report?.id,
      sampleCount: aggregate?.sampleCount,
      latestScore: report?.score,
      lastCheckedAt: report?.createdAt,
      pending: !report,
    };
    if (report) ranked.push(row);
    else pending.push(row);
  }

  for (const [host, hostReports] of grouped) {
    if (covered.has(host)) continue;
    const aggregate = calculateHistoricalScore(hostReports, options);
    if (!aggregate) continue;
    const report = aggregate.latest;
    ranked.push({
      name: host,
      domain: host,
      protocol: report.protocol,
      score: aggregate.score,
      verdict: report.verdict,
      reportId: report.id,
      sampleCount: aggregate.sampleCount,
      latestScore: report.score,
      lastCheckedAt: report.createdAt,
      pending: false,
    });
  }

  ranked.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)
    || (b.sampleCount ?? 0) - (a.sampleCount ?? 0)
    || (b.lastCheckedAt ?? "").localeCompare(a.lastCheckedAt ?? "")
    || a.domain.localeCompare(b.domain));
  return { ranked, pending };
}
