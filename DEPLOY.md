# AI Integration Hub — 完整部署指南

你的任务是从 GitHub 检出 AI 反代网关项目并完成完整部署，请按以下步骤依次执行：

## 第一步：检出项目

将 GitHub 仓库克隆到当前工作目录：

```bash
git clone https://github.com/aiaimimi0920/ai-integration-hub.git .
pnpm install
```

## 第二步：配置 AI 集成（最关键）

使用 setupReplitAIIntegrations 工具，为当前项目添加以下两个集成：

- **OpenAI AI 集成**（自动注入 `AI_INTEGRATIONS_OPENAI_API_KEY` 和 `AI_INTEGRATIONS_OPENAI_BASE_URL`）
- **Anthropic AI 集成**（自动注入 `AI_INTEGRATIONS_ANTHROPIC_API_KEY` 和 `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`）

## 第三步：配置环境变量

检查 Secret `PROXY_API_KEY` 是否存在，不存在则设为 `123456`。

## 第四步：启动 Workflows

创建并启动以下两个 workflow：

- 名称 `artifacts/api-server: API Server`，命令：`pnpm --filter @workspace/api-server run dev`
- 名称 `artifacts/api-portal: web`，命令：`pnpm --filter @workspace/api-portal run dev`

## 第五步：验证

执行以下三条验证命令，全部通过后才算完成：

```bash
# 1. 集成状态检查
curl http://localhost:8080/api/healthz
# 预期：{"status":"ok","integrations":{"openai":{"status":"ready"},"anthropic":{"status":"ready"}}}

# 2. 模型列表
curl http://localhost:8080/v1/models -H "x-api-key: 123456"
# 预期：返回包含 gpt-5.2、claude-sonnet-4-6 等模型的列表

# 3. 真实生成（最关键）
curl -X POST http://localhost:8080/v1/messages \
  -H "x-api-key: 123456" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-haiku-4-5","messages":[{"role":"user","content":"hi"}],"max_tokens":20}'
# 预期：返回 Claude 真实回复内容（非 401/503 错误）
```

## 第六步：发布

验证全部通过后，调用 `suggestDeploy()` 将项目发布为生产环境。

---

## 注意事项

- 第二步集成配置是核心，缺少会导致生成接口返回 503
- API Server 端口固定为 8080
- 默认网关密钥 `123456`，支持 `Authorization: Bearer 123456` 和 `x-api-key: 123456` 两种方式
- 支持模型：OpenAI（gpt-5.2、gpt-5-mini、gpt-5-nano、o4-mini、o3）+ Anthropic（claude-opus-4-6、claude-sonnet-4-6、claude-haiku-4-5）
