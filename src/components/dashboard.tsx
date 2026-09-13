"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowRight, BarChart3, CheckCircle2, CircleAlert, Clock3,
  ExternalLink, FileCheck2, Gauge, Menu, Radar, RefreshCw, Search,
  ShieldCheck, Sparkles, XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

type Provider = {
  id: number; name: string; domain: string; model: "Claude" | "OpenAI" | "Gemini";
  score: number; uptime: number; latency: number; checks: number;
  verdict: "稳定" | "观察" | "异常"; note: string; updated: string;
};

const providers: Provider[] = [
  { id: 1, name: "北辰接口", domain: "api.beichen.dev", model: "Claude", score: 96, uptime: 99.8, latency: 1.2, checks: 328, verdict: "稳定", note: "签名与流式响应连续通过，近 30 次未见协议漂移。", updated: "3 分钟前" },
  { id: 2, name: "云帆模型网关", domain: "gateway.yunfan.ai", model: "OpenAI", score: 93, uptime: 99.2, latency: 1.8, checks: 215, verdict: "稳定", note: "用量字段与工具调用行为一致，峰值时段有轻微抖动。", updated: "6 分钟前" },
  { id: 3, name: "松果 API", domain: "pinecone-api.cn", model: "Gemini", score: 89, uptime: 97.6, latency: 2.1, checks: 164, verdict: "稳定", note: "兼容接口字段完整，图片理解探针最近一次通过。", updated: "9 分钟前" },
  { id: 4, name: "折光中继", domain: "relay.prism.run", model: "Claude", score: 81, uptime: 94.3, latency: 3.4, checks: 92, verdict: "观察", note: "模型身份可信，但亚洲区域晚高峰延迟偏高。", updated: "12 分钟前" },
  { id: 5, name: "原点智算", domain: "api.originlab.cc", model: "OpenAI", score: 78, uptime: 91.8, latency: 4.2, checks: 118, verdict: "观察", note: "基础对话通过，工具调用参数偶发格式差异。", updated: "18 分钟前" },
  { id: 6, name: "轻舟节点", domain: "api.lightark.io", model: "Gemini", score: 54, uptime: 82.1, latency: 6.7, checks: 76, verdict: "异常", note: "近期出现连续超时，建议恢复稳定前谨慎用于生产。", updated: "22 分钟前" },
];
const tabs = ["全部", "Claude", "OpenAI", "Gemini"] as const;

function ScoreRing({ score }: { score: number }) {
  const color = score >= 90 ? "#19745f" : score >= 70 ? "#b07920" : "#b33c3c";
  return <div className="relative grid size-12 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #edf0f1 0deg)` }}><div className="grid size-9 place-items-center rounded-full bg-white text-sm font-bold" style={{ color }}>{score}</div></div>;
}

function StatusBadge({ verdict }: { verdict: Provider["verdict"] }) {
  const styles = verdict === "稳定" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : verdict === "观察" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700";
  return <Badge variant="outline" className={styles}>{verdict}</Badge>;
}

export function Dashboard() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("全部");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const visible = useMemo(() => providers.filter((item) => {
    const q = query.trim().toLowerCase();
    return (tab === "全部" || item.model === tab) && (!q || item.name.toLowerCase().includes(q) || item.domain.includes(q));
  }), [tab, query]);
  const refresh = () => { setFailed(false); setLoading(true); window.setTimeout(() => setLoading(false), 900); };

  return <div className="min-h-screen text-slate-900">
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="#" className="flex items-center gap-2.5" aria-label="SignalDeck 首页"><span className="grid size-9 place-items-center rounded-xl bg-[#176b5b] text-white"><Radar className="size-5" /></span><span className="text-lg font-bold tracking-tight">Signal<span className="text-[#176b5b]">Deck</span></span></a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex"><a className="text-slate-950" href="#ranking">监测榜</a><a href="#method">检测方法</a><a href="#about">透明度原则</a></nav>
        <div className="hidden items-center gap-2 md:flex"><Button variant="ghost" size="sm">提交站点</Button><Button size="sm">接入监测 <ArrowRight /></Button></div>
        <Sheet><SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="打开菜单" />}><Menu /></SheetTrigger><SheetContent><SheetTitle className="flex items-center gap-2"><Radar className="text-primary" /> SignalDeck</SheetTitle><div className="mt-8 grid gap-2">{["监测榜", "检测方法", "透明度原则", "提交站点"].map(item => <Button key={item} variant="ghost" className="justify-start">{item}</Button>)}<Button className="mt-3">接入监测</Button></div></SheetContent></Sheet>
      </div>
    </header>

    <main>
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20">
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_420px]">
          <div>
            <Badge variant="outline" className="mb-5 border-emerald-200 bg-white/70 px-3 py-1 text-[#176b5b]"><Activity className="mr-1.5 size-3.5" />每 10 分钟更新探测结果</Badge>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.12] tracking-[-0.04em] text-slate-950 sm:text-6xl">让每一次 API 选择<br /><span className="text-[#176b5b]">都有信号可循</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">持续验证模型身份、协议完整性、可用率与响应性能。用清晰的探测证据，帮助开发团队筛选更可靠的 AI 接口服务。</p>
            <div className="mt-8 flex flex-wrap gap-3"><Button size="lg" onClick={() => document.querySelector("#ranking")?.scrollIntoView({ behavior: "smooth" })}>查看实时榜单 <ArrowRight /></Button><Button size="lg" variant="outline" className="bg-white" onClick={() => document.querySelector("#method")?.scrollIntoView({ behavior: "smooth" })}>了解检测方法</Button></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_-35px_rgba(20,59,51,.35)]">
            <div className="flex items-center justify-between"><span className="text-sm font-semibold">全网探测状态</span><span className="flex items-center gap-1.5 text-xs text-emerald-700"><i className="size-2 rounded-full bg-emerald-500" />运行中</span></div>
            <div className="mt-5 grid grid-cols-3 gap-3">{[["128", "已收录服务"], ["36,842", "累计探测"], ["97.2%", "近24h完成率"]].map(([value, label]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><div className="text-lg font-bold tracking-tight sm:text-xl">{value}</div><div className="mt-1 text-[10px] text-slate-500 sm:text-[11px]">{label}</div></div>)}</div>
            <div className="mt-5 flex h-16 items-end gap-1" aria-label="24小时探测趋势图">{[34,45,38,52,48,67,61,74,69,76,66,83,78,89,70,80,86,92,78,88,83,96,89,94].map((h,i) => <div key={i} className="flex-1 rounded-t-sm bg-[#67ad9d]" style={{ height: `${h}%`, opacity: .45 + i / 50 }} />)}</div>
            <div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>24 小时前</span><span>现在</span></div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white/65 py-5"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-4 sm:grid-cols-4 sm:px-6">{[
        [ShieldCheck, "模型身份", "签名与行为指纹"], [FileCheck2, "协议完整", "字段、用量与流式"], [Gauge, "性能持续", "延迟与在线率"], [BarChart3, "结果可追溯", "探测时间与样本量"],
      ].map(([Icon,title,text]) => { const I = Icon as typeof ShieldCheck; return <div key={title as string} className="flex gap-3"><I className="mt-0.5 size-5 shrink-0 text-[#176b5b]" /><div><div className="text-sm font-semibold">{title as string}</div><div className="mt-0.5 text-xs text-slate-500">{text as string}</div></div></div>; })}</div></section>

      <section id="ranking" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><div className="text-sm font-semibold text-[#176b5b]">实时监测榜</div><h2 className="mt-2 text-3xl font-bold tracking-tight">找到适合你的稳定信号</h2><p className="mt-2 text-sm text-slate-500">演示数据，仅用于展示筛选、状态与证据体验。</p></div><Button variant="outline" className="w-fit bg-white" onClick={refresh} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />{loading ? "更新中…" : "刷新数据"}</Button></div>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">{tabs.map(item => <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${tab === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{item}</button>)}</div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索站点或域名" className="pl-9" /></div></div>
          {failed ? <div className="grid min-h-80 place-items-center p-8 text-center"><div><CircleAlert className="mx-auto size-9 text-red-500" /><h3 className="mt-3 font-semibold">数据暂时无法加载</h3><p className="mt-1 text-sm text-slate-500">请检查网络连接后重试。</p><Button className="mt-4" onClick={refresh}>重新加载</Button></div></div>
          : loading ? <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_,i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          : visible.length === 0 ? <div className="grid min-h-80 place-items-center p-8 text-center"><div><Search className="mx-auto size-9 text-slate-300" /><h3 className="mt-3 font-semibold">没有匹配的服务</h3><p className="mt-1 text-sm text-slate-500">试试其他名称，或切换模型分类。</p><Button variant="outline" className="mt-4" onClick={() => { setQuery(""); setTab("全部"); }}>清除筛选</Button></div></div>
          : <><div className="hidden grid-cols-[70px_1.8fr_1fr_1fr_1fr_130px] gap-4 border-b border-slate-100 px-5 py-3 text-xs font-medium text-slate-500 md:grid"><span>评分</span><span>服务商</span><span>在线率</span><span>延迟</span><span>样本</span><span>状态 / 证据</span></div><div className="divide-y divide-slate-100">{visible.map(item => <button key={item.id} onClick={() => setSelected(item)} className="grid w-full grid-cols-[52px_1fr] gap-4 p-4 text-left transition hover:bg-slate-50/80 md:grid-cols-[70px_1.8fr_1fr_1fr_1fr_130px] md:items-center md:px-5">
            <ScoreRing score={item.score} /><div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate font-semibold">{item.name}</span><Badge variant="secondary" className="text-[10px]">{item.model}</Badge></div><div className="mt-1 truncate text-xs text-slate-500">{item.domain} · {item.updated}</div></div>
            <div className="col-span-2 flex items-center justify-between md:col-span-1 md:block"><span className="text-xs text-slate-400 md:hidden">在线率</span><span className="font-semibold">{item.uptime}%</span></div>
            <div className="col-span-2 flex items-center justify-between md:col-span-1 md:block"><span className="text-xs text-slate-400 md:hidden">平均延迟</span><span className="font-semibold">{item.latency}s</span></div>
            <div className="col-span-2 flex items-center justify-between md:col-span-1 md:block"><span className="text-xs text-slate-400 md:hidden">有效样本</span><span className="text-sm">{item.checks} 次</span></div>
            <div className="col-span-2 flex items-center justify-between md:col-span-1"><StatusBadge verdict={item.verdict} /><span className="inline-flex items-center gap-1 text-xs font-medium text-[#176b5b]">查看证据 <ArrowRight className="size-3" /></span></div>
          </button>)}</div></>}
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500"><span>显示 {visible.length} / {providers.length} 个服务</span><button onClick={() => setFailed(true)} className="hover:text-slate-800">模拟错误状态</button></div>
        </div>
      </section>

      <section id="method" className="scroll-mt-20 bg-[#123f37] py-16 text-white sm:py-20"><div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.75fr_1.25fr]"><div><Badge className="bg-white/10 text-emerald-100">检测方法</Badge><h2 className="mt-5 text-3xl font-bold tracking-tight">不看宣传语，只看探测结果</h2><p className="mt-4 leading-7 text-emerald-50/70">每个维度均由独立探针重复验证，并对异常结果进行复测，降低偶发网络波动带来的误判。</p></div><div className="grid gap-4 sm:grid-cols-2">{[
        ["01","身份一致性","验证签名、模型行为与能力边界，识别错误路由。"], ["02","协议符合度","检查流式事件、usage、工具调用和错误结构。"], ["03","可用性采样","跨时段记录成功率、首字延迟与完整响应耗时。"], ["04","分数可解释","公开评分维度和更新时间，不以商业合作修改结论。"],
      ].map(([n,title,text]) => <div key={n} className="rounded-xl border border-white/10 bg-white/[.06] p-5"><span className="font-mono text-xs text-emerald-300">{n}</span><h3 className="mt-8 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-emerald-50/60">{text}</p></div>)}</div></div></section>

      <section id="about" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20"><div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-center"><div className="max-w-2xl"><div className="flex items-center gap-2 text-sm font-semibold text-[#176b5b]"><Sparkles className="size-4" />透明度承诺</div><h2 className="mt-3 text-2xl font-bold">商业合作与检测结论严格分离</h2><p className="mt-3 text-sm leading-6 text-slate-600">展示位会明确标注，所有评分、异常记录和状态判定仅由探测结果决定。服务密钥与原始请求内容不会公开。</p></div><Button variant="outline" className="shrink-0">阅读完整原则 <ExternalLink /></Button></div></div></section>
    </main>

    <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-2 font-semibold text-slate-800"><Radar className="size-4 text-[#176b5b]" />SignalDeck</div><p>独立监测，不构成采购或投资建议。</p><p>© 2026 SignalDeck</p></div></footer>

    <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}><DialogContent className="sm:max-w-lg">{selected && <><DialogHeader><DialogTitle className="flex items-center gap-3"><ScoreRing score={selected.score} /><span>{selected.name}<small className="mt-1 block font-normal text-slate-500">{selected.domain}</small></span></DialogTitle><DialogDescription className="sr-only">服务商监测证据详情</DialogDescription></DialogHeader><div className="mt-2 grid grid-cols-3 gap-3">{[["在线率",`${selected.uptime}%`],["平均延迟",`${selected.latency}s`],["有效样本",`${selected.checks}`]].map(([k,v]) => <div key={k} className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{k}</div><div className="mt-1 font-bold">{v}</div></div>)}</div><div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><span className="text-sm font-semibold">最近一次判定</span><StatusBadge verdict={selected.verdict} /></div><p className="mt-3 text-sm leading-6 text-slate-600">{selected.note}</p></div><div className="space-y-3 text-sm">{[["模型身份探针",true],["流式响应结构",true],["工具调用协议",selected.verdict !== "异常"],["连续可用性",selected.verdict === "稳定"]].map(([label,ok]) => <div key={label as string} className="flex items-center justify-between"><span>{label as string}</span>{ok ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-amber-600" />}</div>)}</div><div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 className="size-3.5" />最后更新：{selected.updated} · 结果基于模拟数据</div></>}</DialogContent></Dialog>
  </div>;
}
