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
- 长短提示词 Token 增量与本地 `cl100k_base` 基线对照
- 相同输入的 stream / non-stream usage 一致性检查
- OpenAI / Anthropic / Gemini 异源 usage 字段指纹扫描
- 可选 Claude extended thinking signature 存在性探针
- 每项评分、判定与原始字段名证据
- 完整加载、错误、限流与移动端状态

## 检测输入与输出

输入：中转站 HTTPS 根地址、一次性低额度 API Key、协议与模型名。默认发送 3 个真实请求；Anthropic 启用 signature 探针时发送 4 个。

输出：加权风险分、总体结论、接口可用性、协议字段、异源指纹、模型字段一致性、Token 增量比和流式计数差异。API Key 不会出现在响应中。

## 判断“Token 有水分”的方法

1. 对短提示词和包含 90 个审计标记的长提示词设置相同的短输出约束；
2. 比较上游报告的输入 Token 增量与本地公开 tokenizer 基线；增量比超出 `0.55–1.65` 标为风险；
3. 用同一个短提示分别请求 stream / non-stream；输入计数相差超过 5% 标为风险；
4. 扫描 usage 中是否混入另一厂商命名，例如 OpenAI 响应出现 `input_tokens`、`usage_source` 或 Claude cache 字段。

这是可复核的异常检测，不是供应商账单审计。不同模型 tokenizer 可能不同，因此采用宽容区间；“通过”不证明最终扣费绝对正确。OpenAI 没有公开可独立验证的模型签名，无法仅凭响应证明高配模型未被低配模型替换。Claude 可选探针只确认 opaque signature 的存在和长度，未进行离线密码学验签。

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

CI 部署可通过 CI 平台的加密 Secret 注入 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`。不要把它们写入 `.env` 后提交；仓库已忽略 `.env*`、`.dev.vars*`、`.wrangler/` 和 OpenNext 构建产物。

最小 Token 权限为目标账号的 **Workers Scripts: Edit**；若还需要绑定自定义域名，再增加目标 Zone 的 **Workers Routes: Edit**。首次部署无需任何应用级密钥：检测所用的中转站 API Key 由用户在浏览器中一次性提交，仅在当前请求内存中使用。

## GitHub Actions 自动部署

`.github/workflows/cloudflare.yml` 的行为：

- Pull Request：安装锁定依赖，依次运行 ESLint、单测、OpenNext 构建和 Wrangler dry-run；不会读取 Cloudflare Secrets，也不会部署
- Push 到 `main`：通过相同验证后部署已验证的 `.open-next` 制品
- Node 固定为 `22.19.0`，依赖使用 `npm ci`，并按 `package-lock.json` 启用 npm 缓存
- 同一 PR 的旧任务会被取消；`main` 的生产部署不会相互取消
- 工作流只授予 GitHub `contents: read` 权限，Cloudflare 凭据只注入最终部署步骤

### 1. 初始化 GitHub 仓库

在 GitHub 创建一个**空仓库**（不要额外生成 README 或 `.gitignore`），然后把现有仓库关联并推送。若已有名为 `origin` 的其他远程，可使用 `github` 作为远程名：

```bash
git remote add github git@github.com:OWNER/REPOSITORY.git
git push -u github main
```

如果工作当前位于功能分支，先通过审核合并到 `main`；不要为触发部署而在本地强制改写 `main`。

### 2. 创建最小权限 Cloudflare Token

在 Cloudflare Dashboard → **My Profile → API Tokens → Create Custom Token**：

1. 权限选择 **Account / Workers Scripts / Edit**
2. Account Resources 只包含部署 SignalDeck 的账号
3. 不需要添加 KV、R2、DNS 或 Zone 权限

如果以后在 `wrangler.jsonc` 配置自定义域名或 Route，再按目标 Zone 增加 **Workers Routes / Edit**；不要提前授予全账号 Zone 权限。

### 3. 设置 GitHub Secrets

在 GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret** 创建：

| Secret | 内容 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | 上一步创建的最小权限 Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard 右侧显示的 Account ID |

不要把 Secret 写入仓库、workflow 普通变量、命令输出或 `.env`。Actions 会对匹配值脱敏，但仍不应主动打印环境变量。

### 4. 首次部署

1. 确保 Cloudflare 账号已启用一个 `workers.dev` 子域名
2. 合并 PR 或推送到 `main`
3. 在 GitHub **Actions → Test and deploy Cloudflare Worker** 查看 `verify` 与 `deploy` 两个 Job
4. 部署成功后，从 `Deploy with Wrangler` 日志末尾取得 `https://signaldeck.<subdomain>.workers.dev`

构建失败时先查看具体命名步骤（ESLint、unit tests、OpenNext 或 Wrangler）。Wrangler dry-run 在接触凭据前验证入口、静态资源与绑定；部署 Job 只使用验证 Job 生成的短期制品。

## 技术栈

Next.js 16、React 19、TypeScript、Tailwind CSS 4、shadcn/ui、Undici、js-tiktoken、Vitest。
