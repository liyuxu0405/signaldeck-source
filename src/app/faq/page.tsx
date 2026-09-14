import Link from "next/link";

export const metadata = {
  title: "常见问题｜SignalDeck",
  description: "检测边界、公开报告、广告与站长账号说明。",
};

const faqs = [
  ["检测会保存 API Key 吗？", "不会。Key 只在当次服务端内存里使用，公开报告也会拒绝含密钥的字段。"],
  ["一共检查哪些项？", "标准模式覆盖连通性、协议结构、异源字段、模型字段、Token 交叉、流式一致性、指令遵循、结束原因、输出上限、流式形状、长上下文（可选）以及 Claude thinking signature（可选）。深度模式再加工具调用和结构化输出。"],
  ["thinking signature 是验签吗？", "不是。我们只检查 opaque signature 是否存在且长度合格，权重较高，但不持有 Anthropic 私钥做密码学验签。"],
  ["长上下文是 1M 官方验证吗？", "不是。那是可选水窗抽样，用来看更长输入的 usage 是否继续上升，不能当官方百万级账单证明。"],
  ["公开榜是买来的吗？", "不是。公开样本榜只汇总用户自愿公开的检测报告。付费 Top 10、模型组赞助和 PRO 是另一块，只买位置。"],
  ["怎么买广告或年费收录？", "可以走商务页留资，或注册站长账号提交申请。开通前需要人工确认付款与素材。"],
  ["为什么比某些站点更克制？", "OpenAI 没有可独立验证的模型签名；本地 tokenizer 也不当关键虚报证据。我们宁可少下结论，也不用不可复核的题库冒充模型身份。"],
];

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-4xl font-bold">常见问题</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">以下说明对应 SignalDeck 的实际实现，不是其他站点的题库或话术。</p>
      <div className="mt-10 space-y-6">
        {faqs.map(([q, a]) => (
          <section key={q} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">{q}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">{a}</p>
          </section>
        ))}
      </div>
      <p className="mt-8 text-sm text-slate-500">交流与反馈走 <Link className="text-[#176b5b]" href="https://github.com/liyuxu0405/signaldeck-source/issues">GitHub Issues</Link>。</p>
    </main>
  );
}
