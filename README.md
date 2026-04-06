# AI Integration Hub

A self-hosted dual AI reverse proxy for **OpenAI** and **Anthropic** models — deploy on Replit in one click.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/models` | List all supported models |
| POST | `/v1/chat/completions` | OpenAI-compatible format (supports OpenAI + Claude) |
| POST | `/v1/messages` | Anthropic native format (supports Claude + OpenAI) |

**Auth:** `Authorization: Bearer 123456` or `x-api-key: 123456`  
**Default key:** `123456` — override by adding a `PROXY_API_KEY` secret.

---

## 一键部署 / One-Click Deploy

[![Run on Replit](https://replit.com/badge/github/aiaimimi0920/ai-integration-hub)](https://replit.com/new/github/aiaimimi0920/ai-integration-hub)

点击上方按钮在 Replit 创建项目后，将下方提示词完整复制，粘贴给你的 **Replit Agent**，Agent 会自动完成全部配置和发布。

> After clicking the button, copy the prompt below and paste it to your **Replit Agent** — it will handle everything automatically.

---

## 🤖 Agent 一键完成提示词

> **使用方式：** 在 Replit 新建一个空白项目 → 打开 Agent 面板 → 复制下方全部内容粘贴 → 等待完成

```
你的任务是从 GitHub 检出 AI 反代网关项目并完成完整部署，请按以下步骤依次执行：

【第一步：检出项目】
将 GitHub 仓库克隆到当前工作目录：
git clone https://github.com/aiaimimi0920/ai-integration-hub.git .
然后安装依赖：
pnpm install

【第二步：配置 AI 集成（最关键）】
使用 setupReplitAIIntegrations 工具，为当前项目添加以下两个集成：
- OpenAI AI 集成（自动注入 AI_INTEGRATIONS_OPENAI_API_KEY 和 AI_INTEGRATIONS_OPENAI_BASE_URL）
- Anthropic AI 集成（自动注入 AI_INTEGRATIONS_ANTHROPIC_API_KEY 和 AI_INTEGRATIONS_ANTHROPIC_BASE_URL）

【第三步：配置环境变量】
检查 Secret PROXY_API_KEY 是否存在，不存在则设为 "123456"。

【第四步：启动 Workflows】
创建并启动以下两个 workflow：
- 名称 "artifacts/api-server: API Server"，命令：pnpm --filter @workspace/api-server run dev
- 名称 "artifacts/api-portal: web"，命令：pnpm --filter @workspace/api-portal run dev

【第五步：验证】
执行以下验证，全部通过后才算完成：

1. curl http://localhost:8080/api/healthz
   预期：{"status":"ok","integrations":{"openai":{"status":"ready"},"anthropic":{"status":"ready"}}}

2. curl http://localhost:8080/v1/models -H "x-api-key: 123456"
   预期：返回包含 gpt-5.2、claude-sonnet-4-6 等模型的列表

3. curl -X POST http://localhost:8080/v1/messages \
   -H "x-api-key: 123456" \
   -H "Content-Type: application/json" \
   -d '{"model":"claude-haiku-4-5","messages":[{"role":"user","content":"hi"}],"max_tokens":20}'
   预期：返回 Claude 真实回复内容（非 401/503 错误）

【第六步：发布】
验证全部通过后，调用 suggestDeploy() 将项目发布为生产环境。

【注意】
- 第二步集成配置是核心，缺少会导致生成接口返回 503
- API Server 端口固定为 8080
- 默认网关密钥 123456，支持 Authorization: Bearer 123456 和 x-api-key: 123456
```

---

## Supported Models

| Provider | Models |
|----------|--------|
| OpenAI | `gpt-5.2` · `gpt-5-mini` · `gpt-5-nano` · `o4-mini` · `o3` |
| Anthropic | `claude-opus-4-6` · `claude-sonnet-4-6` · `claude-haiku-4-5` |

---

## Quick Test

```bash
# Health check (shows integration status)
curl https://YOUR_APP.replit.app/api/healthz

# List models
curl https://YOUR_APP.replit.app/v1/models \
  -H "x-api-key: 123456"

# Chat with GPT (OpenAI format)
curl -X POST https://YOUR_APP.replit.app/v1/chat/completions \
  -H "Authorization: Bearer 123456" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5.2","messages":[{"role":"user","content":"Hello!"}]}'

# Chat with Claude (OpenAI format)
curl -X POST https://YOUR_APP.replit.app/v1/chat/completions \
  -H "Authorization: Bearer 123456" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-6","messages":[{"role":"user","content":"Hello!"}]}'

# Claude Code style (Anthropic native format)
curl -X POST https://YOUR_APP.replit.app/v1/messages \
  -H "x-api-key: 123456" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-haiku-4-5","max_tokens":256,"messages":[{"role":"user","content":"Hello!"}]}'
```

---

## CherryStudio Setup

1. Settings → AI Provider → Add Provider → choose **OpenAI** or **Anthropic**
2. Base URL: `https://YOUR_APP.replit.app`
3. API Key: `123456`
4. Add models → start chatting

## Claude Code Setup

```bash
claude config set api-key 123456
claude config set api-url https://YOUR_APP.replit.app
```

---

## Manual Setup (if not using Agent)

If you prefer to configure manually, pick one method:

**Option A — Replit AI Integrations (free)**  
Tools → Integrations → add **OpenAI** + **Anthropic** → restart API Server workflow.

**Option B — Your own API Keys**  
Add secrets `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` in the Secrets tab → restart API Server workflow.

---

## Tech Stack

Node.js · Express · TypeScript · React · Vite · pnpm monorepo · Replit AI Integrations
