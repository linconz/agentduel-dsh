# AgentDuel DSH

AgentDuel 是一款代码对战游戏。简单来说，你可以自己编写 Agent 代码（也可以让 AI 帮你写），然后把代码提交到 AgentDuel，发起对战、观看回放、定位问题，再继续优化代码，冲击排位赛第一名。

AgentDuel 比拼的不是谁更会临场输入提示词，而是谁写出的 Agent 更聪明。

战斗开始后，双方代码会在相同的规则的沙箱环境运行，根据视野和局势决定移动、攻击、施放技能或争夺旗帜。每场比赛都会生成完整回放，你可以查看 Agent 每个回合看到了什么、做出了什么决定，以及一场比赛是怎样获胜或输掉的。

## AgentDuel 与 DeepSeek Harness 的关系

AgentDuel 刚上线时，网站已经提供了可以一键复制给 Codex、Claude Code、WorkBuddy 等自主 Agent 工具的提示词。这些工具能够阅读规则、编写代码并完成提交，但整个过程仍然有些割裂。
你需要在 AgentDuel 中查看角色和对局，复制提示词到另一个工具，等待 AI 修改代码，再回到网站提交和发起对战。比赛结束后，还要打开回放、整理对局信息，然后重新切回 AI 工具继续分析。工具都能完成各自的工作，只是人需要不断在中间传递信息。

DeepSeek Harness 的出现让这个过程有了更自然的组织方式。基于一切皆插件的架构，AgentDuel DSH 插件正是建立在这套插件体系之上，把 AgentDuel 的游戏功能和 DSH 的代码 Agent 能力连接到一起。

两者的分工很明确：

* AgentDuel 是竞技场，负责游戏规则、代码运行、对手匹配、战斗结果、排位积分和对局回放。
* DeepSeek Harness 是 Agent 的工作环境，负责读取代码目录、调用模型、修改代码策略、运行测试并保存优化过程。
* AgentDuel DSH 插件是连接两者的桥梁，让你可以直接在 DeepSeek Harness 中管理角色和团队、发起对战、查看回放，并让 AI 根据真实对局继续优化代码。

AgentDuel 并不依赖 DeepSeek Harness 才能运行，DeepSeek Harness 也不负责模拟战斗。安装插件后，AgentDuel 会成为 DeepSeek Harness 中的一项原生能力，原本分散在网站和代码工具之间的操作会被放进同一界面中。

## 怎么玩

第一次使用时，需要登录 [AgentDuel](https://agentduel.app) 创建一个 App Key，然后在插件中完成配置。接下来可以按照下面的流程开始游戏：

1. 创建角色或团队

   选择 1v1 死斗角色，或者组建一支 2v2 夺旗队伍，并设置职业、名称和参赛信息。

2. 准备 Agent 代码

   在 DSH 中选择保存 Agent 代码的工作区。你可以自己编写代码，也可以直接发起优化对话，让 DSH 阅读 AgentDuel 的规则文档并生成第一版策略。

3. 提交代码

   代码通过检查后，将它提交到对应的角色或团队。此后，这份代码就是角色在战斗中的决策大脑。

4. 发起对战

   你可以先参加随机练习赛，也可以搜索并挑战指定对手。策略稳定后，再进入排位赛争夺积分和排名。

5. 观看回放并继续优化

   比赛结束后，在插件中打开回放，查看地图、行动记录和关键回合。如果不知道问题出在哪里，可以直接创建一个 DSH 对话，让 AI 分析对局，并结合当前工作区中的代码完成修改和测试。

整个过程可以概括为：

创建角色或团队 → 编写并提交代码 → 发起对战 → 查看回放 → 分析问题 → 优化代码 → 再次对战

这也是 AgentDuel 最主要的乐趣。你提交的不是一份写完就结束的程序，而是一个会在一次次实战中逐渐变强的 Agent。输掉一场比赛并不意味着结束，它只是为下一次修改提供了一份新的测试结果。

## 安装

源码方式安装

```bash
git clone https://github.com/linconz/agentduel-dsh.git
cd agentduel-dsh
npm install
npm run build
dsh plugin --profile web add .
```

从 npm registry 安装

```bash
dsh plugin --profile web add agentduel/agentduel-dsh
```

启动

```
dsh web
```

卸载本地插件：

```bash
dsh plugin --profile web remove agentduel-dsh
```
