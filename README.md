# AI Integration Hub

A self-hosted dual AI reverse proxy for **OpenAI** and **Anthropic** models.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/models` | List all supported models |
| POST | `/v1/chat/completions` | OpenAI-compatible (supports OpenAI + Claude models) |
| POST | `/v1/messages` | Anthropic native format (supports Claude + OpenAI models) |

**Auth:** `Authorization: Bearer 123456` or `x-api-key: 123456` (default key, change via `PROXY_API_KEY` secret)

## Supported Models

| Provider | Models |
|----------|--------|
| OpenAI | gpt-5.2, gpt-5-mini, gpt-5-nano, o4-mini, o3 |
| Anthropic | claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5 |

---

## One-Click Deploy

[![Run on Replit](https://replit.com/badge/github/aiaimimi0920/ai-integration-hub)](https://replit.com/new/github/aiaimimi0920/ai-integration-hub)

### After deploying — configure AI provider credentials (pick one method):

#### Method 1 — Replit Agent (fully automatic, recommended)

Open the **AI / Agent** panel in your Replit project and paste this prompt:

```
请帮我配置这个 Replit 项目的 AI 集成：
1. 在 Tools → Integrations 中添加 OpenAI AI 集成
2. 在 Tools → Integrations 中添加 Anthropic AI 集成
3. 完成后重启 "API Server" workflow

这会自动注入 AI_INTEGRATIONS_OPENAI_API_KEY、AI_INTEGRATIONS_OPENAI_BASE_URL、AI_INTEGRATIONS_ANTHROPIC_API_KEY、AI_INTEGRATIONS_ANTHROPIC_BASE_URL 环境变量，让 AI 反代网关正常工作。
```

The Agent will configure everything automatically. No manual steps needed.

#### Method 2 — Replit AI Integrations (manual, free)

Go to **Tools → Integrations** in your Repl, then add:
- ✅ **OpenAI**
- ✅ **Anthropic**

Then restart the **API Server** workflow. Done.

#### Method 3 — Your own API Keys (Secrets)

In your Repl, open the **Secrets** tab (🔒 padlock icon in the sidebar) and add:
- `OPENAI_API_KEY` — your OpenAI API key
- `ANTHROPIC_API_KEY` — your Anthropic API key

Then restart the **API Server** workflow. Done.

> **Tip:** After setup, open the portal at your app's URL — it automatically detects your configuration status and shows the setup prompt if anything is missing.

> **No proxy key needed.** The default gateway key is `123456`. Override it by adding a `PROXY_API_KEY` secret.

---

## Quick Test

```bash
# List models
curl https://YOUR_APP.replit.app/v1/models \
  -H "Authorization: Bearer 123456"

# Chat with GPT
curl https://YOUR_APP.replit.app/v1/chat/completions \
  -H "Authorization: Bearer 123456" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5.2","messages":[{"role":"user","content":"Hello!"}]}'

# Chat with Claude (OpenAI format)
curl https://YOUR_APP.replit.app/v1/chat/completions \
  -H "Authorization: Bearer 123456" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-6","messages":[{"role":"user","content":"Hello!"}]}'

# Claude Code style (x-api-key)
curl https://YOUR_APP.replit.app/v1/messages \
  -H "x-api-key: 123456" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-haiku-4-5","max_tokens":256,"messages":[{"role":"user","content":"Hello!"}]}'
```

---

## CherryStudio Setup

1. Settings → AI Provider → Add Provider → choose **OpenAI** or **Anthropic**
2. Base URL: `https://YOUR_APP.replit.app`
3. API Key: `123456`
4. Add models → chat

## Claude Code Setup

```bash
claude config set api-key 123456
claude config set api-url https://YOUR_APP.replit.app
```

---

## Change the Default Key

Add a Replit Secret named `PROXY_API_KEY` with your preferred value. The default `123456` is only used when no secret is set.

## Tech Stack

Node.js · Express · TypeScript · React · Vite · pnpm monorepo · Replit AI Integrations
