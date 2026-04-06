# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI SDKs**: openai ^6, @anthropic-ai/sdk ^0.82

## Artifacts

### API Server (`artifacts/api-server`)
- Serves `/api` and `/v1` paths
- `/v1/models` — list models (requires Bearer token)
- `/v1/chat/completions` — OpenAI-compatible endpoint; routes to OpenAI or Anthropic based on model prefix
- `/v1/messages` — Anthropic Messages native endpoint; routes to Anthropic or OpenAI based on model prefix
- Full tool call support (bidirectional format conversion)
- Streaming with keepalive, non-streaming via stream().finalMessage() for Anthropic

### API Portal (`artifacts/api-portal`)
- Frontend portal at `/` showing connection details, endpoints, models, CherryStudio setup guide, curl examples
- Deep dark theme, copy buttons, online status indicator

## Environment Variables / Secrets
- `PROXY_API_KEY` — Bearer token for proxy authentication
- `AI_INTEGRATIONS_OPENAI_BASE_URL` / `AI_INTEGRATIONS_OPENAI_API_KEY` — auto-injected by Replit AI Integrations
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` / `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — auto-injected by Replit AI Integrations

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
