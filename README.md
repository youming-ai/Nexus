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

## 使用指南

### 1. 环境准备与 CLI 安装

需要安装：
- **Bun `>= 1.4.4`**（负责包管理与脚本执行）
- **Node `>= 22.23.0`**（`void` / `cf` CLI 与 Vite 配置加载运行在 Node 上，仓库根目录与生成项目均提供 `.nvmrc`）

从源码构建并可选注册全局命令：

```bash
bun install --frozen-lockfile
bun run build

# 可选：全局注册 create-nexus 与 nexus 命令
cd packages/cli && bun link && cd ../..
```

> 发布至 npm 后，可直接通过 `bunx @youming-ai/create-nexus my-app` 调用；本地未 `bun link` 时可使用 `bun packages/cli/dist/index.js <command>`。

### 2. 创建新项目（`create`）

支持单用户（`app`）与团队多租户（`team`）两种预设：

```bash
# 创建默认单用户应用（自动执行 bun install）
bun packages/cli/dist/index.js create ./my-app

# 创建团队多租户应用
bun packages/cli/dist/index.js create ./my-team-app --preset team

# 跳过自动安装依赖，或仅预览生成计划（不写入文件）
bun packages/cli/dist/index.js create ./my-app --no-install
bun packages/cli/dist/index.js create ./my-app --dry-run --json
```

### 3. 启动生成出来的项目

进入生成的项目目录，生成本地 `.env`（Void 仅支持单一 `.env` 本地密钥文件，禁止创建 `.env.example`），执行本地 D1 迁移并启动开发服：

```bash
cd ./my-app

# 1. 生成本地 .env（BETTER_AUTH_SECRET 需不少于 32 个字符）
printf "BETTER_AUTH_SECRET=%s\nBETTER_AUTH_URL=http://localhost:3000\n" "$(openssl rand -base64 32)" > .env

# 2. 应用本地 D1 数据库迁移（底层调用 void db migrate）
bun run db:migrate

# 3. 启动本地开发服务器
bun run dev
```

- **访问应用**：打开 `http://localhost:3000`
- **本地模拟邮件收件箱**：本地开发与测试不会向外部发送真实邮件；注册验证邮件、密码重置邮件与团队邀请邮件会由 `void/email` 投递到本地收件箱 `http://localhost:3000/__void/inbox`，提取其中的验证链接即可完成激活与登录。

### 4. 按需叠加私有 R2 存储模块（`add storage`）

为现有项目增量添加私有 R2 文件上传与下载能力：

```bash
# 预览将新增和修改的文件
bun packages/cli/dist/index.js add storage --cwd ./my-app --dry-run

# 正式安装存储模块
bun packages/cli/dist/index.js add storage --cwd ./my-app
```

安装后会注入 `POST /api/files/`、`GET /api/files/$id`、`test/storage.test.ts`，并将受管扩展 `nexus.bindings.ts` 中的 `storage` 设为 `true`（由 `void.config.ts` 自动挂载 R2 桶）。

### 5. 项目健康检查（`doctor`）与受控升级（`upgrade`）

```bash
# 检查受管文件完整性、核心依赖、本地 .env 密钥与 void.lock.json 状态（--strict 将 warning 视为失败）
bun packages/cli/dist/index.js doctor --cwd ./my-app
bun packages/cli/dist/index.js doctor --cwd ./my-app --strict --json

# 预览并执行跨版本模板升级（保留未冲突的业务修改，遇到双端冲突自动中止）
bun packages/cli/dist/index.js upgrade --cwd ./my-app --dry-run
bun packages/cli/dist/index.js upgrade --cwd ./my-app
```

- **目录与命名保护**：`create` 拒绝任何已存在的目标目录（包括空目录）。应用名称须以小写字母开头，仅含小写字母、数字和连字符（最长 48 个字符，不以连字符结尾）；当目录名不满足命名规则时可通过 `--name` 指定。
- **冲突检测与回滚**：`add` 与 `upgrade` 根据 `nexus.json` 记录的 SHA-256 基线哈希比对本地文件，检查规划后是否发生并发修改，拒绝符号链接路径，并在写入异常时回滚已写入文件。详细升级规则见 [`docs/upgrades.md`](docs/upgrades.md)。

### 6. 生成项目内的日常开发与部署命令

在生成出来的项目目录（如 `./my-app`）中，内置以下脚本：

| 命令 | 说明 |
| --- | --- |
| `bun run dev` | 启动本地开发服务器（含 `voidPlugin()` 与 `/__void/inbox` 本地邮件收件箱） |
| `bun run db:generate` | 修改 `db/schema.ts` 后，通过 `void db generate` 生成 SQL 迁移至 `db/migrations/` |
| `bun run db:migrate` | 通过 `void db migrate` 将 SQL 迁移应用到本地 D1 |
| `bun run auth:generate` | 修改 `src/lib/auth.shared.ts` 后，通过 `auth` CLI 重新生成 `db/auth-schema.ts` |
| `bun run typecheck` | 运行 `tsr generate && void prepare && tsc --noEmit`，生成 `.void/` 类型并执行全量类型检查 |
| `bun run test` | 在 Cloudflare `workerd` 沙箱中运行 Vitest 集成测试（邮件由 `void/email/testing` 内存拦截） |
| `bun run build` | 构建生产包（`vite build`） |
| `bun run deploy` | 完成类型检查与测试后，调用 `void deploy` 置备/同步 D1、R2、邮件域名并部署至 Cloudflare Workers |

## 技术栈总览

| 层级 | 技术 / 包 | 版本 |
| --- | --- | --- |
| **包管理与脚本运行时** | Bun + Node.js（供 `void` / `cf` 与 Vite 配置加载使用） | Bun `1.4.4` · Node `>= 22.23.0` |
| **全栈框架与路由** | React 19 + TanStack Start + TanStack Router + TanStack Form | `react@19.3.1` · `@tanstack/react-start@1.172.3` · `@tanstack/react-router@1.172.3` · `@tanstack/react-form@1.29.4` |
| **部署、构建与资源编排** | Void（`void.config.ts`、`env.ts`、`voidPlugin()`、`void db`、`void deploy`）+ Cloudflare `cf` CLI + Vite 8 | `void@1.5.0`（内含 `cf@^1.0.0-beta.26`、`@cloudflare/vite-plugin@^2.0.0-beta.v.9`）· `vite@8.1.2` |
| **数据库与 ORM** | Cloudflare D1 + Drizzle ORM + Drizzle Kit（通过 `void db` 调用） | `drizzle-orm@0.45.4` · `drizzle-kit@^0.31.11` |
| **身份认证与多租户** | Better Auth（及 `organization` 插件）+ `auth` CLI | `better-auth@1.6.5` · `auth@0.1.7` |
| **邮件与对象存储** | Void Email（`void/email`、开发收件箱 `/__void/inbox`、测试 `void/email/testing`）+ Cloudflare R2 | `void@1.5.0` · Cloudflare R2 `R2Bucket` |
| **样式与 UI 组件** | Tailwind CSS v4 + Base UI + CVA + Lucide | `tailwindcss@4.2.5` · `@tailwindcss/vite@4.2.5` · `@base-ui/react@1.4.2` |
| **校验、测试与代码质量** | Zod v4 + TypeScript + Vitest (`workerd`) + Biome | `zod@4.6.7` · `typescript@5.9.3` · `vitest@5.0.5` · `@cloudflare/vitest-pool-workers@0.15.2` · `@biomejs/biome@2.6.4` |

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
