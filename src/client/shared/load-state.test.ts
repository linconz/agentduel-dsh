import { describe, expect, it } from 'vitest'
import { MODULE_LOADING_TEXTS, randomModuleLoadingText } from './load-state.js'

describe('randomModuleLoadingText', () => {
  it('从完整候选列表中选择首次展示的文案', () => {
    expect(randomModuleLoadingText(undefined, () => 0)).toBe(MODULE_LOADING_TEXTS[0])
    expect(randomModuleLoadingText(undefined, () => 0.999)).toBe(MODULE_LOADING_TEXTS.at(-1))
  })

  it('切换时不会连续展示同一条文案', () => {
    for (const current of MODULE_LOADING_TEXTS) {
      expect(randomModuleLoadingText(current, () => 0)).not.toBe(current)
      expect(randomModuleLoadingText(current, () => 0.999)).not.toBe(current)
    }
  })
})
