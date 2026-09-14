import Link from "next/link";
import { FeaturedListings } from "@/components/featured-listings";
import { LeadForm } from "@/components/lead-form";
import { Badge } from "@/components/ui/badge";
import {
  ads, businessContact, featuredListings, inventorySummary, monetizationPolicy, packages, paidRanks, sponsors,
} from "@/lib/marketplace";

export const metadata = {
  title: "商务合作｜SignalDeck",
  description: "购买检测页广告、精选收录与联盟跳转。付费不改变检测分数。",
};

export default function BusinessPage() {
  const inventory = inventorySummary();
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <Badge variant="outline">品牌合作</Badge>
      <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight">在可信检测场景中获得透明曝光</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{monetizationPolicy}</p>
      <p className="mt-2 text-sm text-slate-500">
        商务邮箱 <a className="text-[#176b5b] underline" href={`mailto:${businessContact.email}`}>{businessContact.email}</a>
        。表单线索请到 <Link className="text-[#176b5b]" href="/admin">/admin</Link> 查看，不会自动发邮件。
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="横幅广告" value={`${inventory.soldAds}/${inventory.adSlots} 已售`} />
        <Stat label="模型组赞助" value={`${inventory.sponsorSlots - inventory.vacantSponsors}/${inventory.sponsorSlots} 已售`} />
        <Stat label="品牌赞助专区" value={`${inventory.rankSlots - inventory.vacantRanks}/${inventory.rankSlots} 已售`} />
        <Stat label="空位可售" value={`${inventory.vacantAds + inventory.vacantSponsors + inventory.vacantRanks} 个`} />
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {packages.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-emerald-800">{item.audience}</div>
            <h2 className="mt-2 text-xl font-bold">{item.name}</h2>
            <div className="mt-1 text-lg font-semibold text-[#176b5b]">{item.price}</div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {item.perks.map((perk) => <li key={perk}>· {perk}</li>)}
            </ul>
          </article>
        ))}
      </div>

      <section id="inventory" className="mt-12 scroll-mt-24">
        <h2 className="text-2xl font-bold">当前库存</h2>
        <p className="mt-2 text-sm text-slate-500">空位会在首页直接显示招租条，方便自助询价。</p>
        <div className="mt-5 grid gap-3">
          {ads.map((ad) => (
            <div key={ad.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <div className="font-medium">{ad.id} · {ad.label}</div>
                <div className="text-xs text-slate-500">{ad.vacant ? "空位招租" : ad.partner}</div>
              </div>
              <Badge variant={ad.vacant ? "outline" : "secondary"}>{ad.vacant ? "可售" : "已售"}</Badge>
            </div>
          ))}
          {paidRanks.map((slot) => (
            <div key={slot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <div className="font-medium">{slot.id} · 品牌赞助第 {slot.rank} 席</div>
                <div className="text-xs text-slate-500">{slot.vacant ? "空位招租" : slot.partner}</div>
              </div>
              <Badge variant={slot.vacant ? "outline" : "secondary"}>{slot.vacant ? "可售" : "已售"}</Badge>
            </div>
          ))}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            模型组赞助共 {sponsors.length} 席，当前空位 {inventory.vacantSponsors}。详情见公开榜页的 S1–S10 网格。
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <LeadForm />
        <div className="space-y-4">
          <FeaturedListings listings={featuredListings()} />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            上线流程：注册站长账号或提交意向 → 确认素材与跳转 → 付款 → 人工开通。检测逻辑不会因付款改变。
            <div className="mt-3">
              <Link href="/" className="font-medium text-[#176b5b]">返回检测 →</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold">{value}</div>
    </div>
  );
}
