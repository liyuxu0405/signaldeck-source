import Link from "next/link";
import { stationDisplayName, stationLogoUrl, stationSlug } from "@/lib/catalog";
import { StationIdentity } from "@/components/station-identity";
import type { ReportHostGroup } from "@/lib/report-groups";

export function ReportList({ groups }: { groups: ReportHostGroup[] }) {
  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {groups.map((group) => (
        <div key={group.host} className="grid gap-4 px-4 py-5 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-5">
          <div>
            <Link href={`/reports/${stationSlug(group.host)}`} className="inline-flex max-w-full hover:text-[#176b5b]"><StationIdentity compact name={stationDisplayName(group.host)} domain={group.host} logoUrl={stationLogoUrl(group.host)} /></Link>
            <span className="mt-2 block text-xs text-slate-500">{group.protocols.join(" / ")} · 最近检测 {new Date(group.latestAt).toLocaleString("zh-CN")}</span>
          </div>
          <Link href={`/reports/${stationSlug(group.host)}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
            {group.reportCount} 次检测
          </Link>
          <span className="text-sm font-semibold sm:min-w-36 sm:text-right">最新 {group.latestScore} · {group.latestVerdict}</span>
        </div>
      ))}
    </div>
  );
}
