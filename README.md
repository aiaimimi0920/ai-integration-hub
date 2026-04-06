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

### 步骤一：Fork 或导入本仓库

在 Replit 上新建项目，选择 **Import from GitHub**，输入：
```
https://github.com/aiaimimi0920/ai-integration-hub
```

### 步骤二：安装依赖

在 Replit Shell 中运行：
```bash
pnpm install
```

### 步骤三：添加 AI Integrations

在 Replit 左侧工具栏点击 **Tools → Integrations**，分别添加：
- **OpenAI** integration
- **Anthropic** integration

添加后，Replit 会自动注入以下环境变量（无需手动设置）：
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`

### 步骤四：设置 API Key（可选但推荐）

在 Replit 左侧工具栏点击 **Secrets（锁图标）**，添加：
```
PROXY_API_KEY = 你自己设置的密钥
```
> 如果不设置，默认值为 `123456`（仅用于测试）

### 步骤五：启动工作流

在 Replit 中启动以下两个工作流：
1. `artifacts/api-server: API Server` — 后端代理服务（端口 8080）
2. `artifacts/api-portal: web` — 前端文档门户（端口 24927，仅开发环境）

### 步骤六：验证部署

```bash
# 健康检查
curl https://你的域名/api/healthz

# 期望响应
# {"status":"ok","integrations":{"openai":{"status":"ready","method":"replit_integration"},"anthropic":{"status":"ready","method":"replit_integration"}}}

# 获取可用模型列表
curl https://你的域名/v1/models -H "x-api-key: 你的PROXY_API_KEY"
```

### 步骤七：发布（Publish）

点击 Replit 右上角 **Deploy** 按钮发布到生产环境。  
发布后，后端会自动构建前端并托管，访问 `https://你的域名/` 即可看到完整文档门户。

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
