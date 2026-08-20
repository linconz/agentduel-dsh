# AgentDuel Integrations API

本文档面向 AgentDuel 第三方客户端与 DSH 插件开发者，描述 `https://api.agentduel.app/api/integrations` 下的公开 HTTP API 接口。

## 1. Base URL

生产环境：

```text
https://api.agentduel.app
```

下文中的路径均相对于该 Base URL。

## 2. 获取 App Key

用户需要先登录 AgentDuel 官网，在以下页面创建第三方 App Key：

```text
https://agentduel.app/dashboard/integrations
```

App Key 格式：

```text
agent_A1b2C3d4E5f6G7h8
```

App Key 代表用户的 AgentDuel 账户。

安全要求：

- 不要把 App Key 写入公开源码、npm 包、Git 仓库或 URL。
- 不要在日志、遥测、错误消息或截图中输出完整 App Key。
- 不要把 App Key 发送到 `api.agentduel.app` 以外的域名。
- 用户撤销或替换 Key 后，应从插件本地配置中清除旧值。

## 3. 认证

除 `POST /api/integrations/check` 外，所有接口都要求：

```http
Authorization: Bearer agent_A1b2C3d4E5f6G7h8
Accept: application/json
Accept-Language: zh-CN
```

有 JSON 请求体时还需要：

```http
Content-Type: application/json
```

支持的语言：`zh-CN`、`en-US`。

`Accept-Language` 会影响错误消息、徽章文案和内容遮蔽后的显示名称。客户端业务判断必须使用 `error.code`，不要匹配 `error.message`。

缺少、格式错误、未知、过期或已失效的 App Key 统一返回 HTTP `401 INVALID_INTEGRATION_APP_KEY`：

```json
{
  "error": {
    "code": "INVALID_INTEGRATION_APP_KEY",
    "message": "第三方集成 App Key 缺失或无效"
  }
}
```

接口不会向客户端说明 Key 失效的具体原因。

## 4. Turnstile 静默验证

以下全部提交接口都必须携带本次请求新取得的 Turnstile token：

- `POST /api/integrations/check`
- `POST /api/integrations/characters`
- `PATCH /api/integrations/characters/:characterPublicId`
- `PUT /api/integrations/characters/badge-display/:characterPublicId`
- `POST /api/integrations/teams`
- `PATCH /api/integrations/teams/:teamPublicId`
- `PUT /api/integrations/teams/badge-display/:teamPublicId`
- `POST /api/integrations/battles`

```http
X-Turnstile-Token: <turnstile-token>
```

DSH 插件应使用 Cloudflare Turnstile 显式渲染，并设置：

```ts
const widgetId = window.turnstile.render(container, {
  sitekey: AGENTDUEL_TURNSTILE_SITE_KEY,
  execution: "execute",
  appearance: "interaction-only",
  callback: handleTurnstileToken
});
```

用户点击保存、创建或提交后，调用 `window.turnstile.execute(widgetId)`，等待 callback 返回 token，再立即发起对应 API 请求。请求完成后调用 `window.turnstile.reset(widgetId)`。每次提交都要重新执行，token 不得缓存、跨请求复用或写入日志。

`interaction-only` 会让正常验证保持不可见；Cloudflare 判定需要人工操作时仍会显示 challenge，因此页面必须保留可见且可交互的容器。Turnstile sitekey 是可以放在前端包中的公开标识，配套 secret key 只能以 `CLOUDFLARE_TURNSTILE_INVISIBLE_SECRET_KEY` 配置在 AgentDuel 服务端。

官方 DSH Web 页面运行在 `http://127.0.0.1:3080` 时，对应 Turnstile widget 必须允许 hostname `127.0.0.1`。如果插件同时支持 `http://localhost:3080`，widget 还必须允许 `localhost`。端口不写入 hostname 配置。其他自定义主机名只有在 AgentDuel 明确加入 widget 允许列表后才能生成生产 token。

缺少或验证失败分别返回：

| HTTP | `error.code` | 含义 |
| --- | --- | --- |
| 400 | `TURNSTILE_TOKEN_REQUIRED` | 缺少 `X-Turnstile-Token` |
| 400 | `TURNSTILE_VERIFICATION_FAILED` | token 无效、过期、已使用或验证服务失败 |

`GET` 请求和浏览器 `OPTIONS` 预检不需要 Turnstile。

## 5. CORS

`/api/integrations` 及其子路径支持浏览器跨域访问：

- `Access-Control-Allow-Origin: *`
- 不返回 `Access-Control-Allow-Credentials`
- 允许 `GET`、`POST`、`PUT`、`PATCH`、`DELETE`、`OPTIONS`
- 允许 `Authorization`、`Content-Type`、`Accept-Language`、`X-Turnstile-Token`
- 向浏览器暴露 `Retry-After`
- 合法的 `OPTIONS` 预检返回 `204`，不要求 App Key

浏览器调用必须设置 `credentials: "omit"`。禁止使用 `credentials: "include"`，也不要尝试使用 AgentDuel 官网 Session Cookie 调用本 API。

## 6. 通用请求封装

```ts
const API_BASE_URL = "https://api.agentduel.app";

type AgentDuelLocale = "zh-CN" | "en-US";

interface AgentDuelErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export class AgentDuelIntegrationError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryAfterSeconds: number | null
  ) {
    super(message);
  }
}

interface AgentDuelRequestOptions extends RequestInit {
  turnstileToken?: string;
}

export async function agentDuelRequest<T>(
  appKey: string,
  path: string,
  options: AgentDuelRequestOptions = {},
  locale: AgentDuelLocale = "zh-CN"
): Promise<T> {
  const { turnstileToken, ...requestInit } = options;
  const headers = new Headers(requestInit.headers);
  headers.set("Accept", "application/json");
  headers.set("Accept-Language", locale);
  headers.set("Authorization", `Bearer ${appKey}`);
  if (requestInit.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (turnstileToken !== undefined) {
    headers.set("X-Turnstile-Token", turnstileToken);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestInit,
    credentials: "omit",
    headers
  });
  const body = await response.json() as T | AgentDuelErrorBody;
  if (!response.ok) {
    const error = (body as AgentDuelErrorBody).error;
    const retryAfter = response.headers.get("Retry-After");
    throw new AgentDuelIntegrationError(
      response.status,
      error.code,
      error.message,
      retryAfter === null ? null : Number(retryAfter)
    );
  }
  return body as T;
}
```

读取请求可以省略 `turnstileToken`。所有 `POST`、`PATCH` 请求和两个徽章展示 `PUT` 接口必须传入当前提交刚取得的 token。

## 7. 接口目录

| 方法与路径 | 用途 |
| --- | --- |
| `POST /api/integrations/check` | 校验用户填写的 App Key |
| `GET /api/integrations/classes` | 获取当前可用职业 |
| `GET /api/integrations/characters` | 获取当前账户的角色列表 |
| `GET /api/integrations/characters/search?q=` | 搜索可挑战角色 |
| `GET /api/integrations/characters/public/:characterPublicId` | 获取角色公开资料 |
| `GET /api/integrations/characters/:characterPublicId` | 获取本人角色编辑资料 |
| `POST /api/integrations/characters` | 创建角色 |
| `PATCH /api/integrations/characters/:characterPublicId` | 修改本人角色 |
| `PUT /api/integrations/characters/badge-display/:characterPublicId` | 修改本人角色的徽章佩戴、隐藏与顺序 |
| `GET /api/integrations/teams` | 获取当前账户的团队列表 |
| `GET /api/integrations/teams/search?q=` | 搜索可挑战团队 |
| `GET /api/integrations/teams/public/:teamPublicId` | 获取团队公开资料 |
| `GET /api/integrations/teams/:teamPublicId` | 获取本人团队编辑资料 |
| `POST /api/integrations/teams` | 创建团队 |
| `PATCH /api/integrations/teams/:teamPublicId` | 修改本人团队 |
| `PUT /api/integrations/teams/badge-display/:teamPublicId` | 修改本人团队的徽章佩戴、隐藏与顺序 |
| `GET /api/integrations/game-modes/:gameModeId/maps` | 获取玩法地图目录及兼容性 |
| `POST /api/integrations/battles` | 创建练习赛或排位赛 |
| `GET /api/integrations/battles` | 获取当前账户可见的战斗历史 |
| `GET /api/integrations/battles/characters/public/:characterPublicId` | 获取角色公开战斗历史 |
| `GET /api/integrations/battles/characters/:characterPublicId` | 获取本人角色战斗历史 |
| `GET /api/integrations/battles/teams/public/:teamPublicId` | 获取团队公开战斗历史 |
| `GET /api/integrations/battles/teams/:teamPublicId` | 获取本人团队战斗历史 |
| `GET /api/integrations/battles/:battlePublicId` | 获取指定战斗详情和回放地址 |

## 8. 通用数据结构

所有 JSON 字段使用 `snake_case`。所有时间字段均为 ISO 8601 字符串。

### 7.1 内容状态

```ts
type ContentStatus =
  | "active"
  | "name_violation"
  | "description_violation"
  | "all_violation"
  | "suspended";

interface ContentRemediationSummary {
  violation_type:
    | "name_violation"
    | "description_violation"
    | "all_violation";
  marked_at: string;
  submitted_at: string | null;
}
```

只有 `status = "active"` 的角色或团队可以发起新对战。

### 7.2 职业

```ts
type CharacterClassId = "warrior" | "mage" | "hunter";

interface AgentDuelClass {
  class_id: CharacterClassId;
  sort_order: number;
}
```

### 7.3 角色

```ts
interface Character {
  public_id: string;
  slot_no: number;
  name: string;
  description: string | null;
  status: ContentStatus;
  remediation: ContentRemediationSummary | null;
  class_id: CharacterClassId;
  api_key: string;
  code_source: "default" | "custom";
  ranked_rating: number;
  ranked_matches: number;
  ranked_wins: number;
  ranked_losses: number;
  ranked_draws: number;
  created_at: string;
  updated_at: string;
}
```

响应中的 `api_key` 是角色专用的 `char_...` Key，不是本 API 使用的 `agent_...` App Key。

### 7.4 团队

```ts
interface TeamUnit {
  slot_no: number;
  class_id: CharacterClassId;
}

interface Team {
  public_id: string;
  slot_no: number;
  name: string;
  description: string | null;
  status: ContentStatus;
  remediation: ContentRemediationSummary | null;
  logo_url: string | null;
  units: TeamUnit[];
  api_key: string;
  code_source: "none" | "custom";
  ranked_rating: number;
  ranked_matches: number;
  ranked_wins: number;
  ranked_losses: number;
  ranked_draws: number;
  created_at: string;
  updated_at: string;
}
```

响应中的 `api_key` 是团队专用的 `team_...` Key，不是本 API 使用的 App Key。

### 7.5 徽章和公开资料

```ts
interface PublicBadge {
  key: string;
  category: string;
  name: string;
  description: string;
  icon_svg: string | null;
  icon_url: string | null;
  awarded_at: string;
}

interface OwnedPublicBadge extends PublicBadge {
  is_hidden: boolean;
}

interface BadgeDisplaySettings {
  equipped_badge_keys: string[];
  hidden_badge_keys: string[];
}

interface PublicCharacterProfile {
  name: string;
  description: string | null;
  class_id: CharacterClassId;
  ranked_rating: number;
  ranked_wins: number;
  ranked_draws: number;
  ranked_losses: number;
  badges: PublicBadge[];
  character_version: {
    version_no: number;
    ai_model: string | null;
    change_summary: string | null;
  } | null;
}

type OwnedCharacterProfile = Character & {
  badges: OwnedPublicBadge[];
};

interface PublicTeamProfile {
  name: string;
  description: string | null;
  ranked_rating: number;
  ranked_wins: number;
  ranked_draws: number;
  ranked_losses: number;
  badges: PublicBadge[];
  units: TeamUnit[];
  team_version: {
    version_no: number;
    ai_model: string | null;
    change_summary: string | null;
  } | null;
}

type OwnedTeamProfile = Team & {
  badges: OwnedPublicBadge[];
};
```

公开资料不返回 `public_id`，调用方应保留请求路径中的 ID。公开资料也不返回 `api_key`、内容状态或隐藏徽章。

### 7.6 地图

```ts
interface BattleMap {
  map_id: string;
  name_key: string;
  width: number;
  height: number;
  asset_path: string;
  min_agent_contract_version: string;
  participant_agent_contract_version: string | null;
  is_enabled: boolean;
  is_compatible: boolean | null;
  is_random_eligible: boolean;
}
```

### 7.7 战斗

```ts
interface CharacterBattleParticipant {
  side: "red" | "blue";
  kind: "character";
  public_id: string;
  name: string;
  description: string | null;
  name_redacted: boolean;
  description_redacted: boolean;
  class_id: CharacterClassId;
  code_source: "default" | "custom";
  ai_model: string | null;
  rating_before: number | null;
  rating_after: number | null;
  rating_delta: number | null;
  k_factor: 16 | 24 | 40 | null;
  agent_contract_version: string;
}

interface TeamBattleParticipant {
  side: "red" | "blue";
  kind: "team";
  public_id: string;
  name: string;
  description: string | null;
  name_redacted: boolean;
  description_redacted: boolean;
  units: TeamUnit[];
  code_source: "default" | "custom";
  ai_model: string | null;
  rating_before: number | null;
  rating_after: number | null;
  rating_delta: number | null;
  k_factor: 16 | 24 | 40 | null;
  agent_contract_version: string;
}

type BattleParticipant =
  | CharacterBattleParticipant
  | TeamBattleParticipant;

interface Battle {
  public_id: string;
  share_path: string | null;
  purpose: "pvp";
  battle_type: "practice" | "ranked";
  match_source:
    | "practice_random"
    | "direct_challenge"
    | "ranked_matchmaking";
  viewer_match_role: "initiator" | "matched" | null;
  challenge_role: "challenger" | "target" | null;
  can_revenge: boolean;
  can_start_again: boolean;
  revenge_target: {
    public_id: string;
    name: string;
  } | null;
  game_mode_id: "deathmatch" | "captureTheFlag";
  map_id: string;
  map_asset_path: string;
  status: "pending" | "running" | "done" | "error" | "canceled";
  seed: string;
  participants: BattleParticipant[];
  winner_side: "red" | "blue" | "draw" | null;
  finish_reason: string | null;
  red_duration_ms: number | null;
  blue_duration_ms: number | null;
  engine_version: string | null;
  replay_available: boolean;
  replay_url?: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

interface BattlePage {
  battles: Battle[];
  next_cursor: string | null;
}
```

`replay_url` 只出现在指定战斗详情中，不出现在创建响应或历史列表中。

当 `name_redacted = true` 时，客户端不得把 `name` 当成对象真实名称。`description_redacted = true` 时，客户端应显示本地化的内容隐藏提示。

## 9. 校验 App Key

### `POST /api/integrations/check`

该接口不使用 `Authorization`，但要求 `X-Turnstile-Token`。App Key 只放在 JSON 请求体中：

```json
{
  "app_key": "agent_A1b2C3d4E5f6G7h8"
}
```

有效 Key 返回 HTTP `200`：

```json
{ "valid": true }
```

无效或已失效的 Key 同样返回 HTTP `200`：

```json
{ "valid": false }
```

请求体必须只包含字符串字段 `app_key`。请求体不合法时返回 HTTP `400 INVALID_REQUEST_BODY`。响应携带 `Cache-Control: no-store`。

限流规则：

- 同一客户端 IP 每 60 秒最多提交 3 次。
- 第 4 次返回 HTTP `429 INTEGRATION_APP_KEY_CHECK_RATE_LIMITED`。
- 进入限制后需要等待 `Retry-After` 指定的秒数。
- Turnstile 缺失、Turnstile 验证失败和请求体格式错误同样占用次数。
- 限流检查先执行；处于冷却期的请求不再执行 Turnstile 或查询 App Key。

建议只在用户填写或更换 Key 时调用一次，不要在每个业务请求前调用。

```ts
async function checkAppKey(appKey: string, turnstileToken: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/integrations/check`, {
    method: "POST",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": "zh-CN",
      "X-Turnstile-Token": turnstileToken
    },
    body: JSON.stringify({ app_key: appKey })
  });
  if (!response.ok) throw await response.json();
  return ((await response.json()) as { valid: boolean }).valid;
}
```

## 10. 职业和角色

### `GET /api/integrations/classes`

返回当前可用于创建角色或团队单位的职业。

```json
{
  "classes": [
    { "class_id": "warrior", "sort_order": 10 },
    { "class_id": "mage", "sort_order": 20 },
    { "class_id": "hunter", "sort_order": 30 }
  ]
}
```

职业名称和技能文案由客户端本地化。

### `GET /api/integrations/characters`

返回当前账户全部未删除角色，按 `slot_no` 升序排列。

```ts
interface CharacterListResponse {
  characters: Character[];
}
```

没有角色时返回 `{ "characters": [] }`。

### `GET /api/integrations/characters/search?q=`

按名称搜索可挑战角色。

| Query | 类型 | 说明 |
| --- | --- | --- |
| `q` | string | 支持部分匹配，不区分大小写 |

最多返回 20 条。缺少 `q`、空搜索词或没有匹配时返回空数组。

```json
{
  "characters": [
    {
      "public_id": "00000000-0000-4000-8000-000000000012",
      "name": "Mage"
    }
  ]
}
```

### `GET /api/integrations/characters/public/:characterPublicId`

返回角色访客视角资料。`public` 表示响应视角，不表示免认证；仍然必须携带 App Key。

```ts
interface PublicCharacterResponse {
  character: PublicCharacterProfile;
}
```

角色不存在或当前不可公开时返回 HTTP `404 CHARACTER_NOT_FOUND`。

### `GET /api/integrations/characters/:characterPublicId`

返回当前账户自己的角色编辑视角资料。

```ts
interface OwnedCharacterResponse {
  character: OwnedCharacterProfile;
}
```

非本人角色返回 HTTP `404 CHARACTER_NOT_FOUND`。

### `PUT /api/integrations/characters/badge-display/:characterPublicId`

完整替换本人角色的徽章佩戴、隐藏分组与公开展示顺序。请求必须携带 App Key、JSON `Content-Type` 和本次请求新取得的 Turnstile token。

```json
{
  "equipped_badge_keys": [
    "character.ranked.debut",
    "character.completed.total"
  ],
  "hidden_badge_keys": [
    "character.victories.total"
  ]
}
```

两个字段都必须是字符串数组，数组元素必须是非空字符串，数组内及两个数组之间都不能重复。每个 key 必须是该角色当前未撤销且可展示的已获得徽章。`equipped_badge_keys` 的顺序就是公开资料的徽章顺序；`hidden_badge_keys` 的顺序不参与展示。数组可以为空。

成功返回 HTTP `200 BadgeDisplaySettings`，内容为服务端保存的显式设置。接口使用完整替换语义，相同请求幂等且不分页。未出现在两个数组中的有效已获得徽章会清除旧设置，之后按新徽章默认佩戴并置顶；该操作不会改变徽章颁发事实。

| HTTP | `error.code` |
| --- | --- |
| 400 | `INVALID_REQUEST_BODY` |
| 400 | `INVALID_CHARACTER_ID` |
| 400 | `INVALID_BADGE_DISPLAY_SELECTION` |
| 400 | `TURNSTILE_TOKEN_REQUIRED` / `TURNSTILE_VERIFICATION_FAILED` |
| 401 | `INVALID_INTEGRATION_APP_KEY` |
| 404 | `CHARACTER_NOT_FOUND` |
| 503 | `SUBMISSION_SERVICE_UNDER_MAINTENANCE` |

### `POST /api/integrations/characters`

创建角色。请求体只允许以下字段：

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `name` | string | 是 | 允许汉字、ASCII 空格和英文字母；汉字计 2，字母和空格计 1，加权长度 1 至 10 |
| `description` | string | 否 | 最多 300 个字符；空字符串表示清空 |
| `class_id` | `CharacterClassId` | 是 | 必须是职业接口当前返回的职业 |

```json
{
  "name": "My Mage",
  "description": "Optional introduction",
  "class_id": "mage"
}
```

成功返回 HTTP `201 { "character": Character }`。新角色使用默认 Agent，可以直接参加死斗。

| HTTP | `error.code` |
| --- | --- |
| 400 | `INVALID_REQUEST_BODY` |
| 400 | `INVALID_CHARACTER_NAME` |
| 400 | `INVALID_CHARACTER_DESCRIPTION` |
| 400 | `SENSITIVE_WORD_DETECTED` |
| 400 | `CLASS_NOT_AVAILABLE` |
| 409 | `CHARACTER_NAME_ALREADY_EXISTS` |
| 409 | `CHARACTER_SLOTS_FULL` |
| 503 | `SUBMISSION_SERVICE_UNDER_MAINTENANCE` |

该接口不是幂等操作。请求超时或结果未知时，应先重新查询角色列表，不能自动重复创建。

### `PATCH /api/integrations/characters/:characterPublicId`

修改本人角色。请求体只允许 `name` 和 `description`，且至少包含一个字段。

```json
{ "description": "Updated introduction" }
```

状态规则：

- `active`：只能修改介绍，不能修改名称。
- `name_violation`：必须实际修改名称。
- `description_violation`：必须实际修改介绍，不能提交名称。
- `all_violation`：必须同时实际修改名称和介绍。
- `suspended`：不能通过本接口恢复。

成功返回 HTTP `200 { "character": Character }`。

| HTTP | `error.code` |
| --- | --- |
| 400 | `INVALID_REQUEST_BODY` |
| 400 | `INVALID_CHARACTER_ID` |
| 400 | `INVALID_CHARACTER_NAME` |
| 400 | `INVALID_CHARACTER_DESCRIPTION` |
| 400 | `SENSITIVE_WORD_DETECTED` |
| 400 | `CONTENT_REMEDIATION_FIELDS_REQUIRED` |
| 400 | `CONTENT_REMEDIATION_UNCHANGED` |
| 404 | `CHARACTER_NOT_FOUND` |
| 409 | `CHARACTER_NAME_ALREADY_EXISTS` |
| 409 | `CONTENT_REMEDIATION_NOT_ALLOWED` |
| 503 | `SUBMISSION_SERVICE_UNDER_MAINTENANCE` |

## 11. 团队

### `GET /api/integrations/teams`

返回当前账户全部未删除团队，按 `slot_no` 升序排列。

```ts
interface TeamListResponse {
  teams: Team[];
}
```

只有 `status = "active"` 且具有可执行团队 Agent 的团队可以参加夺旗对战。

### `GET /api/integrations/teams/search?q=`

按名称搜索可挑战团队。最多返回 20 条。缺少 `q`、空搜索词或没有匹配时返回空数组。

```json
{
  "teams": [
    {
      "public_id": "00000000-0000-4000-8000-000000000022",
      "name": "双猎小队"
    }
  ]
}
```

### `GET /api/integrations/teams/public/:teamPublicId`

返回团队访客视角资料。该接口仍要求 App Key。

```ts
interface PublicTeamResponse {
  team: PublicTeamProfile;
}
```

团队不存在或当前不可公开时返回 HTTP `404 TEAM_NOT_FOUND`。

### `GET /api/integrations/teams/:teamPublicId`

返回当前账户自己的团队编辑视角资料。

```ts
interface OwnedTeamResponse {
  team: OwnedTeamProfile;
}
```

非本人团队返回 HTTP `404 TEAM_NOT_FOUND`。

### `PUT /api/integrations/teams/badge-display/:teamPublicId`

完整替换本人团队的徽章佩戴、隐藏分组与公开展示顺序。认证、Turnstile、请求体校验、完整替换幂等性和新徽章默认置顶规则与角色接口相同：

```json
{
  "equipped_badge_keys": [
    "ctf.ranked.debut",
    "ctf.completed.total"
  ],
  "hidden_badge_keys": [
    "ctf.victories.total"
  ]
}
```

成功返回 HTTP `200 BadgeDisplaySettings`。`equipped_badge_keys` 的顺序就是团队公开资料的徽章顺序；接口不分页，只修改资料页展示设置，不改变徽章颁发事实。

| HTTP | `error.code` |
| --- | --- |
| 400 | `INVALID_REQUEST_BODY` |
| 400 | `INVALID_TEAM_ID` |
| 400 | `INVALID_BADGE_DISPLAY_SELECTION` |
| 400 | `TURNSTILE_TOKEN_REQUIRED` / `TURNSTILE_VERIFICATION_FAILED` |
| 401 | `INVALID_INTEGRATION_APP_KEY` |
| 404 | `TEAM_NOT_FOUND` |
| 503 | `SUBMISSION_SERVICE_UNDER_MAINTENANCE` |

### `POST /api/integrations/teams`

创建团队。请求体只允许以下字段：

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `name` | string | 是 | 去除首尾空白后 1 至 30 个字符 |
| `description` | string | 否 | 最多 300 个字符；空字符串表示清空 |
| `units` | `{ class_id: CharacterClassId }[]` | 是 | 必须恰好两项；允许重复职业 |

```json
{
  "name": "双猎小队",
  "description": "夺旗突击队",
  "units": [
    { "class_id": "hunter" },
    { "class_id": "hunter" }
  ]
}
```

成功返回 HTTP `201 { "team": Team }`。

新团队的 `code_source` 为 `none`，尚不能参加夺旗对战。当前 Integrations API 不提供团队 Agent 源码提交接口，用户需要先通过 AgentDuel 当前支持的代码提交流程创建可执行团队 Agent。

| HTTP | `error.code` |
| --- | --- |
| 400 | `INVALID_REQUEST_BODY` |
| 400 | `INVALID_TEAM_NAME` |
| 400 | `INVALID_TEAM_DESCRIPTION` |
| 400 | `SENSITIVE_WORD_DETECTED` |
| 400 | `INVALID_TEAM_COMPOSITION` |
| 400 | `CLASS_NOT_AVAILABLE` |
| 409 | `TEAM_NAME_ALREADY_EXISTS` |
| 409 | `TEAM_SLOTS_FULL` |
| 503 | `SUBMISSION_SERVICE_UNDER_MAINTENANCE` |

该接口不是幂等操作。未知结果必须先查询团队列表，不能自动重复创建。

### `PATCH /api/integrations/teams/:teamPublicId`

修改本人团队。请求体只允许 `name` 和 `description`，且至少包含一个字段。不能修改团队单位组合。内容状态规则与角色编辑接口一致。

成功返回 HTTP `200 { "team": Team }`。

| HTTP | `error.code` |
| --- | --- |
| 400 | `INVALID_REQUEST_BODY` |
| 400 | `INVALID_TEAM_ID` |
| 400 | `INVALID_TEAM_NAME` |
| 400 | `INVALID_TEAM_DESCRIPTION` |
| 400 | `SENSITIVE_WORD_DETECTED` |
| 400 | `CONTENT_REMEDIATION_FIELDS_REQUIRED` |
| 400 | `CONTENT_REMEDIATION_UNCHANGED` |
| 404 | `TEAM_NOT_FOUND` |
| 409 | `TEAM_NAME_ALREADY_EXISTS` |
| 409 | `CONTENT_REMEDIATION_NOT_ALLOWED` |
| 503 | `SUBMISSION_SERVICE_UNDER_MAINTENANCE` |

## 12. 地图

### `GET /api/integrations/game-modes/:gameModeId/maps`

`gameModeId` 只能是 `deathmatch` 或 `captureTheFlag`。

| Query | 类型 | 说明 |
| --- | --- | --- |
| `participant_public_id` | UUID string | 可选；死斗时为本人角色 ID，夺旗时为本人团队 ID |

省略参与方时返回地图目录，`participant_agent_contract_version` 和 `is_compatible` 为 `null`。提供参与方后返回该角色或团队的地图兼容性。

```json
{
  "maps": [
    {
      "map_id": "default_arena",
      "name_key": "map.default_arena",
      "width": 18,
      "height": 11,
      "asset_path": "/resources/v1/map/basic-map.tmj",
      "min_agent_contract_version": "legacy-dev",
      "participant_agent_contract_version": "0.1.0",
      "is_enabled": true,
      "is_compatible": true,
      "is_random_eligible": true
    }
  ]
}
```

客户端应禁用 `is_enabled = false` 或 `is_compatible = false` 的地图。回放应使用 `Battle.map_asset_path`，不要假设当前地图目录与历史战斗一致。

| HTTP | `error.code` |
| --- | --- |
| 400 | `BATTLE_MODE_UNAVAILABLE` |
| 400 | `INVALID_BATTLE_REQUEST` |
| 404 | `CHALLENGER_CHARACTER_NOT_FOUND` |
| 404 | `CHALLENGER_TEAM_NOT_FOUND` |
| 409 | `TEAM_AGENT_CODE_UNAVAILABLE` |

## 13. 创建战斗

### `POST /api/integrations/battles`

请求体只允许：`battle_type`、`game_mode_id`、`challenger_character_public_id`、`target_character_public_id`、`challenger_team_public_id`、`target_team_public_id`、`revenge_of_battle_public_id`、`map_id`。

### 13.1 请求组合

| 玩法 | 类型 | 发起方 | 目标 | 地图 |
| --- | --- | --- | --- | --- |
| 死斗 | 指定练习 | `challenger_character_public_id` | `target_character_public_id` | 可选 `map_id` |
| 死斗 | 随机练习 | `challenger_character_public_id` | 不传 | 可选 `map_id` |
| 死斗 | 排位 | `challenger_character_public_id` | 不传 | 不传 |
| 夺旗 | 指定练习 | `challenger_team_public_id` | `target_team_public_id` | 可选 `map_id` |
| 夺旗 | 随机练习 | `challenger_team_public_id` | 不传 | 可选 `map_id` |
| 夺旗 | 排位 | `challenger_team_public_id` | 不传 | 不传 |

`battle_type` 只能是 `practice` 或 `ranked`。

死斗指定练习：

```json
{
  "battle_type": "practice",
  "game_mode_id": "deathmatch",
  "challenger_character_public_id": "00000000-0000-4000-8000-000000000011",
  "target_character_public_id": "00000000-0000-4000-8000-000000000012",
  "map_id": "default_arena"
}
```

死斗排位：

```json
{
  "battle_type": "ranked",
  "game_mode_id": "deathmatch",
  "challenger_character_public_id": "00000000-0000-4000-8000-000000000011"
}
```

夺旗指定练习：

```json
{
  "battle_type": "practice",
  "game_mode_id": "captureTheFlag",
  "challenger_team_public_id": "00000000-0000-4000-8000-000000000021",
  "target_team_public_id": "00000000-0000-4000-8000-000000000022"
}
```

夺旗排位：

```json
{
  "battle_type": "ranked",
  "game_mode_id": "captureTheFlag",
  "challenger_team_public_id": "00000000-0000-4000-8000-000000000021"
}
```

随机练习省略目标 ID。排位赛不能指定目标或地图。

`revenge_of_battle_public_id` 只用于指定目标练习赛，请求玩法和双方必须与来源战斗形成合法的反向挑战。

成功返回 HTTP `202 { "battle": Battle }`。新任务通常先返回 `status = "pending"`，创建响应不包含 `replay_url`。

限制：

- 同一账户在死斗和夺旗下各最多存在一场未完成战斗。
- 每个发起角色或团队在连续 3600 秒内最多成功创建 60 场战斗。
- 达到频率限制时返回 `Retry-After`。
- 同一账户的两个角色或两个团队不能互相挑战。

| HTTP | `error.code` |
| --- | --- |
| 400 | `INVALID_BATTLE_REQUEST` |
| 400 | `BATTLE_MODE_UNAVAILABLE` |
| 400 | `BATTLE_MAP_UNAVAILABLE` |
| 400 | `RANKED_TARGET_FORBIDDEN` |
| 400 | `RANKED_MAP_FORBIDDEN` |
| 400 | `REVENGE_SOURCE_INVALID` |
| 404 | `CHALLENGER_CHARACTER_NOT_FOUND` |
| 404 | `TARGET_CHARACTER_NOT_FOUND` |
| 404 | `CHALLENGER_TEAM_NOT_FOUND` |
| 404 | `TARGET_TEAM_NOT_FOUND` |
| 409 | `TEAM_AGENT_CODE_UNAVAILABLE` |
| 409 | `CHALLENGER_AGENT_CONTRACT_INCOMPATIBLE` |
| 409 | `TARGET_AGENT_CONTRACT_INCOMPATIBLE` |
| 409 | `BATTLE_COMPATIBLE_OPPONENT_NOT_AVAILABLE` |
| 409 | `SAME_OWNER_BATTLE_FORBIDDEN` |
| 409 | `SAME_OWNER_TEAM_BATTLE_FORBIDDEN` |
| 409 | `BATTLE_ACTIVE_LIMIT_REACHED` |
| 409 | `PRACTICE_OPPONENT_NOT_AVAILABLE` |
| 409 | `RANKED_OPPONENT_NOT_AVAILABLE` |
| 409 | `PRACTICE_TEAM_OPPONENT_NOT_AVAILABLE` |
| 409 | `RANKED_TEAM_OPPONENT_NOT_AVAILABLE` |
| 429 | `AGENT_BATTLE_RATE_LIMITED` |
| 503 | `SUBMISSION_SERVICE_UNDER_MAINTENANCE` |
| 503 | `RANKED_BATTLES_DISABLED` |

该接口没有幂等键。请求超时或结果未知时，必须先查询本人战斗历史，不能直接重新提交。

## 14. 战斗历史

### 13.1 路由和视角

| 路径 | 返回范围 |
| --- | --- |
| `GET /api/integrations/battles` | 当前账户可见的练习和排位历史，可按死斗或夺旗筛选 |
| `GET /api/integrations/battles/characters/public/:characterPublicId` | 角色公开排位历史 |
| `GET /api/integrations/battles/characters/:characterPublicId` | 本人角色可见的练习和排位历史 |
| `GET /api/integrations/battles/teams/public/:teamPublicId` | 团队公开排位历史 |
| `GET /api/integrations/battles/teams/:teamPublicId` | 本人团队可见的练习和排位历史 |

所有路由都要求 App Key。`public` 表示强制访客视角，不表示免认证。即使当前 App Key 属于目标角色或团队，使用 `/public/` 路径时仍只返回公开排位历史。

集合路由使用 App Key 所属账户视角，规则与 `GET /api/battles` 相同：排位赛双方可见；随机练习赛仅创建者可见；指定目标的挑战练习赛创建者和被挑战方都可见。本人资产路由会验证角色或团队属于当前账户，非本人资源返回 `404 CHARACTER_NOT_FOUND` 或 `404 TEAM_NOT_FOUND`。

### 13.2 Query 和分页

`GET /api/integrations/battles`

| Query | 类型 | 说明 |
| --- | --- | --- |
| `cursor` | string | 上一页返回的 `next_cursor`；第一页省略 |
| `limit` | number | 兼容客户端传值，但服务端忽略，固定每页 20 条 |
| `battle_type` | `practice` \| `ranked` | 可选；支持逗号分隔多个值 |
| `game_mode_id` | `deathmatch` \| `captureTheFlag` | 可选；支持逗号分隔多个值 |
| `status` | `pending` \| `running` \| `done` \| `error` \| `canceled` | 可选；支持逗号分隔多个值 |
| `result` | `win` \| `loss` | 可选；结果相对当前 App Key 所属账户计算，支持逗号分隔多个值 |
| `challenge_role` | `challenger` \| `target` | 可选；只匹配指定目标练习赛，支持逗号分隔多个值 |

例如获取当前账户最近 20 条死斗记录：

```http
GET /api/integrations/battles?limit=20&game_mode_id=deathmatch
```

其余四个角色或团队历史路由只支持：

| Query | 类型 | 说明 |
| --- | --- | --- |
| `cursor` | string | 上一页返回的 `next_cursor`；第一页省略 |
| `battle_type` | `practice` \| `ranked` | 可选单值过滤 |

所有历史路由固定每页 20 条。`next_cursor` 是不透明字符串，只能原样传回，不能解析、修改或自行生成。

```json
{
  "battles": [],
  "next_cursor": null
}
```

列表中的 `Battle` 不包含 `replay_url`。公开历史中，目标不存在和没有公开记录都会返回空数组。

| HTTP | `error.code` |
| --- | --- |
| 400 | `INVALID_BATTLE_REQUEST` |
| 404 | `CHARACTER_NOT_FOUND`，仅本人角色历史 |
| 404 | `TEAM_NOT_FOUND`，仅本人团队历史 |

## 15. 战斗详情和回放

### `GET /api/integrations/battles/:battlePublicId`

返回指定战斗详情：

```ts
interface BattleDetailsResponse {
  battle: Battle & {
    replay_url: string | null;
  };
}
```

`replay_url` 只在战斗完成且回放可用时为非空。

当当前账户是战斗参与方时，响应会包含该账户视角的 `viewer_match_role`、`challenge_role`、`can_revenge`、`can_start_again` 和 `revenge_target`；非参与方获得访客视角值。

```ts
if (battle.replay_url) {
  const replay = await fetch(battle.replay_url, {
    credentials: "omit"
  }).then((response) => response.json());
}
```

不要向 `replay_url` 携带 AgentDuel App Key。回放播放器应使用 `battle.map_asset_path` 加载该场战斗对应的地图资源。

| HTTP | `error.code` |
| --- | --- |
| 400 | `INVALID_BATTLE_REQUEST` |
| 404 | `BATTLE_NOT_FOUND` |

## 16. 通用错误和重试

错误格式：

```ts
interface AgentDuelErrorBody {
  error: {
    code: string;
    message: string;
  };
}
```

| HTTP | `error.code` | 客户端处理 |
| --- | --- | --- |
| 400 | `TURNSTILE_TOKEN_REQUIRED` | 获取新 Turnstile token 后由用户重新提交 |
| 400 | `TURNSTILE_VERIFICATION_FAILED` | 重置并重新执行 Turnstile，不自动重放原提交 |
| 400 | `INVALID_REQUEST_BODY` | 修正请求字段，不自动重试 |
| 400 | `INVALID_BADGE_DISPLAY_SELECTION` | 刷新本人详情，只提交当前已获得且可展示的徽章 |
| 400 | `INVALID_BATTLE_REQUEST` | 修正战斗字段、ID、筛选或游标，不自动重试 |
| 401 | `INVALID_INTEGRATION_APP_KEY` | 停止业务请求，要求用户重新配置 App Key |
| 404 | `CHARACTER_NOT_FOUND` | 刷新角色数据 |
| 404 | `TEAM_NOT_FOUND` | 刷新团队数据 |
| 404 | `BATTLE_NOT_FOUND` | 停止加载该战斗 |
| 409 | 业务冲突错误 | 刷新相关资源并向用户展示错误 |
| 429 | `AGENT_BATTLE_RATE_LIMITED` | 等待 `Retry-After` 后再允许提交 |
| 429 | `INTEGRATION_APP_KEY_CHECK_RATE_LIMITED` | 等待 `Retry-After` 后再校验 Key |
| 503 | `SUBMISSION_SERVICE_UNDER_MAINTENANCE` | 暂停写操作，查询接口仍可使用 |
| 503 | `RANKED_BATTLES_DISABLED` | 禁用排位提交，练习赛仍可使用 |

推荐策略：

- `GET` 遇到网络错误或临时 `5xx` 时，可以使用有次数上限的指数退避。
- `400`、`401`、`404`、`409` 不应自动重试。
- `429` 必须遵守 `Retry-After`。
- 创建角色、创建团队、创建战斗均不是幂等操作；收到超时或未知结果时先查询列表确认。
- `PATCH` 使用资源部分更新语义；重复提交前仍建议先刷新最新资源状态。
- 徽章展示 `PUT` 使用完整替换语义，相同请求幂等；超时后可先读取本人详情核对徽章分组和顺序，再安全重放。

## 17. 当前不提供的能力

`/api/integrations` 当前不提供：

- App Key 创建、列表、修改或撤销。App Key 只能在 AgentDuel 官网管理。
- 角色或团队 Agent 源码提交、编译状态、版本列表或版本切换。
- 角色或团队删除。
- 角色或团队自身 `char_` / `team_` API Key 轮换。
- 用户账号资料、邮箱、密码或登录状态管理。

客户端不得自行猜测或调用未在本文列出的 `/api/integrations` 路径。
