# AgentDuel DSH 工程指南

## 适用范围与协作规则

- 本文件适用于整个仓库。开始开发前先阅读本文件、`README.md` 和与任务直接相关的源码。
- 永远使用简体中文沟通，不使用 emoji 表情。
- 工作区可能包含用户尚未提交的修改。先查看 `git status --short`，保留并基于现有内容工作，不回退、不覆盖、不格式化无关文件。
- 修改应保持目标聚焦。结构重构默认不改变文案、路由、API 协议、DOM class、CSS 表现和用户交互，除非任务明确要求。
- 查找文件和文本优先使用 `rg --files`、`rg`。编辑源码使用补丁方式，避免生成无关文件。
- 不要提交 `lib/`、`node_modules/`、覆盖率或其他生成物；`lib/` 是可随时由构建命令重新生成的忽略目录。

## 项目定位

本项目是 AgentDuel 的 DeepSeek Harness（DSH）Web 插件，包名为 `agentduel-dsh`。它在 DSH 中提供：

- 死斗模式的角色列表、新建、编辑、本人详情和公开详情。
- 夺旗模式的团队列表、新建、编辑、本人详情和公开详情。
- 跨模式的发起战斗、最近战斗、详情战斗记录和回放。
- 无需 App Key 的公开观战。
- 使用 DSH 原生模型与会话能力进行代码优化和对局分析。
- App Key 本地管理及写请求的 Cloudflare Turnstile 验证。

这是一个 Host 与 Client 双入口插件：

| 入口 | 运行环境 | 职责 |
| --- | --- | --- |
| `src/index.ts` | Node / DSH Host | 导出插件名和空 `apply`，只负责让 DSH 发现浏览器插件 |
| `src/client/index.tsx` | Browser / DSH Web | 仅转发客户端 `apply`、`inject` |
| `src/client/shell/plugin.tsx` | Browser / DSH Web | 创建模型和会话服务、安装样式、注册 DSH UI slots |

`cordis.patch.yml` 把 `agentduel-dsh` 插入 DSH 配置。`package.json` 的 `dsh.bundle` 与 `dsh.client` 是插件清单，`tsdown.config.ts` 生成 `lib/index.js` 和 `lib/client.js`。

## 快速定位

```text
src/
├── index.ts                         # Host 入口
└── client/
    ├── index.tsx                    # Client 入口，仅导出 apply/inject
    ├── shell/                       # 插件装配、全局模型、侧边栏、页面容器、路由
    ├── settings/                    # App Key 校验、存储和设置页
    ├── api/                         # AgentDuel HTTP 客户端、协议类型和请求测试
    ├── deathmatch/                  # 死斗角色功能域
    ├── capture-the-flag/            # 夺旗团队功能域
    ├── battles/                     # 两种玩法共用的战斗功能域
    ├── spectate/                    # 无 App Key 的公开观战
    ├── conversations/               # DSH 会话、代码优化、战斗链接桥接
    ├── shared/                      # 页面类型、加载状态、请求生命周期等通用能力
    └── styles/                      # 插件自有样式和 npm 组件样式聚合
```

### `shell/`

- `plugin.tsx`：注册 `sidebar.footer.action`、`shell.overlay`、`conversation` 三个 slot，并把依赖注入到页面。
- `model.ts`：维护侧边栏展开状态、当前 `AgentDuelRoute`、App Key 和页面开关。
- `sidebar.tsx`：插件菜单和最近的 Agent 优化会话。
- `page-host.tsx`：App Key、公开观战、会话编辑器和业务页面的顶层分流；承载唯一的 Turnstile 容器。
- `feature-router.tsx`：把业务路由映射到具体页面。
- `routes.ts`：路由联合类型、`#agentduel/` URL 序列化与解析、App Key 门禁。
- `logo.tsx`：内联品牌 SVG。

### 业务功能域

- `deathmatch/`：角色列表、新建、编辑、本人详情、公开详情，以及角色映射器和死斗错误适配器。
- `capture-the-flag/`：团队列表、新建、编辑、本人详情、公开详情，以及团队映射器和夺旗错误适配器。
- `battles/`：发起战斗、最近战斗、详情战斗记录、分页状态、回放、跨包展示映射、复盘提示词和战斗错误适配器。
- `spectate/`：轮播最近公开排位回放，不要求 App Key。
- `conversations/`：创建 DSH 会话、选择模型、提交提示词、侧边栏历史、对话完成判断和战斗链接桥接。

### 基础设施

- `api/client.ts`：API Base URL、插件类型与版本、HTTP 类型、统一请求方法和所有数据访问函数。
- `settings/app-key.ts`：App Key 格式、`localStorage` 读写和独立的 `/api/integrations/check` 请求。
- `shared/load-state.tsx`：加载/错误状态与 App Key 失效处理。
- `shared/request-scope.ts`：页面卸载时中止请求、Turnstile token 生命周期和剪贴板工具。
- `shared/turnstile.ts`：Turnstile 脚本加载、显式执行、释放和错误类型。
- `shared/module-link.tsx`：把 npm UI 组件产生的插件内链接转为内部路由导航。
- `styles/styles.ts`：插件自有 CSS，使用一个 `String.raw` 字符串集中维护。
- `styles/package-styles.ts`：用 `?inline` 聚合 AgentDuel npm 组件 CSS。

## 目录与依赖边界

- 功能目录内直接平铺文件，不为单个文件增加同名子目录，不创建桶式 `index.ts`。
- 测试与被测模块放在同一功能目录，文件名使用 `*.test.ts` 或 `*.test.tsx`。
- TypeScript 使用 `NodeNext`。源码中的相对导入必须保留 `.js` 后缀，即使实际文件是 `.ts` 或 `.tsx`。
- `shell` 负责装配和路由，可以导入各功能域；功能域可以依赖 `api`、`shared`、`conversations` 及 `shell/routes.ts`，不要反向把业务页面塞回 `shared`。
- 只服务死斗的映射和错误处理留在 `deathmatch`；只服务夺旗的留在 `capture-the-flag`；两种模式都使用的战斗逻辑放在 `battles`。
- 新增跨模式能力时优先通过严格联合类型和 props 参数复用，不复制两个仅传不同常量的包装页面。
- 外部 `@agentduel/*` 包是展示层。API 数据到外部组件 props 的转换应留在各模式 mapper 或 `battles/presenters.ts`，不要让页面散落重复转换。

## 跨模式复用约定

玩法标识只能使用 API 定义的精确值：

```ts
type GameModeId = 'deathmatch' | 'captureTheFlag'
```

- 最近战斗统一使用 `RecentBattlesPage({ mode, appKey, navigation })`。组件内部依据 `mode` 选择实体加载器、战斗 mapper、错误适配器、链接和对应 npm UI。
- 详情战斗记录统一使用 `BattleRecords({ mode, view, publicId, appKey, navigation })`，其中 `view` 为 `'owned' | 'public'`。
- 两种模式共享 `useDetailBattleRecords` 的初始加载、分页、重试和中止状态。
- 本人详情与公开详情必须使用正确的记录接口和详情链接；公开页面不能错误跳回本人页面。
- `routeHref` 是生成插件内部链接的唯一入口，外部组件使用 `useModuleLink` 接管这些链接。

## 路由修改清单

新增或修改页面路由时，至少同步检查：

1. `shell/routes.ts` 中的 `AgentDuelRoute`、`AgentDuelFeatureRoute`、`requiresAgentDuelAppKey`。
2. `routeHref()` 与 `parseAgentDuelHref()` 是否可往返，动态参数是否分别编码和解码。
3. `shell/feature-router.tsx` 的页面映射和用于重新挂载页面的 key。
4. `shell/page-host.tsx` 的可访问性标签；特殊页面是否需要在顶层单独分流。
5. `shell/sidebar.tsx` 的入口和当前项判断。
6. `shell/routes.test.ts` 的往返、查询参数和 App Key 门禁断言。

公开的 URL 格式、查询参数、客户端 `apply` 和 `inject` 属于兼容性接口，不得在普通重构中改变。

## API、认证与安全边界

- 生产 API 为 `https://api.agentduel.app`，官网为 `https://www.agentduel.app`。
- App Key 格式为 `agent_` 加 16 位字母数字，存储键为 `agentduel.app_key`。不要把完整 App Key 写入日志、错误、URL、遥测、测试快照或非 AgentDuel 域名请求。
- 已认证的 Integrations 请求统一经过 `agentDuelRequest()`，固定使用 `credentials: 'omit'`、Bearer App Key、`Accept: application/json` 和 `Accept-Language: zh-CN`。
- 只有 `/api/integrations` 路径上报 `AgentDuel-Type` 和 `AgentDuel-Plugin-Version`。公开观战接口和外部回放资源不得携带 App Key 或这两个集成标识头。
- `AGENTDUEL_PLUGIN_VERSION` 当前在 `api/client.ts` 中集中定义。发布版本时必须与 `package.json.version` 同步，并更新相应测试。
- `/api/integrations/check` 在 `settings/app-key.ts` 中独立实现，不经过 `agentDuelRequest()`；变更通用认证头、版本头、语言或凭据策略时必须单独审查它。
- `GET` 请求只对网络错误和临时 5xx 做有限重试；写请求不得自动重放。
- 业务判断使用 HTTP 状态和 `error.code`，不要匹配可能受语言影响的 `error.message`。`401 INVALID_INTEGRATION_APP_KEY` 应清理本地 Key 并引导用户重新设置。
- 所有写请求使用当前操作刚取得的 Turnstile token，通过 `X-Turnstile-Token` 发送。token 不缓存、不复用、不持久化、不记录；请求结束必须释放 challenge。
- 页面请求必须绑定 `AbortSignal`。优先使用 `useRequestScope()`，组件卸载或重新查询时中止旧请求，避免旧响应覆盖新状态。
- 外部回放 URL 只能用无认证的 `fetch`，并固定 `credentials: 'omit'`。
- API 协议有变化时同时更新 `docs/API.md`、客户端类型、数据映射、错误适配器和测试。

## DSH 状态与本地存储

- 插件导航状态由 `createAgentDuelModel()` 管理，不引入额外的页面级全局状态容器。
- DSH 负责真实会话、模型目录、工作区和会话执行状态；插件只保存用于侧边栏关联的轻量索引。
- Agent 会话索引存储键为 `agentduel.conversations.v1`，最多保留 100 条，侧边栏最多展示 5 条。
- 删除侧边栏记录只删除插件索引，不应擅自删除 DSH 原生会话。
- 浏览器禁用 `localStorage` 时应降级为未配置或仅当前页面内状态，不能因此让插件崩溃。

## 样式与 UI 约定

- 外部组件 CSS 由 `styles/package-styles.ts` 内联，自有覆盖和插件页面 CSS 写在 `styles/styles.ts`；最终由 `shell/plugin.tsx` 注入单个 `<style>`。
- 不创建需要额外部署的 CSS 或静态图片路径。品牌图标保持内联 SVG。
- 未明确要求视觉变更时，保留文案、DOM class、选择器、布局和组件交互。
- 侧边栏展开卡片自身保留圆角和阴影；顶部 AgentDuel 入口、菜单项及 Agent 优化会话的 hover 背景保持直角。收起后的 rail 图标按钮仍为圆形。
- 插件内部链接必须在 DSH 当前页面内导航；只有明确的官网功能才使用新窗口外链，并带 `noopener,noreferrer`。
- 外部 AgentDuel UI 通常使用 `locale="zh-CN"`、`i18nMode="bundled"` 和 `assetBaseUrl={WEBSITE_BASE_URL}`，修改时保持同类页面一致。

## 构建与依赖

- 包管理器为 `pnpm@11.7.0`，TypeScript 开启严格模式，React 为 DSH 提供的 peer runtime。
- `tsdown.config.ts` 构建 Node ESM Host 入口和浏览器 CJS Client bundle。Client bundle 被包装进 `window.__ModuleLoader__.load(...)`，不要移除该 banner、intro 或 footer。
- `platformModules` 必须保持外置，避免把 React、Cordis 或 DSH Client runtime 重复打进插件。重复框架实例会破坏 Context 和 slot 注入。
- `@agentduel/*` 业务 UI 及其依赖会进入浏览器 bundle。升级这些包时检查 `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml` 的构建允许项、CSS 导入和 mapper 类型。
- `README.md` 负责用户使用和安装说明；实际版本与依赖以 `package.json` 为准，变更依赖后同步校正 README 中容易漂移的信息。

## 常用命令

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

本地联调：

```bash
pnpm watch
dsh web
```

首次安装和配置检查：

```bash
dsh plugin --profile web add .
dsh --profile web --dump-config
```

没有全局 `dsh` 时使用 `pnpm dlx @deepseek-ai/dsh`。

## 测试与完成标准

- API 变化：运行 `src/client/api/client.test.ts`，覆盖 URL、查询参数、认证头、版本头、公开请求隔离、重试和错误码。
- 路由变化：运行 `src/client/shell/routes.test.ts`，覆盖 URL 往返、详情跳转和门禁。
- 模式映射变化：运行角色/团队 mapper 测试及对应详情测试。
- 战斗变化：运行最近战斗、战斗展示映射、分页和复盘提示词相关测试。
- 会话变化：运行 `src/client/conversations/conversations.test.ts`，覆盖存储校验、模型选择、状态和战斗链接。
- 样式变化：更新 `src/client/styles/styles.test.ts` 中针对关键选择器和布局不变量的断言。
- 完成交付前默认执行完整的 `pnpm test`、`pnpm typecheck`、`pnpm build` 和 `git diff --check`。
- 构建成功后确认没有旧路径引用、遗漏导出、循环依赖或意外新增的生成物。不要用固定测试数量作为完成条件，测试数量会随功能增长。

## 常见修改落点

- 新增死斗角色能力：优先放入 `deathmatch/`，跨模式部分再提取到 `battles/` 或 `shared/`。
- 新增夺旗团队能力：优先放入 `capture-the-flag/`，保持与死斗目录对称但不机械复制跨模式逻辑。
- 新增战斗筛选或分页：从 `api/client.ts` 的查询参数开始，随后更新 `battles/` 数据源、npm UI props 和请求去重测试。
- 新增页面：先确定功能域，再更新路由清单中的所有位置；不要把大型页面重新集中到单一 `pages.tsx`。
- 新增 DSH 会话能力：从 `conversations/service.ts` 扩展服务边界，页面通过服务接口使用，不直接在多个组件中调用 connection API。
- 新增全局样式：放入 `styles/styles.ts`；第三方包样式只在 `styles/package-styles.ts` 聚合一次。
- 修改发布版本：同步 `package.json.version`、`AGENTDUEL_PLUGIN_VERSION`、锁文件以及依赖版本相关文档和测试。
