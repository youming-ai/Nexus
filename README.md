# Nexus

<div align="center">

**面向 Bun + TanStack Start + Void + Cloudflare Workers 全栈技术栈的企业级 CLI 脚手架**

Bun 1.4.4+ · TanStack Start (React 19) · Void (`void` + `cf`) · Cloudflare Workers · D1 + Drizzle ORM · Better Auth · Void Email · Tailwind CSS v4 · Vitest (`workerd`)

</div>

---

## 简介

Nexus 是将 [`youming-ai/bun-ts-stack-skills`](https://github.com/youming-ai/bun-ts-stack-skills) 技术栈规范落地为**可生成、可验证、可升级**项目的 CLI 工具（包名 `@youming-ai/create-nexus`）。

| 核心职责 | 说明 |
| --- | --- |
| **创建项目（`create`）** | 基于经过验证的依赖锁文件与迁移生成单用户（`app`）或团队多租户（`team`）全栈应用 |
| **添加模块（`add`）** | 为现有项目增量接入私有 R2 存储（`storage`）路由、绑定扩展与 `workerd` 权限测试 |
| **项目自检（`doctor`）** | 检查受管文件完整性、核心依赖、本地密钥长度及部署占位配置，支持 `--strict` 与 `--json` |
| **受控升级（`upgrade`）** | 基于 `nexus.json` 的文件基线哈希执行已审查的版本升级，保留本地自定义修改并在双端冲突时中止 |

所有变更命令均通过不可变的生成计划（`Plan`）执行，支持 `--dry-run` 预览与 `--json` 机器可读输出；CLI 在本地生成代码，绝不在创建或模块安装时自动操作云端资源或覆盖已有目录。

## 预设与模块

| 类型 | 名称 | 包含能力 |
| --- | --- | --- |
| 预设 | `app`（默认） | TanStack Start SSR、Tailwind v4、TanStack Form + Zod、D1 + Drizzle、Better Auth（注册、本地模拟收件箱邮箱验证、登录、登出、密码找回与重置、D1 登录限流）、受保护的 `/dashboard`、CSRF 与安全响应头、`AGENTS.md`、`workerd` 集成测试 |
| 预设 | `team` | 在 `app` 基础上增加 Better Auth Organization 插件、组织创建与切换、成员邮件邀请（校验受邀邮箱归属）、`owner` / `admin` / `member` 服务端 RBAC 校验、租户隔离项目与 D1 原子提交的 `audit_event` 审计日志，以及跨租户越权与撤销成员测试 |
| 模块 | `storage` | 按认证用户 ID 隔离的私有 R2 上传（`POST /api/files/`，同源校验 + 10 MiB 流式大小限制）与附件下载（`GET /api/files/$id`）接口，自动注入受管扩展 `nexus.bindings.ts` 与 `nexus.test.ts` |

## 快速开始

需要 **Bun `>= 1.4.4`** 以及 `void` / `cf` 支持的 **Node 版本（`>= 22.23.0`，仓库根目录与生成项目均提供 `.nvmrc`）**。Bun 负责包管理与脚本执行，`void` CLI 及其 Vite 配置加载运行在 Node 上。

```bash
# 1. 安装并构建 CLI
bun install --frozen-lockfile
bun run build

# 2. 创建新项目（默认 app 预设）
bun packages/cli/dist/index.js create ./my-app
cd my-app

# 3. 配置本地环境变量并执行本地 D1 迁移
printf "BETTER_AUTH_SECRET=%s\nBETTER_AUTH_URL=http://localhost:3000\n" "$(openssl rand -base64 32)" > .env
bun run db:migrate
bun run dev
```

打开 `http://localhost:3000`。本地开发与测试不会向外部发送真实邮件；注册验证邮件与密码重置邮件会由 `void/email` 投递到本地收件箱（`http://localhost:3000/__void/inbox`），提取其中的验证链接即可完成账号激活并登录。

发布至包管理仓库后，可直接通过 `bunx @youming-ai/create-nexus my-app` 调用。

## CLI 命令

```bash
# 预览创建计划（不写入文件、不安装依赖），输出机器可读 JSON
bun packages/cli/dist/index.js create ./my-app --dry-run --json

# 创建单用户应用（跳过自动安装依赖）
bun packages/cli/dist/index.js ./my-app --preset app --no-install

# 创建团队多租户应用
bun packages/cli/dist/index.js ./team-app --preset team --no-install

# 为现有项目预览并添加私有 R2 存储模块
bun packages/cli/dist/index.js add storage --cwd ./my-app --dry-run
bun packages/cli/dist/index.js add storage --cwd ./my-app

# 检查项目文件、依赖与部署占位项（--strict 将 warning 视为失败）
bun packages/cli/dist/index.js doctor --cwd ./my-app --json
bun packages/cli/dist/index.js doctor --cwd ./my-app --strict

# 预览并执行受控模板升级
bun packages/cli/dist/index.js upgrade --cwd ./my-app --dry-run
bun packages/cli/dist/index.js upgrade --cwd ./my-app
```

- **目录与命名保护**：`create` 拒绝任何已存在的目标目录（包括空目录）。应用名称须以小写字母开头，仅含小写字母、数字和连字符（最长 48 个字符，不以连字符结尾）；当目录名不满足命名规则时可通过 `--name` 指定。
- **冲突检测与回滚**：`add` 与 `upgrade` 根据 `nexus.json` 记录的 SHA-256 基线哈希比对本地文件，检查规划后是否发生并发修改，拒绝符号链接路径，并在写入异常时回滚已写入文件。详细升级规则见 [`docs/upgrades.md`](docs/upgrades.md)。

## 仓库结构

```text
packages/
  cli/                  # CLI 入口、参数解析与可发布包（@youming-ai/create-nexus）
  core/                 # 清单校验、文件树规划、冲突检测、原子执行、doctor 与升级白名单
templates/
  app/                  # 标准单用户全栈应用模板（含独立 bun.lock 与 D1 迁移）
  presets/team/         # 团队多租户预设叠加层（组织、邀请、RBAC、项目与审计日志）
  modules/storage/      # 可选私有 R2 存储模块
scripts/
  build.ts              # 校验工作区版本一致性、构建 CLI 并内嵌模板资产
  verify-generated.ts   # 打包 .tgz 并在仓库外验证所有预设、模块与跨版本升级
  smoke-app.ts          # 真实本地 HTTP 链路测试（注册、邮件激活、登录、改密、R2 上传、团队工作区）
tests/                  # 核心规划、CLI 行为与跨版本升级单元测试及基线夹具
docs/                   # 架构说明（architecture.md）与升级文档（upgrades.md）
AGENTS.md               # AI Agent 开发与架构约束说明
```

## 验证与打包

```bash
bun run check             # Biome 代码规范与格式检查
bun run typecheck         # TypeScript 类型检查（tsc --noEmit）
bun run test              # 运行核心、CLI 与升级单元测试
bun run verify:generated  # 打包 CLI 并在仓库外执行完整端到端验收
```

`bun run verify:generated` 会执行以下完整验收流程（无需云端凭据）：
1. 运行 `bun run build` 并在 `packages/cli` 生成 `.tgz` 压缩包；
2. 将压缩包安装到仓库外含空格的临时目录中，脱离工作区依赖运行打包后的二进制；
3. 生成 `app` 预设项目，校验 `.gitignore` 规则恢复、`bun install --frozen-lockfile`、本地 D1 迁移、类型检查、`workerd` 测试、生产构建，并启动本地服务跑完真实 HTTP 注册/收件箱链接验证/登录/会话/重置密码链路；
4. 运行 `doctor` 检查，执行 `add storage` 添加私有 R2 模块，再次跑通类型检查、`workerd` 测试、生产构建与真实 HTTP 私密文件上传下载测试；
5. 生成 `team` 预设并叠加 `storage` 模块，完成迁移、类型检查、跨组织与角色权限 `workerd` 测试、生产构建及团队工作区 HTTP 冒烟测试；
6. 从 `tests/fixtures/app-0.6.0.json` 基线夹具还原旧版项目，通过打包后的 CLI 执行 `upgrade --dry-run` 与 `upgrade`，并验证升级后项目的依赖安装、类型检查、`workerd` 测试与构建。

构建可分发的压缩包：

```bash
bun run build
cd packages/cli
bun pm pack
```

## 架构与技术栈说明

完整对齐 [`youming-ai/bun-ts-stack-skills` (`ba44f26`)](https://github.com/youming-ai/bun-ts-stack-skills/blob/ba44f2676f059a011536ed5c1cf72db1ede37dba/tanstack/SKILL.md)，通过 `void`（`void.config.ts`、`env.ts`、`voidPlugin()`、`void db`、`void deploy`、`void/email`）与底层 Cloudflare `cf` CLI 统一管理类型化环境变量、本地 D1 迁移、邮件收件箱与生产部署，并使用与运行库版本一致的 `auth` CLI 生成 Better Auth Drizzle Schema。详见：

- [架构设计与技术栈偏差说明](docs/architecture.md)
- [项目升级与冲突处理规则](docs/upgrades.md)
- [AI Agent 仓库规范](AGENTS.md)

## 许可证

[MIT](LICENSE)
