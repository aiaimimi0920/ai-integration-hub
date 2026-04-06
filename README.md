# AI Integration Hub

A self-hosted dual AI reverse proxy for **OpenAI** and **Anthropic** models — no personal API keys needed. Billed to your Replit AI credits.

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

### After clicking the button — only 1 step required:

**Add AI Integrations** (provides the actual AI model access):

Go to **Tools → Integrations** in your new Repl, then add:
- ✅ **OpenAI**
- ✅ **Anthropic**

Then click **Run**. That's it.

> **No secrets to configure.** The default API key is `123456`. Override it anytime by adding a `PROXY_API_KEY` secret.

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
