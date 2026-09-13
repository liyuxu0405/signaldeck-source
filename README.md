# SignalDeck

一个独立品牌的 AI API 中转接口核验工具。它通过服务端向用户指定的上游发起真实受控请求，分析协议形状、Token 增量、流式/非流式计数和跨厂商字段指纹。

## 本地运行

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 43127
```

访问 [http://localhost:43127](http://localhost:43127)。

## 功能

- OpenAI Chat Completions 兼容协议检测
- Anthropic Messages 协议检测
- Gemini OpenAI 兼容协议检测
- `/v1/models` 连接预检与目标模型下拉选择（不产生推理 Token）
- Chat Completions / Anthropic Messages 核心响应结构与 ID 形状校验
- 可选深度检测：Function / Tool Calling 与 Structured Output
- Anthropic `count_tokens` 官方计数核对；其他协议仅展示本地估算趋势
- 相同输入的 stream / non-stream usage 一致性检查
- OpenAI / Anthropic / Gemini 异源 usage 字段指纹扫描
- 可选 Claude extended thinking signature 存在性探针
- 每项评分、判定与原始字段名证据
- 完整加载、错误、限流与移动端状态

## 检测输入与输出

输入：中转站 HTTPS 根地址、一次性低额度 API Key、协议与模型名。标准模式发送 3 个低输出请求；Anthropic 另发送 2 个不生成内容的官方计数请求。深度模式按协议增加 1–2 个能力探针；Anthropic 启用 signature 探针时再增加 1 个请求。

输出：加权风险分、总体结论、接口可用性、协议字段、异源指纹、模型字段一致性、Token 增量比和流式计数差异。API Key 不会出现在响应中。

## 判断“Token 有水分”的方法

1. 对短提示词和包含 90 个审计标记的长提示词设置相同的短输出约束；
2. Anthropic 优先调用 `/v1/messages/count_tokens`，同输入的 usage 偏差超过 10% 才标为关键异常；
3. OpenAI 和 Gemini 没有通用的中转站官方计数接口，本地 `cl100k_base` 只展示趋势，不参与关键异常判定；
4. 用同一个短提示分别请求 stream / non-stream；输入计数相差超过 5% 标为关键异常；
5. 扫描 usage 中是否混入另一厂商命名，例如 OpenAI 响应出现 `input_tokens`、`usage_source` 或 Claude cache 字段。

这是可复核的异常检测，不是供应商账单审计。“通过”不证明最终扣费绝对正确。OpenAI 没有公开可独立验证的模型签名，无法仅凭响应证明高配模型未被低配模型替换。Claude 可选探针只确认 opaque signature 的存在和长度，未进行离线密码学验签。

## 安全设计

- Key 只存在于一次请求的服务端内存，不写文件、日志或数据库；前端收到结果后立即清空 Key
- 仅允许 HTTPS 443，拒绝 URL 凭据、重定向、本地域名、私有/保留 IPv4 和 IPv6
- Cloudflare `global_fetch_strictly_public` 在连接时强制走公网路由；同时拒绝直接输入的私有/保留 IP
- 单个上游请求 20 秒超时（thinking 探针 35 秒），响应上限 1 MB
- 每来源每分钟最多 4 次，总并发最多 3 个检测任务
- 请求体、模型名与 Key 长度受限

生产部署仍应在可信反向代理或 API Gateway 上补充分布式限流与身份验证；当前内存限流不跨 Serverless 实例共享。

## 测试

```bash
npm test
npm run lint
npm run build
npm run cf:build
```

## Cloudflare Workers

项目使用 OpenNext Cloudflare 适配器，配置位于 `open-next.config.ts` 与 `wrangler.jsonc`。

无需账号凭据即可执行：

```bash
npm install
npm run cf:build
npm run cf:preview
```

获得 Cloudflare 凭据后才执行真实部署：

```bash
# 推荐交互式本机登录，不把 Token 写入项目文件
npx wrangler login
npm run cf:deploy
```

生产环境使用 Cloudflare Git Integration 直接连接 GitHub 仓库：

- 生产分支：`main`
- 构建命令：`npm run cf:build`
- 部署命令：`npx wrangler deploy --config wrangler.jsonc`
- 版本命令：`npx wrangler versions upload --config wrangler.jsonc`
- 根目录：`/`

推送到 `main` 后由 Cloudflare 自动构建并部署，不需要在 GitHub 保存 Cloudflare Token。仓库已忽略 `.env*`、`.dev.vars*`、`.wrangler/` 和 OpenNext 构建产物。

## GitHub Actions 持续集成

`.github/workflows/cloudflare.yml` 只负责质量校验：

- Pull Request 和 `main` 推送：运行 ESLint、单测、OpenNext 构建及 Wrangler dry-run
- Node 固定为 `22.19.0`，依赖通过 `npm ci` 按 lockfile 安装
- 不读取 Cloudflare Secrets，也不执行生产部署，避免与 Cloudflare Git Integration 重复部署

## 技术栈

Next.js 16、React 19、TypeScript、Tailwind CSS 4、shadcn/ui、js-tiktoken、Vitest。

## 开源许可

SignalDeck 采用 [Apache License 2.0](LICENSE) 开源。检测功能基于公开协议独立实现，不包含 VeriDrop 的 AGPL 源码或测试题库。
