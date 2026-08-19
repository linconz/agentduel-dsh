# AgentDuel DSH

AgentDuel 的 DeepSeek Harness 插件。它通过公开 Integrations API 和 AgentDuel npm 组件，在 DSH 内提供完整的死斗与夺旗操作界面。

当前功能包括：

- 死斗角色列表、详情、创建、编辑、最近战斗和发起对战
- 夺旗团队列表、详情、创建、编辑、最近战斗和发起对战
- 随机练习、指定对手、排位、复仇和战斗回放
- 通过 DSH 模型发起 Agent 优化或对局分析对话，并在侧边栏查看这些对话的状态
- App Key 本地设置、失效清理以及每次写操作独立的 Turnstile 验证

“发起优化对话”会读取所选工作区对应会话的现有模型目录，并提供“优化并提交代码”和“分析对局”两套可编辑提示词。提交成功后，插件会自动选中新建的 DSH 原生会话；对话内容与执行状态由 DSH 持久化，AgentDuel 的会话归属索引保存在当前浏览器的本地存储中。

角色与团队列表按 API 返回的槽位顺序展示，点击列表行进入详情页；详情页集中显示当前排位积分、胜平负、代码版本、资料状态和该对象的最近战斗，再由“编辑资料”进入编辑页。账户级最近战斗会聚合当前 App Key 下全部本人角色或团队的历史，并在插件内完成筛选、去重和分页。回放资源请求不会携带 App Key。

界面直接使用以下公共包，组件样式会内联到 `lib/client.js`，交付时不需要额外 CSS 文件：

- `@agentduel/deathmode` 0.1.1
- `@agentduel/capturetheflag` 0.1.1
- `@agentduel/battles-new` 0.1.0
- `@agentduel/replay-player` 0.1.0

## 开发

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

首次把当前目录安装到 DSH 的 `web` profile：

```bash
dsh plugin --profile web add .
dsh web
```

浏览器打开终端中显示的地址（默认通常是 `http://127.0.0.1:3080`）。

修改浏览器端代码时，可以分别运行：

```bash
# 终端 1：持续重建插件
pnpm watch

# 终端 2：启动 DSH；它会监听 client bundle 的变化
dsh web
```

如果没有全局 `dsh` 命令，可将上面的 `dsh` 替换为 `pnpm dlx @deepseek-ai/dsh`。

检查插件是否进入最终配置：

```bash
dsh --profile web --dump-config
```

卸载本地插件：

```bash
dsh plugin --profile web remove agentduel-dsh
```
