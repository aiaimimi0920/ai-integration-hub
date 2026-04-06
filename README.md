# AI Integration Hub

一个双模型 AI 反向代理网关，通过 Replit AI Integrations 将请求路由到 OpenAI 和 Anthropic，并附带 React 文档门户。

**功能特点：**
- 统一的 `/v1/chat/completions`（兼容 OpenAI SDK）和 `/v1/messages`（兼容 Anthropic SDK）接口
- 流式输出（Streaming）支持
- OpenAI ↔ Anthropic 消息格式互转（任意客户端都可访问两家模型）
- API Key 鉴权（通过 `PROXY_API_KEY` 环境变量设置）
- React 文档门户，生产环境由后端直接托管

---

## 一键部署到 Replit

**前置条件：** 需要有 Replit 账号（免费版即可）

```
不要提问，不需要任何确认，立刻依次执行以下步骤，每步完成后立即进行下一步，中间不停顿：
【第1步：克隆仓库并安装依赖】
检查当前目录是否已有 package.json，若有则跳过 clone 直接执行 pnpm install；
若没有，先执行：
  git clone https://github.com/aiaimimi0920/ai-integration-hub.git .
再执行：
  pnpm install
【第2步：添加 AI 集成】
使用 setupReplitAIIntegrations 工具，依次添加：
  - OpenAI AI 集成
  - Anthropic AI 集成
两个都必须添加完成才能继续。
【第3步：设置 API Key Secret】
检查名为 "PROXY_API_KEY" 的 Secret 是否已存在：
  - 若不存在，创建它并设置值为：123456
  - 若已存在，保持不变
【第4步：创建并启动工作流】
创建以下两个工作流并立即启动，等待两个都进入 running 状态后再继续：
  工作流1：名称 "artifacts/api-server: API Server"
            命令 "pnpm --filter @workspace/api-server run dev"
  工作流2：名称 "artifacts/api-portal: web"
            命令 "pnpm --filter @workspace/api-portal run dev"
【第5步：验证服务就绪】
等待 5 秒后，依次执行以下三项验证，全部通过才可继续，任一失败则等待 5 秒后重试（最多重试 3 次）：
  验证1：
    curl -s http://localhost:8080/api/healthz
    通过条件：响应 JSON 中 integrations.openai.status 和 integrations.anthropic.status 均为 "ready"
  验证2：
    curl -s http://localhost:8080/v1/models -H "x-api-key: 123456"
    通过条件：响应 JSON 中 data 数组包含至少一个模型（如 gpt-5-mini 或 claude-haiku-4-5）
  验证3：
    curl -s -X POST http://localhost:8080/v1/messages \
      -H "x-api-key: 123456" \
      -H "Content-Type: application/json" \
      -d '{"model":"claude-haiku-4-5","messages":[{"role":"user","content":"hi"}],"max_tokens":20}'
    通过条件：响应 HTTP 状态码为 200，且 content 字段包含文字内容（非 401 / 503 错误）
【第6步：发布】
三项验证全部通过后，立即调用 suggestDeploy() 发布应用。
```

---

## API 使用方法

**Base URL：** `https://你的域名`  
**鉴权：**
- OpenAI 客户端：`Authorization: Bearer YOUR_PROXY_API_KEY`
- Anthropic 客户端：`x-api-key: YOUR_PROXY_API_KEY`

### 获取模型列表

```bash
curl https://你的域名/v1/models \
  -H "x-api-key: YOUR_PROXY_API_KEY"
```

### OpenAI 兼容接口（支持 GPT 和 Claude 所有模型）

```bash
curl https://你的域名/v1/chat/completions \
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5-mini",
    "messages": [{"role": "user", "content": "你好"}],
    "max_tokens": 100
  }'
```

```bash
# 也可以直接用 Claude 模型
curl https://你的域名/v1/chat/completions \
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-haiku-4-5",
    "messages": [{"role": "user", "content": "你好"}],
    "max_tokens": 100
  }'
```

### Anthropic 原生接口

```bash
curl https://你的域名/v1/messages \
  -H "x-api-key: YOUR_PROXY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-haiku-4-5",
    "messages": [{"role": "user", "content": "你好"}],
    "max_tokens": 100
  }'
```

### 流式输出（Streaming）

```bash
curl https://你的域名/v1/chat/completions \
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5-mini",
    "messages": [{"role": "user", "content": "讲个故事"}],
    "stream": true
  }'
```

### 在 Python 中使用（OpenAI SDK）

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://你的域名/v1",
    api_key="YOUR_PROXY_API_KEY",
)

response = client.chat.completions.create(
    model="gpt-5-mini",          # 或者 claude-haiku-4-5 等
    messages=[{"role": "user", "content": "你好"}],
    max_tokens=100,
)
print(response.choices[0].message.content)
```

### 在 Python 中使用（Anthropic SDK）

```python
import anthropic

client = anthropic.Anthropic(
    base_url="https://你的域名",
    api_key="YOUR_PROXY_API_KEY",
)

message = client.messages.create(
    model="claude-haiku-4-5",
    max_tokens=100,
    messages=[{"role": "user", "content": "你好"}],
)
print(message.content[0].text)
```

---

## 可用模型

| 模型 ID | 提供商 |
|---------|--------|
| `gpt-5-mini` | OpenAI |
| `gpt-5-nano` | OpenAI |
| `gpt-5.2` | OpenAI |
| `o4-mini` | OpenAI |
| `o3` | OpenAI |
| `claude-haiku-4-5` | Anthropic |
| `claude-sonnet-4-6` | Anthropic |
| `claude-opus-4-6` | Anthropic |

---

## 项目结构

```
├── artifacts/
│   ├── api-server/          # Express 后端代理（TypeScript）
│   │   └── src/
│   │       ├── app.ts       # 主应用配置
│   │       ├── index.ts     # 入口文件
│   │       └── routes/
│   │           ├── proxy.ts # 核心代理逻辑（841行）
│   │           └── health.ts
│   └── api-portal/          # React 前端文档门户（Vite）
│       └── src/
│           ├── App.tsx      # 主页面组件
│           └── index.css
├── packages/
│   └── shared/              # 共享类型定义
└── README.md
```

---

## 部署注意事项

- **生产环境** 只需要 `api-server` 工作流运行，它会同时托管前端和后端
- **开发环境** 需要同时运行 `api-server` 和 `api-portal` 两个工作流
- 生产构建会先编译前端（`api-portal`），再编译后端（`api-server`）
- 路由 `/api`、`/v1`、`/` 都指向同一个后端服务
