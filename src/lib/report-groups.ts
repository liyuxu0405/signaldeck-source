import type { ReportIndexItem } from "./report";

export type ReportHostGroup = {
  host: string;
  reportCount: number;
  latestAt: string;
  latestScore: number;
  latestVerdict: string;
  protocols: string[];
  models: string[];
  reports: ReportIndexItem[];
};

export function groupReportsByHost(reports: ReportIndexItem[]): ReportHostGroup[] {
  const grouped = new Map<string, ReportIndexItem[]>();
  for (const report of reports) {
    const host = report.host.toLowerCase();
    grouped.set(host, [...(grouped.get(host) ?? []), report]);
  }
  return [...grouped.entries()].map(([host, values]) => {
    const sorted = [...values].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latest = sorted[0];
    return {
      host,
      reportCount: sorted.length,
      latestAt: latest.createdAt,
      latestScore: latest.score,
      latestVerdict: latest.verdict,
      protocols: [...new Set(sorted.map((report) => report.protocol))],
      models: [...new Set(sorted.map((report) => report.model))],
      reports: sorted,
    };
  }).sort((a, b) => b.latestAt.localeCompare(a.latestAt) || a.host.localeCompare(b.host));
}
