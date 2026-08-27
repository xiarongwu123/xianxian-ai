# 析线 AI 后端

独立 Node.js + Express + SQLite 服务。前端通过 `/api` 调用，Vite 开发环境已代理到 `http://127.0.0.1:8787`。

## 启动

```bash
cp .env.example .env
npm run start:api
```

开发监听使用 `npm run dev:api`。数据库和上传文件默认写入 `data/`，该目录不会提交到版本库。生产环境必须设置随机的 `JWT_SECRET`，并将 SQLite/上传目录挂载到持久化磁盘。

## 已实现接口

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| GET | `/health` | 健康检查 | 否 |
| POST | `/api/auth/sms/request` | 请求验证码，开发环境返回 `devCode` | 否 |
| POST | `/api/auth/sms/login` | 验证码注册或登录 | 否 |
| POST | `/api/auth/password/set` | 设置密码 | 是 |
| POST | `/api/auth/password/login` | 密码登录 | 否 |
| POST | `/api/auth/refresh` | 轮换刷新令牌 | 否 |
| POST | `/api/auth/logout` | 撤销刷新会话 | 否 |
| GET | `/api/auth/me` | 当前用户 | 是 |
| GET | `/api/research/:code` | 行情、财务、公告聚合 | 否 |
| GET/POST/DELETE | `/api/watchlist` | 自选管理 | 是 |
| GET/POST/PATCH/DELETE | `/api/alerts` | 提醒规则管理 | 是 |
| GET | `/api/alerts/:id/events` | 提醒触发历史 | 是 |
| POST | `/api/alerts/evaluate` | 执行当前用户的一次提醒检查 | 是 |
| GET/POST | `/api/reports` | 报告列表与保存 | 是 |
| GET | `/api/reports/:id` | 报告详情 | 是 |
| POST/GET | `/api/uploads` | 图表上传与列表 | 是 |
| GET | `/api/profile/stats` | 用户数据统计 | 是 |

访问令牌放在 `Authorization: Bearer <token>`。上传字段名为 `chart`，仅接受 JPEG、PNG、WebP，最大 10 MB。

## 数据策略

- 行情：东方财富公开接口，失败后降级到腾讯证券公开行情。
- 财务：东方财富公开财务数据。
- 公告：东方财富公开公告聚合，返回公告编号、来源和详情链接。
- 每个数据域独立返回 `verified` 或 `unavailable`，单源失败不会伪造数据。
- 内存缓存：行情 30 秒，财务和公告 15 分钟。

这些公开接口只适合 MVP 验证。正式商用前需确认许可并替换为签约数据供应商。

## 尚未伪装实现的外部能力

- OCR/K 线视觉识别模型
- 基于公告正文的 AI 摘要与事实校验
- 真实短信发送和推送通道
- 实时行情 WebSocket
- 云对象存储和病毒扫描

这些能力均保留了服务端接入边界，但在没有供应商凭证时不会返回虚假的成功状态。
