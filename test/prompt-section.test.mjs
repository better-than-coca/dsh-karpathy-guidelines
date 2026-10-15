import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { DEFAULT_CONFIG, resolveConfig } from '../lib/config.js'
import { SECTION_HEADER, SECTION_NAME, bodyLength, composeSectionText } from '../lib/text.js'

/**
 * Build the smallest context that satisfies the plugin's declared services,
 * capturing every registration so a test can assert on the real call.
 *
 * The stub deliberately carries no `config` property: the real Cordis context
 * has none, and the plugin row's configuration arrives as `apply`'s second
 * argument. A stub `ctx.config` would hide a regression to `resolveConfig(ctx.config)`.
 * @param {Record<string, unknown>} [config] - configuration passed to `apply`.
 * @returns {{ctx: object, config: Record<string, unknown>|undefined, sections: object[], disposers: Function[], logs: unknown[][]}} captured harness doubles.
 */
function harness(config) {
  const sections = []
  const disposers = []
  const logs = []
  const ctx = {
    systemPrompt: {
      getSectionOrder: (slot) => (slot === 'PLAN_POLICY' ? 500 : 0),
      section: (section) => {
        sections.push(section)
        const dispose = () => disposers.push(section.name)
        return dispose
      },
    },
    effect: (callback) => {
      callback()
    },
    logger: {
      info: (...args) => logs.push(args),
    },
  }
  return { ctx, config, sections, disposers, logs }
}

test('apply registers exactly one section on the harness prompt service', async () => {
  const { apply, inject, name } = await import('../lib/index.js')
  const h = harness()
  apply(h.ctx, h.config)

  assert.equal(name, 'karpathy-guidelines')
  assert.deepEqual(inject, ['systemPrompt'])
  assert.equal(h.sections.length, 1)
  assert.equal(h.sections[0].name, SECTION_NAME)
  assert.equal(h.sections[0].order, 499)
})

test('configuration comes from the second apply argument, never from the context', async () => {
  // The real harness resolves `ctx.config` as an injected service and throws
  // for it (the 2026-10-12 silent-failure bug). Any stray `config` on the
  // context must lose to the argument the loader passes.
  const { apply } = await import('../lib/index.js')
  const h = harness({ promptMode: 'full' })
  h.ctx.config = { promptMode: 'off' }
  apply(h.ctx, h.config)

  assert.equal(h.sections.length, 1)
  assert.equal(h.sections[0].text(), composeSectionText(resolveConfig({ promptMode: 'full' })))
})

test('the section text is a provider, so configuration is read per assembly', async () => {
  const { apply } = await import('../lib/index.js')
  const h = harness({ promptMode: 'compact' })
  apply(h.ctx, h.config)

  assert.equal(typeof h.sections[0].text, 'function')
  assert.equal(h.sections[0].text(), composeSectionText(resolveConfig({ promptMode: 'compact' })))
})

test('a host without the named registry still mounts at the fallback order', async () => {
  const { apply } = await import('../lib/index.js')
  const h = harness()
  delete h.ctx.systemPrompt.getSectionOrder
  apply(h.ctx, h.config)
  assert.equal(h.sections[0].order, 499)

  const throwing = harness()
  throwing.ctx.systemPrompt.getSectionOrder = () => {
    throw new Error('unknown slot')
  }
  apply(throwing.ctx)
  assert.equal(throwing.sections[0].order, 499)

  const notFinite = harness()
  notFinite.ctx.systemPrompt.getSectionOrder = () => Number.NaN
  apply(notFinite.ctx)
  assert.equal(notFinite.sections[0].order, 499)
})

test('mounting logs the effective mode once', async () => {
  const { apply } = await import('../lib/index.js')
  const h = harness({ promptMode: 'full' })
  apply(h.ctx, h.config)
  assert.equal(h.logs.length, 1)
  assert.match(String(h.logs[0][0]), /prompt mode/)
  assert.equal(h.logs[0][1], 'full')
})

test('compact mode carries all four principles and stays inside its token budget', () => {
  const text = composeSectionText(DEFAULT_CONFIG)
  for (const heading of ['Think before coding', 'Simplicity first', 'Surgical changes', 'Goal-driven execution']) {
    assert.ok(text.includes(heading), `compact text is missing "${heading}"`)
  }
  assert.ok(bodyLength('compact') < 1800, `compact body grew to ${bodyLength('compact')} characters`)
  // `full` is the upstream text verbatim: same rules, plus the tradeoff note,
  // the two anchors, and the plan template the compact rewrite drops.
  assert.ok(bodyLength('full') > bodyLength('compact') * 1.5)
  const full = composeSectionText(resolveConfig({ promptMode: 'full' }))
  assert.ok(full.includes('Would a senior engineer say this is overcomplicated?'))
  assert.ok(!text.includes('Would a senior engineer say this is overcomplicated?'))
})

test('the header can be turned off and extra guidance is appended verbatim', () => {
  const withoutHeader = composeSectionText(resolveConfig({ includeHeader: false }))
  assert.ok(!withoutHeader.includes(SECTION_HEADER))

  const withExtra = composeSectionText(resolveConfig({ extraGuidance: 'Never touch generated fixtures.' }))
  assert.ok(withExtra.includes('Additional rules configured for this deployment:'))
  assert.ok(withExtra.trimEnd().endsWith('Never touch generated fixtures.'))

  const blankExtra = composeSectionText(resolveConfig({ extraGuidance: '   ' }))
  assert.ok(!blankExtra.includes('Additional rules configured for this deployment:'))
})

test('mode "off" publishes nothing', () => {
  assert.equal(composeSectionText(resolveConfig({ promptMode: 'off' })), '')
})

test('unmounting removes the section through the effect disposer', async () => {
  const { apply } = await import('../lib/index.js')
  const sections = []
  const disposed = []
  const ctx = {
    systemPrompt: {
      getSectionOrder: () => 500,
      section: (section) => {
        sections.push(section)
        return () => disposed.push(section.name)
      },
    },
    // Hold the disposer the way the real loader does, then release it.
    effect: (callback) => {
      const dispose = callback()
      dispose()
    },
    logger: { info: () => {} },
  }
  apply(ctx)
  assert.deepEqual(disposed, [SECTION_NAME])
})
