import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CommercialLink } from "@/components/commercial-link";
import type { Listing } from "@/lib/marketplace";

export function FeaturedListings({ listings }: { listings: Listing[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="outline">付费精选</Badge>
          <h2 className="mt-3 text-lg font-bold">收录入口</h2>
          <p className="mt-1 text-sm text-slate-500">这里只展示购买了位置的服务商。检测分数来自公开报告，与是否付费无关。</p>
        </div>
        <Link href="/account" className="text-sm font-medium text-[#176b5b]">申请收录 →</Link>
      </div>
      {listings.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          赞助商专区暂无内容。付费展示与检测排名严格分离。
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {listings.map((item) => (
            <CommercialLink
              key={item.id}
              campaignId={item.id}
              placementId="featured"
              className="rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">{item.name}</div>
                <Badge variant="secondary">付费展示</Badge>
              </div>
              <div className="mt-1 text-xs text-slate-500">{item.domain}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
            </CommercialLink>
          ))}
        </div>
      )}
    </section>
  );
}
