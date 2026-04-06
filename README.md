# AI Integration Hub

A self-hosted dual AI reverse proxy that gives you a single API gateway for **OpenAI** and **Anthropic** models — no personal API keys needed. Runs on Replit AI Integrations, billed to your Replit credits.

## What it does

- **`POST /v1/chat/completions`** — OpenAI-compatible. Works with any OpenAI SDK client and CherryStudio. Supports both OpenAI and Claude models.
- **`POST /v1/messages`** — Anthropic native format. Compatible with Claude Code, Anthropic SDK, and CherryStudio Anthropic mode.
- **`GET /v1/models`** — Returns the full list of supported models.
- **Bearer auth** (`Authorization: Bearer <key>`) and **x-api-key auth** (`x-api-key: <key>`) — both accepted.
- Streaming, tool calls, and bidirectional format conversion all supported.

## Supported Models

| Provider  | Models |
|-----------|--------|
| OpenAI    | gpt-5.2, gpt-5-mini, gpt-5-nano, o4-mini, o3 |
| Anthropic | claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5 |

---

## Deploy to Replit (one-click)

[![Run on Replit](https://replit.com/badge/github/aiaimimi0920/ai-integration-hub)](https://replit.com/new/github/aiaimimi0920/ai-integration-hub)

---

## Manual Deployment on Replit

### 1. Import from GitHub

1. Go to [replit.com](https://replit.com) and sign in to your account
2. Click **+ Create Repl** → **Import from GitHub**
3. Paste the repo URL: `https://github.com/aiaimimi0920/ai-integration-hub`
4. Click **Import from GitHub**

### 2. Add Replit AI Integrations

In your new Repl, open the **Tools** panel → **Integrations**, then add:
- **OpenAI** integration
- **Anthropic** integration

This automatically injects the following env vars (no API keys needed):
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`

### 3. Set your proxy API key

In **Tools → Secrets**, add:

| Secret Name | Value |
|-------------|-------|
| `PROXY_API_KEY` | Any string you choose, e.g. `my-secret-key-123` |
| `SESSION_SECRET` | Any random string, e.g. `random-session-secret` |

### 4. Start the server

Click **Run** or start the workflow called `artifacts/api-server: API Server`.

### 5. Deploy (optional)

Click **Deploy** in Replit to get a permanent `*.replit.app` URL.

---

## Usage Examples

Replace `YOUR_BASE_URL` with your Repl's URL (e.g. `https://ai-integration-hub.yourusername.replit.app`) and `YOUR_KEY` with your `PROXY_API_KEY`.

### List models
```bash
curl https://YOUR_BASE_URL/v1/models \
  -H "Authorization: Bearer YOUR_KEY"
```

### Chat with OpenAI model
```bash
curl https://YOUR_BASE_URL/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.2",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Chat with Claude model (OpenAI format)
```bash
curl https://YOUR_BASE_URL/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Chat with Claude (Anthropic native format)
```bash
curl https://YOUR_BASE_URL/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-haiku-4-5",
    "max_tokens": 256,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## CherryStudio Setup

1. Settings → AI Provider → Add Provider
2. Choose **OpenAI** type → Base URL = `https://YOUR_BASE_URL` → API Key = `YOUR_KEY`
3. Or choose **Anthropic** type → same Base URL and API Key
4. Add models from the list above → Start chatting

## Claude Code Setup

```bash
claude config set api-key YOUR_KEY
claude config set api-url https://YOUR_BASE_URL
```

Claude Code uses `x-api-key` header automatically — fully supported.

---

## Tech Stack

- **API Server**: Node.js + Express + TypeScript (pnpm monorepo)
- **Frontend Portal**: React + Vite (dark theme, no UI library)
- **AI SDKs**: `openai` ^6, `@anthropic-ai/sdk` ^0.82
- **Hosting**: Replit with AI Integrations for zero-config API access
