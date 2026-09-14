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
  pending: boolean;
};

export function buildStationBoard(reports: ReportIndexItem[]): { ranked: RankedStation[]; pending: RankedStation[] } {
  const latest = new Map<string, ReportIndexItem>();
  for (const report of reports) {
    const current = latest.get(report.host);
    if (!current || report.createdAt > current.createdAt) latest.set(report.host, report);
  }

  const ranked: RankedStation[] = [];
  const pending: RankedStation[] = [];
  const covered = new Set<string>();

  for (const station of catalogStations) {
    const host = hostFromEndpoint(station.endpoint) || station.domain;
    covered.add(host);
    const report = latest.get(host);
    const row: RankedStation = {
      name: station.name,
      domain: host,
      endpoint: station.endpoint,
      protocol: report?.protocol ?? station.protocol,
      summary: station.summary,
      score: report?.score,
      verdict: report?.verdict,
      reportId: report?.id,
      pending: !report,
    };
    if (report) ranked.push(row);
    else pending.push(row);
  }

  for (const [host, report] of latest) {
    if (covered.has(host)) continue;
    ranked.push({
      name: host,
      domain: host,
      protocol: report.protocol,
      score: report.score,
      verdict: report.verdict,
      reportId: report.id,
      pending: false,
    });
  }

  ranked.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.domain.localeCompare(b.domain));
  return { ranked, pending };
}
