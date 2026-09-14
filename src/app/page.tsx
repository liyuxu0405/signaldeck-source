import Link from "next/link";
import { AdBanner } from "@/components/ad-slot";
import { FeaturedListings } from "@/components/featured-listings";
import { PaidTopTen, SponsorBoard } from "@/components/paid-inventory";
import { LiveDashboard } from "@/components/live-dashboard";
import { adsFor, featuredListings } from "@/lib/marketplace";
import type { Protocol } from "@/lib/detection";
import { approvedOperatorListings } from "@/lib/store";
import { catalogStations } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ endpoint?: string; protocol?: string }>;
}) {
  const extras = await approvedOperatorListings();
  const query = await searchParams;
  const endpoint = query.endpoint && /^https:\/\//.test(query.endpoint) ? query.endpoint : "";
  const protocol = query.protocol === "anthropic" || query.protocol === "gemini" || query.protocol === "openai"
    ? query.protocol as Protocol
    : undefined;
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <AdBanner ad={adsFor("home-top")[0]} />
      </div>
      <LiveDashboard initialBaseUrl={endpoint} initialProtocol={protocol} />
      <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#176b5b]">Discover before you trust</p>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">先发现，再用自己的 Key 验证</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">目录已收录 {catalogStations.length} 个公开中转站。收录不是推荐，只有本站签发的报告才产生分数。</p>
            </div>
            <Link href="/directory" className="rounded-lg bg-[#176b5b] px-4 py-2 text-sm font-medium text-white">浏览中转站目录</Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[{ name: "Claude 中转站", value: catalogStations.filter((item) => item.protocols.includes("anthropic")).length, href: "/directory?protocol=anthropic" }, { name: "OpenAI 中转站", value: catalogStations.filter((item) => item.protocols.includes("openai")).length, href: "/directory?protocol=openai" }, { name: "Gemini 中转站", value: catalogStations.filter((item) => item.protocols.includes("gemini")).length, href: "/directory?protocol=gemini" }].map((item) => (
              <Link key={item.name} href={item.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-emerald-300 hover:bg-emerald-50/40"><span className="text-3xl font-bold">{item.value}</span><span className="mt-2 block text-sm font-medium">{item.name}</span><span className="mt-1 block text-xs text-slate-500">查看协议目录 →</span></Link>
            ))}
          </div>
        </section>
        <section className="grid gap-4 lg:grid-cols-3">
          <Info title="Token 计费核对" text="比较流式与非流式 usage、输入输出 Token、缓存字段和异常来源字段，帮助发现明显的协议或计费偏差。" />
          <Info title="Agent 能力探针" text="深度模式覆盖工具调用和结构化输出，不只检查接口是否返回 200。" />
          <Info title="报告可复核" text="公开报告由服务端签发，商业合作不能上传自定义分数，也不能更改检测结论。" />
        </section>
        <AdBanner ad={adsFor("home-mid")[0]} />
        <SponsorBoard />
        <PaidTopTen />
        <FeaturedListings listings={featuredListings(extras)} />
      </div>
    </>
  );
}

function Info({ title, text }: { title: string; text: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>;
}
