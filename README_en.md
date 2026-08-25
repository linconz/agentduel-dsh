<img width="1280" height="600" alt="output" src="https://github.com/user-attachments/assets/0b5ff40f-cfae-4459-aa49-ea297d0d408f" />

# AgentDuel DSH

[中文](README.md) | English

AgentDuel is a code-based combat game. Put simply, you write Agent code yourself (or have AI help you write it), submit that code to AgentDuel, start matches, watch replays, identify problems, and keep improving your code on your way to the top of the ranked ladder.

AgentDuel is not about who can improvise the best prompts. It is about who can build the smarter Agent.

Once a match begins, both players' code runs in identical sandbox environments. Based on what their Agents can see and the state of the game, they decide how to move, attack, cast abilities, or capture the flag. Every match produces a complete replay, so you can see what your Agent saw and decided each turn, and understand how a match was won or lost.

## How AgentDuel and DeepSeek Harness work together

When AgentDuel first launched, the website already offered prompts that could be copied with one click into autonomous Agent tools such as Codex, Claude Code, and WorkBuddy. Those tools could read the rules, write code, and submit it, but the overall workflow still felt fragmented.

You had to view characters and matches in AgentDuel, copy a prompt into another tool, wait for AI to revise the code, then return to the website to submit it and start a match. After the match, you also had to open the replay, assemble the match information, and switch back to the AI tool for further analysis. Each tool could do its part, but you had to keep passing information between them.

DeepSeek Harness makes this workflow feel more natural. Built on an everything-is-a-plugin architecture, the AgentDuel DSH plugin connects AgentDuel's game features with DSH's code Agent capabilities.

Their responsibilities are clear:

* AgentDuel is the arena. It handles game rules, code execution, opponent matchmaking, match results, ranked ratings, and replays.
* DeepSeek Harness is the Agent's workspace. It reads code directories, invokes models, changes code strategies, runs tests, and preserves the optimization process.
* The AgentDuel DSH plugin bridges the two. It lets you manage characters and teams, start matches, watch replays, and have AI continue optimizing your code based on real match results, all within DeepSeek Harness.

AgentDuel does not depend on DeepSeek Harness to run, and DeepSeek Harness does not simulate battles. Once the plugin is installed, AgentDuel becomes a native capability in DeepSeek Harness, bringing tasks that were previously split between the website and coding tools into one interface.

<img width="1635" height="994" alt="screenshot" src="https://github.com/user-attachments/assets/8f660090-0ffc-4c22-aa27-20325f64e14d" />

## How to play

The first time you use it, sign in to [AgentDuel](https://agentduel.app) to create an App Key, then configure it in the plugin. You can then get started with the following workflow:

1. Create a character or team

   Choose a 1v1 deathmatch character or build a 2v2 capture-the-flag team, then set its class, name, and entry information.

2. Prepare your Agent code

   In DSH, select the workspace where your Agent code is stored. You can write the code yourself, or start an optimization conversation and let DSH read the AgentDuel rules and produce an initial strategy.

3. Submit your code

   Once the code passes validation, submit it for the selected character or team. From then on, that code becomes the character's decision-making brain in battle.

4. Start a match

   You can begin with a random practice match or search for and challenge a specific opponent. Once your strategy is stable, enter ranked matches to compete for rating and rank.

5. Watch the replay and keep optimizing

   After a match ends, open the replay in the plugin to inspect the map, action log, and key turns. If you are not sure what went wrong, create a DSH conversation and have AI analyze the match, then update and test the code in your current workspace.

The full loop is:

Create a character or team → write and submit code → start a match → watch the replay → analyze the problem → optimize the code → battle again

This is where much of AgentDuel's appeal lies. What you submit is not a program that is finished once written, but an Agent that grows stronger through real matches. Losing a match is not the end; it provides a new test result for the next revision.

## Installation

Install from source

```bash
git clone https://github.com/linconz/agentduel-dsh.git
cd agentduel-dsh
pnpm install
pnpm run build
dsh plugin --profile web add .
```

Install from the npm registry

```bash
dsh plugin --profile web install @agentduel/agentduel-dsh@0.1.4
```

Start DSH

```
dsh web
```

Remove the local plugin:

```bash
dsh plugin --profile web remove @agentduel/agentduel-dsh
```

## Community

Join our QQ group to discuss gameplay and competitive strategies: [1070277746](mqqapi://card/show_pslcard?src_type=internal&version=1&uin=1070277746&card_type=group&source=qrcode), or join the [Discord community](https://discord.gg/6zYtEAhzF).

<img width="246" height="251" alt="QQ group" src="https://github.com/user-attachments/assets/3df0df31-5d20-4157-9b45-c5878bf20b42" />
