import type { Protocol } from "./detection";

export type CatalogStation = {
  id: string;
  name: string;
  domain: string;
  endpoint: string;
  protocol: Protocol;
  summary: string;
};

/** 公开文档中的兼容网关，供免费导航。不是 VeriDrop 目录，也不是本站检测结果。 */
export const catalogStations: CatalogStation[] = [
  { id: "openai", name: "OpenAI", domain: "api.openai.com", endpoint: "https://api.openai.com/v1", protocol: "openai", summary: "官方 Chat Completions。" },
  { id: "anthropic", name: "Anthropic", domain: "api.anthropic.com", endpoint: "https://api.anthropic.com", protocol: "anthropic", summary: "官方 Messages。" },
  { id: "openrouter", name: "OpenRouter", domain: "openrouter.ai", endpoint: "https://openrouter.ai/api/v1", protocol: "openai", summary: "多模型聚合，OpenAI 兼容。" },
  { id: "groq", name: "Groq", domain: "api.groq.com", endpoint: "https://api.groq.com/openai/v1", protocol: "openai", summary: "OpenAI 兼容推理网关。" },
  { id: "together", name: "Together AI", domain: "api.together.xyz", endpoint: "https://api.together.xyz/v1", protocol: "openai", summary: "开源模型托管。" },
  { id: "fireworks", name: "Fireworks", domain: "api.fireworks.ai", endpoint: "https://api.fireworks.ai/inference/v1", protocol: "openai", summary: "OpenAI 兼容推理。" },
  { id: "deepseek", name: "DeepSeek", domain: "api.deepseek.com", endpoint: "https://api.deepseek.com/v1", protocol: "openai", summary: "官方兼容接口。" },
  { id: "siliconflow", name: "硅基流动", domain: "api.siliconflow.cn", endpoint: "https://api.siliconflow.cn/v1", protocol: "openai", summary: "国内兼容网关。" },
  { id: "moonshot", name: "Moonshot / Kimi", domain: "api.moonshot.cn", endpoint: "https://api.moonshot.cn/v1", protocol: "openai", summary: "月之暗面官方兼容接口。" },
  { id: "zhipu", name: "智谱", domain: "open.bigmodel.cn", endpoint: "https://open.bigmodel.cn/api/paas/v4", protocol: "openai", summary: "GLM 开放平台。" },
  { id: "dashscope", name: "阿里云百炼", domain: "dashscope.aliyuncs.com", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", protocol: "openai", summary: "通义兼容模式。" },
  { id: "hunyuan", name: "腾讯混元", domain: "api.hunyuan.cloud.tencent.com", endpoint: "https://api.hunyuan.cloud.tencent.com/v1", protocol: "openai", summary: "混元 OpenAI 兼容。" },
  { id: "minimax", name: "MiniMax", domain: "api.minimax.chat", endpoint: "https://api.minimax.chat/v1", protocol: "openai", summary: "MiniMax 开放接口。" },
  { id: "stepfun", name: "阶跃星辰", domain: "api.stepfun.com", endpoint: "https://api.stepfun.com/v1", protocol: "openai", summary: "StepFun 兼容接口。" },
  { id: "lingyi", name: "零一万物", domain: "api.lingyiwanwu.com", endpoint: "https://api.lingyiwanwu.com/v1", protocol: "openai", summary: "Yi 开放接口。" },
  { id: "baichuan", name: "百川", domain: "api.baichuan-ai.com", endpoint: "https://api.baichuan-ai.com/v1", protocol: "openai", summary: "百川开放接口。" },
  { id: "mistral", name: "Mistral", domain: "api.mistral.ai", endpoint: "https://api.mistral.ai/v1", protocol: "openai", summary: "Mistral 官方 API。" },
  { id: "xai", name: "xAI", domain: "api.x.ai", endpoint: "https://api.x.ai/v1", protocol: "openai", summary: "Grok 官方兼容接口。" },
  { id: "huggingface", name: "Hugging Face Router", domain: "router.huggingface.co", endpoint: "https://router.huggingface.co/v1", protocol: "openai", summary: "HF 推理路由。" },
  { id: "novita", name: "Novita", domain: "api.novita.ai", endpoint: "https://api.novita.ai/openai", protocol: "openai", summary: "Novita OpenAI 兼容。" },
  { id: "apimart", name: "APIMart", domain: "api.apimart.ai", endpoint: "https://api.apimart.ai/v1", protocol: "openai", summary: "多模型 OpenAI 兼容网关。" },
  { id: "omniakey", name: "OmniaKey", domain: "api.omniakey.com", endpoint: "https://api.omniakey.com/v1", protocol: "openai", summary: "面向编程工具的兼容网关。" },
];

export function hostFromEndpoint(endpoint: string) {
  try {
    return new URL(endpoint).hostname.toLowerCase();
  } catch {
    return "";
  }
}
