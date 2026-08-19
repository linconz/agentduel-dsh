import type { Context } from '@deepseek-ai/cordis'

export const name = 'agentduel'

/** Host 端只负责让 DSH 发现并挂载浏览器插件。 */
export function apply(_ctx: Context): void {}
