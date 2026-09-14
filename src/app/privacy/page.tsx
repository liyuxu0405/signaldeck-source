import type { Metadata } from "next";

export const metadata: Metadata = { title: "隐私政策", description: "SignalDeck 隐私政策与数据处理说明。" };

export default function PrivacyPage() {
  return <LegalPage title="隐私政策" updated="2026-09-14" sections={[
    ["我们处理的数据", "现场检测会在服务器内存中临时使用你提交的接口地址、模型名与 API Key 发起请求。API Key 不写入公开报告、广告统计或站长资料。检测结果只有在你主动点击公开后才成为公开报告。"],
    ["账号与站长资料", "注册时保存邮箱、密码哈希、会话和站点申请。域名认领会保存验证令牌及验证时间。我们不应保存明文密码。"],
    ["商业统计", "商业展示记录活动、位置、页面、时间以及随机事件 ID，用于计算曝光、点击和 CTR。当前实现不保存完整 IP 地址、完整来源 URL 或广告画像。"],
    ["保存期限", "会话默认保存 14 天；广告事件默认保存 180 天；公开检测报告作为可复核证据长期保存，除非因安全、法律或有效删除请求移除。"],
    ["第三方服务", "站点托管可能使用 Cloudflare；点击外部来源、GitHub 或广告链接后，将适用对应第三方的隐私政策。"],
    ["删除与联系", "账号、站点资料或公开报告涉及个人数据时，可通过商务页邮箱提交删除请求。我们会核验身份和域名所有权后处理。"],
  ]} />;
}

function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: [string, string][] }) {
  return <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6"><p className="text-sm text-[#176b5b]">最后更新：{updated}</p><h1 className="mt-3 text-4xl font-bold">{title}</h1><div className="mt-10 space-y-8">{sections.map(([heading, text]) => <section key={heading}><h2 className="text-xl font-bold">{heading}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{text}</p></section>)}</div></main>;
}