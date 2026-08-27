# 析线 AI

面向 A 股的中文 AI 图表研究工具。上传或拍摄 K 线截图后，系统识别图表证据，并结合真实行情、基本面和公告事件生成三段式研究报告：

- 图表技术分析
- 基本面与事件分析
- 综合研判与条件化执行建议

## 本地开发

```bash
cp .env.example .env
npm ci
npm run dev:api
npm run dev
```

前端默认通过 Vite 将 `/api` 代理到 `http://127.0.0.1:8787`。

## 验证

```bash
npm run check:api
npm run test:api
npm run build
```

## 生产部署

生产环境使用 Docker Compose，包含应用服务、Caddy 自动 HTTPS、SQLite 持久化和流式 AI 响应。完整步骤见 [deploy/README.md](deploy/README.md)。

```bash
cp .env.production.example .env.production
docker compose up -d --build
```

不要提交 `.env`、`.env.production`、`data/` 或上传图片。正式上线前需要配置短信供应商、数据源商用授权、隐私政策和投资风险提示。
