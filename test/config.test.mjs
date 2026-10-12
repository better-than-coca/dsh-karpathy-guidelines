import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { DEFAULT_CONFIG, PROMPT_MODES, resolveConfig } from '../lib/config.js'

test('no configuration resolves to the documented defaults', () => {
  assert.deepEqual(resolveConfig(undefined), DEFAULT_CONFIG)
  assert.deepEqual(resolveConfig(null), DEFAULT_CONFIG)
  assert.deepEqual(resolveConfig({}), DEFAULT_CONFIG)
})

test('partial configuration keeps the other defaults', () => {
  assert.deepEqual(resolveConfig({ promptMode: 'full' }), {
    promptMode: 'full',
    includeHeader: true,
    extraGuidance: '',
  })
  assert.deepEqual(resolveConfig({ includeHeader: false }), {
    promptMode: 'compact',
    includeHeader: false,
    extraGuidance: '',
  })
})

test('the resolved configuration is frozen', () => {
  const config = resolveConfig({ extraGuidance: 'be terse' })
  assert.equal(Object.isFrozen(config), true)
  assert.throws(() => {
    config.promptMode = 'off'
  }, TypeError)
})

test('every documented mode is accepted', () => {
  for (const mode of PROMPT_MODES) {
    assert.equal(resolveConfig({ promptMode: mode }).promptMode, mode)
  }
})

test('an unknown key fails loudly instead of being ignored', () => {
  assert.throws(
    () => resolveConfig({ promptModes: 'compact' }),
    /unknown config key "promptModes"; accepted keys are promptMode, includeHeader, extraGuidance/,
  )
})

test('a wrong mode fails and names the accepted values', () => {
  assert.throws(() => resolveConfig({ promptMode: 'strict' }), /promptMode.*full \| compact \| off/)
  assert.throws(() => resolveConfig({ promptMode: 1 }), TypeError)
})

test('non-boolean and non-string values are rejected', () => {
  assert.throws(() => resolveConfig({ includeHeader: 'yes' }), /includeHeader.*a boolean/)
  assert.throws(() => resolveConfig({ extraGuidance: ['a'] }), /extraGuidance.*a string/)
})

test('a non-object configuration is rejected', () => {
  assert.throws(() => resolveConfig('compact'), /config "config" expected an object/)
  assert.throws(() => resolveConfig([]), /config "config" expected an object/)
})
