import type { Protocol } from "./detection";

export type CatalogStation = {
  id: string;
  name: string;
  domain: string;
  endpoint?: string;
  protocol: Protocol;
  protocols: Protocol[];
  summary: string;
  kind: "official" | "platform" | "relay";
  sourceLabel: string;
  sourceUrl: string;
  websiteUrl?: string;
  logoUrl?: string;
};

const OFFICIAL_SOURCE = "公开官方文档";
const VERIDROP_SOURCE = "VeriDrop 公开目录";

export const officialReferenceStations: CatalogStation[] = [
  { id: "openai", name: "OpenAI 官方 API", domain: "api.openai.com", endpoint: "https://api.openai.com/v1", protocol: "openai", protocols: ["openai"], summary: "OpenAI 官方 Chat Completions 接口，可作为兼容协议基准。", kind: "official", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://platform.openai.com/docs/api-reference" },
  { id: "anthropic", name: "Anthropic 官方 API", domain: "api.anthropic.com", endpoint: "https://api.anthropic.com", protocol: "anthropic", protocols: ["anthropic"], summary: "Anthropic 官方 Messages 接口，可作为 Claude 协议基准。", kind: "official", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://docs.anthropic.com/en/api/messages" },
  { id: "openrouter", name: "OpenRouter", domain: "openrouter.ai", endpoint: "https://openrouter.ai/api/v1", protocol: "openai", protocols: ["openai"], summary: "多模型聚合平台，提供 OpenAI 兼容入口。", kind: "platform", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://openrouter.ai/docs/api/reference/overview" },
  { id: "groq", name: "Groq", domain: "api.groq.com", endpoint: "https://api.groq.com/openai/v1", protocol: "openai", protocols: ["openai"], summary: "Groq 官方 OpenAI 兼容推理网关。", kind: "platform", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://console.groq.com/docs/openai" },
  { id: "together", name: "Together AI", domain: "api.together.xyz", endpoint: "https://api.together.xyz/v1", protocol: "openai", protocols: ["openai"], summary: "开源模型托管与 OpenAI 兼容 API。", kind: "platform", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://docs.together.ai/docs/openai-api-compatibility" },
  { id: "fireworks", name: "Fireworks AI", domain: "api.fireworks.ai", endpoint: "https://api.fireworks.ai/inference/v1", protocol: "openai", protocols: ["openai"], summary: "Fireworks 官方 OpenAI 兼容推理入口。", kind: "platform", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://docs.fireworks.ai/tools-sdks/openai-compatibility" },
  { id: "deepseek", name: "DeepSeek 官方 API", domain: "api.deepseek.com", endpoint: "https://api.deepseek.com/v1", protocol: "openai", protocols: ["openai"], summary: "DeepSeek 官方 OpenAI 兼容接口。", kind: "official", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://api-docs.deepseek.com/" },
  { id: "siliconflow", name: "硅基流动", domain: "api.siliconflow.cn", endpoint: "https://api.siliconflow.cn/v1", protocol: "openai", protocols: ["openai"], summary: "国内多模型推理平台与兼容网关。", kind: "platform", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://docs.siliconflow.cn/" },
  { id: "moonshot", name: "Moonshot / Kimi", domain: "api.moonshot.cn", endpoint: "https://api.moonshot.cn/v1", protocol: "openai", protocols: ["openai"], summary: "月之暗面官方 OpenAI 兼容接口。", kind: "official", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://platform.moonshot.cn/docs/intro" },
  { id: "zhipu", name: "智谱开放平台", domain: "open.bigmodel.cn", endpoint: "https://open.bigmodel.cn/api/paas/v4", protocol: "openai", protocols: ["openai"], summary: "GLM 系列模型开放平台。", kind: "official", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://open.bigmodel.cn/dev/api" },
  { id: "dashscope", name: "阿里云百炼", domain: "dashscope.aliyuncs.com", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", protocol: "openai", protocols: ["openai"], summary: "通义模型兼容模式入口。", kind: "official", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope" },
  { id: "hunyuan", name: "腾讯混元", domain: "api.hunyuan.cloud.tencent.com", endpoint: "https://api.hunyuan.cloud.tencent.com/v1", protocol: "openai", protocols: ["openai"], summary: "腾讯混元 OpenAI 兼容接口。", kind: "official", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://cloud.tencent.com/document/product/1729" },
  { id: "minimax", name: "MiniMax", domain: "api.minimax.chat", endpoint: "https://api.minimax.chat/v1", protocol: "openai", protocols: ["openai"], summary: "MiniMax 开放平台 API。", kind: "official", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://platform.minimaxi.com/document" },
  { id: "stepfun", name: "阶跃星辰", domain: "api.stepfun.com", endpoint: "https://api.stepfun.com/v1", protocol: "openai", protocols: ["openai"], summary: "StepFun 官方兼容接口。", kind: "official", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://platform.stepfun.com/docs" },
  { id: "mistral", name: "Mistral AI", domain: "api.mistral.ai", endpoint: "https://api.mistral.ai/v1", protocol: "openai", protocols: ["openai"], summary: "Mistral 官方 API。", kind: "official", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://docs.mistral.ai/api/" },
  { id: "xai", name: "xAI", domain: "api.x.ai", endpoint: "https://api.x.ai/v1", protocol: "openai", protocols: ["openai"], summary: "Grok 官方兼容接口。", kind: "official", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://docs.x.ai/docs/api-reference" },
  { id: "huggingface", name: "Hugging Face Router", domain: "router.huggingface.co", endpoint: "https://router.huggingface.co/v1", protocol: "openai", protocols: ["openai"], summary: "Hugging Face 推理路由。", kind: "platform", sourceLabel: OFFICIAL_SOURCE, sourceUrl: "https://huggingface.co/docs/inference-providers/index" },
];

const relayRows: Array<[string, Protocol[], string]> = [
  ["api.cheaperinference.com", ["openai", "anthropic"], "Cheaper Inference 的 API 网关，提供 OpenAI 与 Anthropic 兼容接口。"],
  ["omniakey.com", ["openai", "anthropic"], "多模型中转站，公开目录显示支持 OpenAI 与 Claude 协议。"],
  ["api.koozhan.com", ["openai", "anthropic"], "公开目录中的多协议中转站。"],
  ["api.xiaoxuapi.com", ["openai", "anthropic", "gemini"], "公开目录中的 Claude、OpenAI、Gemini 多协议中转站。"],
  ["wawazz.xyz", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["passion8.cc", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["api.aicodemirror.ai", ["openai", "anthropic"], "面向开发工具场景的公开收录中转站。"],
  ["relaybases.com", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["laysoai.com", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["codex666ai.com", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["api.999555999.com", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["yomiapi.com", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["code28.ccwu.cc", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["jizhiapi.site", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["modelflare.dev", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["modelsell.com", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["api.sublyx.org", ["openai", "anthropic"], "公开目录中的 OpenAI 与 Claude 中转站。"],
  ["worink.com", ["openai", "anthropic"], "公开目录中的 OpenAI 与 Claude 中转站。"],
  ["fengchao-api.com", ["openai"], "公开目录中的 OpenAI 兼容中转站。"],
  ["ssnaiyun.com", ["openai", "anthropic"], "公开目录中的 OpenAI 与 Claude 中转站。"],
  ["wawapi.top", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["dasuapi.com", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["api.unilink.work", ["openai", "anthropic"], "公开目录中的 OpenAI 与 Claude 中转站。"],
  ["gwlink.cc", ["openai", "anthropic"], "公开目录中的 OpenAI 与 Claude 中转站。"],
  ["newapi.dragon3api.com", ["openai", "anthropic"], "公开目录中的 OpenAI 与 Claude 中转站。"],
  ["moacode.org", ["anthropic"], "公开目录中的 Claude 协议中转站。"],
  ["mintpop.ai", ["openai", "anthropic"], "公开目录中的 OpenAI 与 Claude 中转站。"],
  ["anpin.ai", ["openai", "anthropic"], "公开目录中的 OpenAI 与 Claude 中转站。"],
  ["mxdapi.com", ["openai", "anthropic"], "公开目录中的 OpenAI 与 Claude 中转站。"],
  ["zivv.pro", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["api-top.com", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["x-llm.net", ["openai", "anthropic", "gemini"], "公开目录中的多协议中转站。"],
  ["topapi.io", ["openai", "anthropic", "gemini"], "公开分榜中的多协议中转站。"],
  ["88api.ai", ["openai", "anthropic", "gemini"], "公开分榜中的多协议中转站。"],
  ["bestapi.store", ["openai", "anthropic", "gemini"], "公开分榜中的多协议中转站。"],
  ["api.loomcode.cn", ["openai", "anthropic"], "公开分榜中的 OpenAI 与 Claude 中转站。"],
  ["api.hao.ai", ["openai", "anthropic"], "公开分榜中的 OpenAI 与 Claude 中转站。"],
  ["api.vectorengine.ai", ["openai", "anthropic", "gemini"], "公开分榜中的多协议中转站。"],
  ["api.api2cn.com", ["openai", "anthropic"], "公开分榜中的 OpenAI 与 Claude 中转站。"],
  ["api.krill-ai.com", ["openai", "anthropic", "gemini"], "公开分榜中的多协议中转站。"],
  ["jp-api.tokone.ai", ["openai", "gemini"], "公开分榜中的 OpenAI 与 Gemini 中转站。"],
  ["wolfai.top", ["openai", "anthropic", "gemini"], "公开分榜中的多协议中转站。"],
];

const relays: CatalogStation[] = relayRows.map(([domain, protocols, summary]) => ({
  id: stationSlug(domain),
  name: domain,
  domain,
  endpoint: guessRelayApiEndpoint(domain),
  protocol: protocols[0],
  protocols,
  summary,
  kind: "relay",
  sourceLabel: VERIDROP_SOURCE,
  sourceUrl: `https://veridrop.org/leaderboard/${domain}`,
}));

const stationProfiles: Record<string, Pick<CatalogStation, "name" | "websiteUrl" | "logoUrl">> = {
  "api.cheaperinference.com": {
    name: "Cheaper Inference",
    websiteUrl: "https://www.cheaperinference.com/",
    logoUrl: "/station-logos/api-cheaperinference-com.svg",
  },
  "omniakey.com": { name: "OmniaKey", websiteUrl: "https://omniakey.com/", logoUrl: "/station-logos/omniakey-com.svg" },
  "api.koozhan.com": { name: "酷站AI", websiteUrl: "https://koozhan.com/", logoUrl: "/station-logos/api-koozhan-com.svg" },
  "api.xiaoxuapi.com": { name: "Xiaoxu API", websiteUrl: "https://xiaoxuapi.com/", logoUrl: "/station-logos/api-xiaoxuapi-com.png" },
  "wawazz.xyz": { name: "WAWA ZZ API", websiteUrl: "https://wawazz.xyz/", logoUrl: "/station-logos/wawazz-xyz.png" },
  "passion8.cc": { name: "Passion8", websiteUrl: "https://passion8.cc/", logoUrl: "/station-logos/passion8-cc.png" },
  "api.aicodemirror.ai": { name: "AICodeMirror", websiteUrl: "https://www.aicodemirror.ai/", logoUrl: "/station-logos/api-aicodemirror-ai.ico" },
  "relaybases.com": { name: "RelayBases", websiteUrl: "https://relaybases.com/", logoUrl: "/station-logos/relaybases-com.svg" },
  "laysoai.com": { name: "LAYSO", websiteUrl: "https://laysoai.com/", logoUrl: "/station-logos/laysoai-com.png" },
  "codex666ai.com": { name: "Codex666AI", websiteUrl: "https://codex666ai.com/", logoUrl: "/station-logos/codex666ai-com.png" },
  "api.999555999.com": { name: "999555999", websiteUrl: "https://999555999.com/" },
  "yomiapi.com": { name: "Yomi API", websiteUrl: "https://yomiapi.com/", logoUrl: "/station-logos/yomiapi-com.png" },
  "code28.ccwu.cc": { name: "可乐AI", websiteUrl: "https://code28.ccwu.cc/", logoUrl: "/station-logos/code28-ccwu-cc.png" },
  "jizhiapi.site": { name: "极智API", websiteUrl: "https://jizhiapi.site/", logoUrl: "/station-logos/jizhiapi-site.svg" },
  "modelflare.dev": { name: "Modelflare", websiteUrl: "https://modelflare.dev/", logoUrl: "/station-logos/modelflare-dev.svg" },
  "modelsell.com": { name: "Modelsell", websiteUrl: "https://modelsell.com/", logoUrl: "/station-logos/modelsell-com.png" },
  "api.sublyx.org": { name: "Sublyx", websiteUrl: "https://sublyx.org/", logoUrl: "/station-logos/api-sublyx-org.ico" },
  "worink.com": { name: "Worink", websiteUrl: "https://worink.com/", logoUrl: "/station-logos/worink-com.jpg" },
  "fengchao-api.com": { name: "蜂巢API", websiteUrl: "https://fengchao-api.com/", logoUrl: "/station-logos/fengchao-api-com.svg" },
  "ssnaiyun.com": { name: "SSN AI", websiteUrl: "https://ssnaiyun.com/", logoUrl: "/station-logos/ssnaiyun-com.png" },
  "wawapi.top": { name: "WawAPI", websiteUrl: "https://wawapi.top/", logoUrl: "/station-logos/wawapi-top.png" },
  "dasuapi.com": { name: "Dasu API", websiteUrl: "https://dasuapi.com/", logoUrl: "/station-logos/dasuapi-com.png" },
  "api.unilink.work": { name: "AutoRouter", websiteUrl: "https://www.unilink.work/", logoUrl: "/station-logos/api-unilink-work.png" },
  "gwlink.cc": { name: "GWLink", websiteUrl: "https://gwlink.cc/", logoUrl: "/station-logos/gwlink-cc.png" },
  "newapi.dragon3api.com": { name: "Dragon3 API", websiteUrl: "https://dragon3api.com/", logoUrl: "/station-logos/newapi-dragon3api-com.png" },
  "moacode.org": { name: "Moacode", websiteUrl: "https://moacode.org/", logoUrl: "/station-logos/moacode-org.png" },
  "mintpop.ai": { name: "MintPop", websiteUrl: "https://mintpop.ai/", logoUrl: "/station-logos/mintpop-ai.png" },
  "anpin.ai": { name: "AnPin AI", websiteUrl: "https://anpin.ai/", logoUrl: "/station-logos/anpin-ai.jpg" },
  "mxdapi.com": { name: "模型岛", websiteUrl: "https://mxdapi.com/", logoUrl: "/station-logos/mxdapi-com.png" },
  "zivv.pro": { name: "Zivv", websiteUrl: "https://zivv.pro/", logoUrl: "/station-logos/zivv-pro.jpg" },
  "api-top.com": { name: "Top-API", websiteUrl: "https://api-top.com/", logoUrl: "/station-logos/api-top-com.png" },
  "x-llm.net": { name: "X-LLM", websiteUrl: "https://x-llm.net/", logoUrl: "/station-logos/x-llm-net.ico" },
  "topapi.io": { name: "TopAPI", websiteUrl: "https://topapi.io/", logoUrl: "/station-logos/topapi-io.png" },
  "88api.ai": { name: "88API", websiteUrl: "https://88api.ai/", logoUrl: "/station-logos/88api-ai.png" },
  "bestapi.store": { name: "BestApi", websiteUrl: "https://bestapi.store/", logoUrl: "/station-logos/bestapi-store.png" },
  "api.loomcode.cn": { name: "LoomCode", websiteUrl: "https://loomcode.cn/", logoUrl: "/station-logos/api-loomcode-cn.svg" },
  "api.hao.ai": { name: "HaoAI", websiteUrl: "https://hao.ai/", logoUrl: "/station-logos/api-hao-ai.png" },
  "api.vectorengine.ai": { name: "Vector Engine", websiteUrl: "https://vectorengine.ai/", logoUrl: "/station-logos/api-vectorengine-ai.png" },
  "api.api2cn.com": { name: "智惠 API", websiteUrl: "https://api.api2cn.com/" },
  "api.krill-ai.com": { name: "Krill AI", websiteUrl: "https://www.krill-code.com/", logoUrl: "/station-logos/api-krill-ai-com.ico" },
  "jp-api.tokone.ai": { name: "Tokone", websiteUrl: "https://tokone.ai/", logoUrl: "/station-logos/jp-api-tokone-ai.png" },
  "wolfai.top": { name: "WolfAI", websiteUrl: "https://wolfai.top/", logoUrl: "/station-logos/wolfai-top.png" },
};

/**
 * 初始目录只表明公开资料中出现过该站，不导入外站分数、在线率或认证结论。
 * 所有 SignalDeck 分数仍必须来自本站服务端签发的公开报告。
 */
export const catalogStations: CatalogStation[] = relays.map((station) => ({
  ...station,
  ...stationProfiles[station.domain],
}));

function stationByHost(host: string) {
  const key = host.toLowerCase();
  return catalogStations.find((station) => station.domain === key || hostFromEndpoint(station.endpoint ?? "") === key);
}

export function stationDisplayName(host: string) {
  return stationByHost(host)?.name ?? host;
}

export function stationLogoUrl(host: string) {
  return stationByHost(host)?.logoUrl;
}

export function stationSlug(domain: string) {
  return domain.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function findCatalogStation(slug: string) {
  return catalogStations.find((station) => station.id === slug || stationSlug(station.domain) === slug);
}

export function filterCatalogStations(options: { protocol?: Protocol; query?: string } = {}) {
  const query = options.query?.trim().toLowerCase() ?? "";
  return catalogStations.filter((station) => {
    if (options.protocol && !station.protocols.includes(options.protocol)) return false;
    if (query && !`${station.name} ${station.domain} ${station.summary} ${station.kind === "official" ? "官方" : ""}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function hostFromEndpoint(endpoint: string) {
  try {
    return new URL(endpoint).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** 官网域名预填检测地址时补 api. 子域；已是 api. 开头则不再重复。 */
export function guessRelayApiHost(domain: string) {
  const host = domain.trim().toLowerCase();
  if (!host) return "";
  if (host.startsWith("api.")) return host;
  return `api.${host}`;
}

export function guessRelayApiEndpoint(domain: string) {
  const host = guessRelayApiHost(domain);
  return host ? `https://${host}` : "";
}

export function catalogAliasHosts(station: Pick<CatalogStation, "domain" | "endpoint">) {
  const hosts = new Set<string>([station.domain.toLowerCase()]);
  const apiHost = station.endpoint ? hostFromEndpoint(station.endpoint) : guessRelayApiHost(station.domain);
  if (apiHost) hosts.add(apiHost);
  return [...hosts];
}
