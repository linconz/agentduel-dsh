import { readFileSync } from 'node:fs'
import { evaluatePluginCompatibility } from '@deepseek-ai/dsh-app-boot'
import { describe, expect, it } from 'vitest'
import { AGENTDUEL_PLUGIN_VERSION } from '../api/client.js'

const manifest = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'))
const runtimeVersion = '0.2.1-rc.2'

describe('DSH 插件兼容性', () => {
  it('通过官方 0.2.1-rc.2 安装兼容性检查，无需版本豁免', () => {
    expect(evaluatePluginCompatibility(manifest, {}, runtimeVersion)).toBeUndefined()
  })

  it('DSH peer 依赖声明独立兼容目标版本', () => {
    const { engines: _engines, ...withoutEngines } = manifest
    expect(evaluatePluginCompatibility(withoutEngines, {}, runtimeVersion)).toBeUndefined()
    for (const [name, range] of Object.entries(manifest.peerDependencies)) {
      if (!name.startsWith('@deepseek-ai/dsh-')) continue
      expect(evaluatePluginCompatibility({
        name: manifest.name,
        version: manifest.version,
        peerDependencies: { [name]: range }
      }, {}, runtimeVersion)).toBeUndefined()
      expect(manifest.devDependencies[name]).toBe(runtimeVersion)
    }
  })

  it.each(['0.1.2-alpha.4', '0.2.1-rc.1', '0.3.0-alpha.1', '0.3.0'])(
    '拒绝未适配的 DSH %s',
    (version) => {
      expect(evaluatePluginCompatibility(manifest, {}, version)).toMatchObject({
        requirements: { 'engines.dsh': manifest.engines.dsh },
        exempted: false
      })
    }
  )

  it('发布版本与请求头中的插件版本保持一致', () => {
    expect(manifest.version).toBe(AGENTDUEL_PLUGIN_VERSION)
  })
})
