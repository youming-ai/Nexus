# Nexus

基于 Bun、TanStack Start、Void 和 Cloudflare Workers 的全栈 CLI 脚手架，内置 D1、Drizzle、Better Auth 和 Tailwind CSS。

支持单用户应用、团队多租户、私有 R2 存储、项目检查与受控升级。

## 快速开始

需要 Bun ≥ 1.4.4 和 Node ≥ 22.23.0。

从 [GitHub Releases](https://github.com/youming-ai/Nexus/releases) 下载 CLI 与模板，无需安装 npm 包：

```sh
curl -fL https://github.com/youming-ai/Nexus/releases/latest/download/nexus.tgz -o nexus.tgz
mkdir nexus-cli
tar -xzf nexus.tgz -C nexus-cli
NEXUS_CLI="$(pwd)/nexus-cli/package/dist/index.js"
nexus() { bun "$NEXUS_CLI" "$@"; }

nexus create ./my-app
cd my-app
printf 'BETTER_AUTH_SECRET=%s\nBETTER_AUTH_URL=http://localhost:3000\n' "$(openssl rand -base64 32)" > .env
bun run db:migrate
bun run dev
```

访问 `http://localhost:3000`，本地邮件收件箱位于 `/__void/inbox`。生成项目会通过 Bun 安装依赖，更多开发与部署说明见项目内的 README。

## 常用命令

以下命令在项目的上级目录运行：

```sh
nexus create ./my-team --preset team    # 创建团队应用
nexus add storage --cwd ./my-app       # 添加私有 R2 存储
nexus doctor --cwd ./my-app            # 检查项目
nexus upgrade --cwd ./my-app --dry-run # 预览升级；移除 --dry-run 执行
nexus --help
```

CLI 仅操作本地文件；部署由生成项目中的 `bun run deploy` 显式执行。创建项目拒绝已有目录，升级遇到冲突时停止写入。

[架构](docs/architecture.md) · [升级规则](docs/upgrades.md) · [开发与验证](AGENTS.md) · [MIT](LICENSE)
