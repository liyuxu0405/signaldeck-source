import { isIP } from "node:net";
import type { Protocol } from "./detection";

function isPrivateV4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return true;
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113);
}

function isPrivateV6(address: string) {
  const value = address.toLowerCase().split("%")[0];
  if (value.startsWith("::ffff:")) return isPrivateV4(value.slice(7));
  return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd")
    || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb")
    || value.startsWith("2001:db8:");
}

export function isPublicAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return !isPrivateV4(address);
  if (family === 6) return !isPrivateV6(address);
  return false;
}

export async function secureEndpoint(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("接口地址格式无效");
  }
  if (url.protocol !== "https:") throw new Error("仅允许 HTTPS 接口");
  if (url.username || url.password || url.hash) throw new Error("接口地址不能包含凭据或片段");
  if (url.port && url.port !== "443") throw new Error("仅允许标准 HTTPS 端口 443");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) throw new Error("不允许访问本地网络");

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname) && !isPublicAddress(hostname)) {
    throw new Error("接口解析到私有、保留或不可用地址");
  }

  return { url };
}

export function endpointFor(base: URL, protocol: Protocol) {
  const normalized = base.pathname.replace(/\/+$/, "");
  const suffix = protocol === "anthropic" ? "/messages" : "/chat/completions";
  const version = normalized.endsWith("/v1") ? normalized : `${normalized}/v1`;
  const result = new URL(base);
  result.pathname = `${version}${suffix}`.replace(/\/+/g, "/");
  result.search = "";
  return result;
}

export function modelsEndpointFor(base: URL) {
  const normalized = base.pathname.replace(/\/+$/, "");
  const version = normalized.endsWith("/v1") ? normalized : `${normalized}/v1`;
  const result = new URL(base);
  result.pathname = `${version}/models`.replace(/\/+/g, "/");
  result.search = "";
  return result;
}
