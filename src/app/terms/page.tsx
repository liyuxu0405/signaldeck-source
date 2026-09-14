import type { Metadata } from "next";

export const metadata: Metadata = { title: "服务条款与广告披露", description: "SignalDeck 服务条款、检测边界和广告披露。" };

export default function TermsPage() {
  const sections: [string, string][] = [
    ["服务性质", "SignalDeck 提供协议兼容、计费字段和能力探针，不是模型厂商、支付机构或中转站担保方。检测结果反映检测时点和给定配置，不保证未来可用性。"],
    ["使用者责任", "你应确保有权使用提交的 API Key 和接口，遵守服务商条款，不使用本站探测未授权内网、绕过访问控制或实施滥用。"],
    ["目录与评分", "目录收录只表明站点出现在公开资料中，不等于推荐。SignalDeck 不复制外部平台分数、在线率和认证结论；本站分数只来自服务端签发的公开报告。"],
    ["广告披露", "横幅、赞助专区、PRO 和精选收录会明确标注商业性质。付费不能购买分数、判定、检测通过或删除负面检测记录。商业链接可记录曝光和点击用于交付统计。"],
    ["风险提示", "中转站可能存在停服、改价、密钥泄露、数据处理和资金风险。用户应先小额测试并自行核验运营主体、退款规则、隐私政策及发票能力。"],
    ["内容纠错", "站点运营方可通过站长后台申请付费位置。发现域名、协议或来源错误，可通过商务页邮箱提交证据申请更正。"],
    ["服务变更", "我们可能因安全、法律、成本或技术原因限制检测、下架目录条目或调整功能。重大条款变化会更新本页日期。"],
  ];
  return <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6"><p className="text-sm text-[#176b5b]">最后更新：2026-09-14</p><h1 className="mt-3 text-4xl font-bold">服务条款与广告披露</h1><div className="mt-10 space-y-8">{sections.map(([heading, text]) => <section key={heading}><h2 className="text-xl font-bold">{heading}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{text}</p></section>)}</div></main>;
}