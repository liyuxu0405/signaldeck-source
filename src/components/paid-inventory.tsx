import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { modelGroups, paidRanks, sponsorsFor, type Listing, type RankSlot, type SponsorSlot } from "@/lib/marketplace";

export function SponsorBoard() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <Badge variant="outline">模型组赞助 S1–S10</Badge>
      <h2 className="mt-3 text-lg font-bold">热门模型旁的付费位</h2>
      <p className="mt-1 text-sm text-slate-500">每组 10 个赞助位。空位招租；已售只买曝光，不改检测分数。</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {modelGroups.map((group) => (
          <div key={group.id} className="rounded-xl border border-slate-200 p-3">
            <div className="mb-3 font-semibold">{group.name}</div>
            <div className="grid grid-cols-5 gap-1.5">
              {sponsorsFor(group.id).map((slot) => <SponsorCell key={slot.id} slot={slot} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SponsorCell({ slot }: { slot: SponsorSlot }) {
  if (slot.vacant || !slot.href) {
    return (
      <Link href="/business#inventory" className="rounded-md border border-dashed border-emerald-300 bg-emerald-50/70 px-1 py-2 text-center text-[10px] text-emerald-800">
        {slot.id.split("-")[1]}
      </Link>
    );
  }
  return (
    <a href={slot.href} rel="sponsored nofollow" className="rounded-md border border-slate-200 px-1 py-2 text-center text-[10px] font-medium">
      {slot.partner ?? slot.id}
    </a>
  );
}

export function PaidTopTen() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <Badge variant="outline">付费 Top 10</Badge>
      <h2 className="mt-3 text-lg font-bold">展示排名，不是检测排名</h2>
      <p className="mt-1 text-sm text-slate-500">T1–T10 是付费位置。真实分数只出现在下方「公开样本榜」。</p>
      <ol className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
        {paidRanks.map((slot) => <RankRow key={slot.id} slot={slot} />)}
      </ol>
    </section>
  );
}

function RankRow({ slot }: { slot: RankSlot }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="font-mono text-xs text-slate-400">{slot.id}</span>
      {slot.vacant || !slot.href ? (
        <Link href="/business#inventory" className="text-[#176b5b]">第 {slot.rank} 名空位招租</Link>
      ) : (
        <a href={slot.href} rel="sponsored nofollow" className="font-medium">{slot.partner}</a>
      )}
    </li>
  );
}

export function ProBoard({ listings }: { listings: Listing[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <Badge variant="outline">PRO 认证</Badge>
      <h2 className="mt-3 text-lg font-bold">认证收录</h2>
      <p className="mt-1 text-sm text-slate-500">PRO 是付费标识。认证不等于高分。</p>
      {listings.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          暂无 PRO。站长登录后台提交资料，付款后人工开通。
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {listings.map((item) => (
            <a key={item.id} href={item.href} rel="sponsored nofollow" className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">{item.name}</div>
                <Badge>PRO</Badge>
              </div>
              <div className="mt-1 text-xs text-slate-500">{item.domain}</div>
              <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
