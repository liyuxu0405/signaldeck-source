import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { RankedStation } from "@/lib/rank";

export function StationBoard({ ranked, pending }: { ranked: RankedStation[]; pending: RankedStation[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <Badge variant="outline">免费导航</Badge>
      <h2 className="mt-3 text-lg font-bold">公开兼容网关</h2>
      <p className="mt-1 text-sm text-slate-500">
        来自各站公开文档的入口，免费展示。没有 API Key 就不能替他们跑检测，因此未测站点没有分数，也不使用外站的在线率。
      </p>

      <h3 className="mt-6 text-sm font-semibold text-slate-700">本站公开样本排名</h3>
      {ranked.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">还没有针对这些域名的公开报告。用户用自己的 Key 检测并公开后，才会出现名次。</p>
      ) : (
        <ol className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {ranked.map((item, index) => (
            <li key={item.domain} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="w-6 font-mono text-xs text-slate-400">{index + 1}</span>
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.domain}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{item.score} · {item.verdict}</span>
                {item.reportId && <Link href={`/r/${item.reportId}`} className="text-[#176b5b]">报告</Link>}
                {item.endpoint && (
                  <Link href={`/?endpoint=${encodeURIComponent(item.endpoint)}&protocol=${item.protocol ?? "openai"}`} className="text-[#176b5b]">
                    再测
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <h3 className="mt-8 text-sm font-semibold text-slate-700">待本站检测（{pending.length}）</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {pending.map((item) => (
          <div key={item.domain} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{item.name}</div>
                <div className="mt-1 text-xs text-slate-500">{item.domain}</div>
              </div>
              <Badge variant="outline">待检测</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
            <Link
              href={`/?endpoint=${encodeURIComponent(item.endpoint ?? "")}&protocol=${item.protocol ?? "openai"}`}
              className="mt-3 inline-block text-sm font-medium text-[#176b5b]"
            >
              用你的 Key 检测 →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
