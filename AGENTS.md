# Agent Instructions

本文件是本仓库对 AI agent 的唯一指令来源。`CLAUDE.md` 只做指针。

## 项目与边界

Nexus 是将 `youming-ai/bun-ts-stack-skills`（Bun + TanStack Start + Cloudflare Workers + D1 + Drizzle + Better Auth + Cloudflare Email + Tailwind v4）落地为可生成、可验证、可升级工程的 CLI 脚手架（发布包名 `@youming-ai/create-nexus`，提供 `create-nexus` 与 `nexus` 两个命令）。

Nexus 只承担四项职责：

1. **创建项目（`create`）**：基于经过验证的锁文件与模板生成单用户（`app`）或团队多租户（`team`）项目。
2. **添加能力（`add storage`）**：通过受管扩展文件向既有项目叠加私有 R2 上传/下载接口、绑定声明与权限测试。
3. **检查项目（`doctor`）**：静态校验生成文件完整性、核心依赖、本地密钥及部署占位配置。
4. **受控升级（`upgrade`）**：按已审查的版本迁移白名单升级模板文件，保留用户未冲突的修改，遇到双端修改冲突时停止写入。

**硬性边界**：
- CLI 运行在本地，**绝不在生成、添加模块、检查或升级过程中创建云端资源、修改 DNS、发送外部邮件或执行远端部署**。云端资源（D1、R2、Email Domain）与部署全部由生成项目中的 `cf` CLI 显式执行。
- `create` 永远拒绝已存在的目标目录（含空目录），不提供强制覆盖参数。
- 旧版 Next.js + Supabase + Prisma 模板已退役并从仓库移除，不提供旧版 Supabase 数据或账号迁移。

## 目录与分层

```text
packages/
  core/                  # 配置校验、生成计划（Plan）、冲突检测、原子写入与回滚、doctor、升级白名单
  cli/                   # CLI 参数解析、TTY 提示、命令分发与打包入口（@youming-ai/create-nexus）
templates/
  app/                   # 标准单用户应用基线模板（可独立安装、迁移、类型检查、运行 workerd 测试与构建）
  presets/team/          # 团队多租户预设叠加层（组织、邀请、RBAC 权限隔离、项目与 D1 原子审计日志）
  modules/storage/       # 可选私有 R2 存储模块（受管绑定扩展、鉴权上传下载路由与测试）
scripts/
  build.ts               # 校验版本一致性、打包 CLI 并内嵌模板资产（处理 .gitignore -> gitignore）
  verify-generated.ts    # 打包 .tgz 后在仓库外带空格路径下执行的完整端到端验收
  smoke-app.ts           # 启动真实本地服务器验证注册、本地收件箱邮件链接、登录、重置密码、R2 上传与团队权限
tests/
  core.test.ts           # 生成计划、冲突拦截、符号链接防御、模块叠加与 doctor 单测
  cli.test.ts            # CLI 参数、--dry-run、--json 输出与退出码测试
  upgrade.test.ts        # 基于捕获夹具的跨版本升级、用户修改保留与冲突阻断测试
  fixtures/              # 已审查的历史模板基线夹具（如 app-0.6.0.json）
docs/
  architecture.md        # 内部架构与技术栈偏差说明
  upgrades.md            # 跨版本升级规则与冲突处理说明
```

- `packages/core` 不拥有终端 UI 或云端凭据；所有文件变更必须先产出不可变的 `Plan`，经预览（`--dry-run`）或校验通过后再由 `executePlan` 落地。
- `packages/cli` 打包时会将 `@nexus/core` 编译进 `dist/index.js`，并将 `templates/` 复制到 `packages/cli/assets/`。发布的 tarball 不依赖工作区内部包，也不在运行时拉取 Git 分支。

## 开发与验证

需要 **Bun `>= 1.4.4`**（包管理与脚本运行）和 **Node `>= 22.23.0`**（`cf` CLI 与 Vite 配置加载运行在 Node 上，见 `.nvmrc`）。

| 命令 | 作用 |
| --- | --- |
| `bun install --frozen-lockfile` | 安装仓库依赖 |
| `bun run dev -- <args>` | 直接从源码运行 CLI（`packages/cli/src/index.ts`） |
| `bun run build` | 校验版本一致性，构建 `packages/cli/dist` 并打包模板到 `packages/cli/assets` |
| `bun run check` / `bun run format` | Biome 静态检查 / 自动格式化 |
| `bun run typecheck` | TypeScript `--noEmit` 类型检查 |
| `bun run test` | 运行 `tests/` 下的核心、CLI 与升级单元测试 |
| `bun run verify:generated` | **完整端到端门禁**：打包 `.tgz` → 外部带空格目录安装 → 生成 `app` 预设并跑迁移/类型检查/workerd 测试/构建/HTTP 冒烟 → `doctor` → `add storage` 验收 → 生成 `team` + `storage` 全套验收 → `0.6.0 -> 0.7.0` 升级验收 |

修改 `packages/`、`templates/` 或 `scripts/` 后，提交前必须跑通：

```bash
bun run check && bun run typecheck && bun run test && bun run verify:generated
```

## 模板与生成项目的硬约束

生成项目基于 `youming-ai/bun-ts-stack-skills`（commit `ba44f26`），并针对本仓库 CLI 规范做以下固定约束：

1. **统一使用 `cf` CLI，不使用 Void 或 Wrangler**：生成项目仅维护单一 `cloudflare.config.ts`，不生成 `void.config.ts`、`void.lock.json` 或手写 `wrangler.toml`。
2. **Worker 运行时边界**：应用与测试均运行在 Cloudflare `workerd`（V8 isolate）。业务与路由代码只用 Web 标准 API（`fetch`、`crypto.randomUUID()`、Web Streams），禁止在 Worker 代码中调用 `Bun.*` 或 `node:*` 文件系统。
3. **请求级绑定（Request-scoped bindings）**：D1 Drizzle 实例（`getDb()`）与 Better Auth 实例（`getAuth()`）必须在每次请求内创建，严禁在模块顶层缓存数据库连接、Auth 实例或用户状态。
4. **模块边界与文件命名**：
   - `*.server.ts`：仅服务端代码，顶部导入 `@tanstack/react-start/server-only`。
   - `*.functions.ts`：`createServerFn` 包装函数，可安全被客户端组件导入。
   - `src/schemas/*.ts`：前后端共用的 Zod 校验定义；服务端入口必须再次解析校验，不信任客户端入参。
5. **认证与数据库迁移**：
   - Better Auth schema 影响项集中在 `src/lib/auth.shared.ts`，通过与运行库同版本的 `auth` CLI（`bun run auth:generate`）从 `src/lib/auth.cli.ts` 生成 `db/auth-schema.ts`。
   - 业务表定义在 `db/schema.ts`，通过 `drizzle-kit`（`bun run db:generate`）生成 SQL 迁移至 `db/migrations/`，本地通过 `cf d1 migrations apply --local` 应用。
6. **安全响应头与 CSRF**：`src/start.ts` 使用 `createStart` 注册全局安全响应头中间件时，必须显式保留 `createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" })`。
7. **受管扩展点**：可选模块只改写 `nexus.bindings.ts` 和 `nexus.test.ts`，用户自定义的额外绑定放在 `cloudflare.config.ts`。
8. **多租户授权（`team` 预设）**：D1 没有 Supabase RLS；`src/features/team/team.server.ts` 是租户授权边界，所有租户读写必须在服务端核对当前用户的组织成员身份与角色（`owner` / `admin` / `member`），项目写入必须与 `audit_event` 在同一 D1 batch 中原子提交。

## 版本与升级规范

- `package.json`、`packages/core/package.json`、`packages/cli/package.json` 与 `packages/core/src/manifest.ts` 中的 `VERSION` 必须完全一致（`scripts/build.ts` 会强校验）。
- 跨版本升级在 `packages/core/src/migrations.ts` 中显式放行。新增任何跨版本迁移前，必须：
  1. 在 `tests/fixtures/` 保存源版本的真实生成快照；
  2. 在 `tests/upgrade.test.ts` 验证用户修改保留、未修改文件更新、双端修改冲突阻断；
  3. 在 `scripts/verify-generated.ts` 验证打包后的 CLI 完成升级并通过 `frozen-lockfile` 安装、类型检查、`workerd` 测试与生产构建。
