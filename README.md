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

## 🤖 Agent 一键部署（推荐）

在 Replit 新建一个空白项目，打开 **Agent 面板**，粘贴下方短提示词：

```
请访问 https://raw.githubusercontent.com/aiaimimi0920/ai-integration-hub/main/DEPLOY.md，阅读其中的完整部署指南并逐步执行所有操作。
```

Agent 会自动读取部署文档，完成：克隆代码 → 配置 AI 集成 → 启动服务 → 验证 → 发布上线。

> 完整部署步骤详见 [DEPLOY.md](./DEPLOY.md)

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
