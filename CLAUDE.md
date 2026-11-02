# CLAUDE.md

本仓库的 agent 指令统一放在 **[AGENTS.md](AGENTS.md)**，此处不再重复一份。

请直接阅读 `AGENTS.md`：项目定位、目录分层、常用命令、模板硬约束与版本升级规则都在那里。

三个最容易踩的点，先记住：

1. **生成的应用运行在 Cloudflare `workerd`，不是 Bun**：Bun 只做包管理与脚本运行，`cf` 依赖 Node；Worker 代码只用 Web API，D1 与 Better Auth 必须在请求内创建（禁止模块顶层单例）。
2. **不要让 CLI 触碰云端资源或覆盖用户修改**：`create` 拒绝已有目录，`add` / `upgrade` 基于 `nexus.json` 的文件哈希检测冲突并在冲突时中止；云端 D1/R2/Email 配置与部署全部由用户在生成项目中通过 `cf` 显式执行。
3. **改模板或生成器后必须跑 `bun run verify:generated`**：它会真正打包 `.tgz` 并在仓库外验证 `app`、`team`、`storage` 与跨版本升级的完整构建和 HTTP 链路。
