/**
 * Configuration for `@better-than-coca/dsh-karpathy-guidelines`.
 *
 * Every tunable lives here as a validated field, and the returned object is
 * frozen: the plugin reads one immutable snapshot when it mounts. Editing the
 * row in `cordis.patch.yml` (or in the DSH configuration editor) re-mounts the
 * plugin, which recomposes the prompt section — no per-request config lookup.
 *
 * Validation fails loudly. An unknown key is a typo or a stale README, and both
 * are cheaper to surface at mount than to debug from model behaviour later.
 */

/** Prompt body choices, in descending token cost. */
export const PROMPT_MODES = Object.freeze(['full', 'compact', 'off'])

/** Configuration accepted from the composition (`cordis.patch.yml`). */
export const DEFAULT_CONFIG = Object.freeze({
  /**
   * Which body to publish: `"compact"` is the four principles in about 200
   * tokens, `"full"` is the upstream text verbatim, `"off"` publishes nothing.
   */
  promptMode: 'compact',
  /** Prepend the section title, which names the four principles for log scans. */
  includeHeader: true,
  /** Extra text appended verbatim, for repository-specific additions. */
  extraGuidance: '',
})

/**
 * Reject a configuration value this plugin cannot act on.
 * @param {string} field - configuration key being validated.
 * @param {unknown} value - rejected value, echoed for the operator.
 * @param {string} expected - human description of the accepted shape.
 * @returns {never}
 */
function reject(field, value, expected) {
  throw new TypeError(
    `karpathy-guidelines: config "${field}" expected ${expected}, received ${JSON.stringify(value)}`,
  )
}

/**
 * Validate one raw configuration object and apply defaults.
 * @param {Record<string, unknown> | undefined} raw - configuration from the composition.
 * @returns {Readonly<{promptMode: 'full'|'compact'|'off', includeHeader: boolean, extraGuidance: string}>} resolved configuration.
 */
export function resolveConfig(raw) {
  if (raw === undefined || raw === null) return DEFAULT_CONFIG
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    reject('config', raw, 'an object')
  }

  for (const key of Object.keys(raw)) {
    if (!Object.hasOwn(DEFAULT_CONFIG, key)) {
      throw new TypeError(
        `karpathy-guidelines: unknown config key "${key}"; accepted keys are ${Object.keys(DEFAULT_CONFIG).join(', ')}`,
      )
    }
  }

  const promptMode = raw.promptMode ?? DEFAULT_CONFIG.promptMode
  if (!PROMPT_MODES.includes(promptMode)) {
    reject('promptMode', promptMode, `one of ${PROMPT_MODES.join(' | ')}`)
  }

  const includeHeader = raw.includeHeader ?? DEFAULT_CONFIG.includeHeader
  if (typeof includeHeader !== 'boolean') reject('includeHeader', includeHeader, 'a boolean')

  const extraGuidance = raw.extraGuidance ?? DEFAULT_CONFIG.extraGuidance
  if (typeof extraGuidance !== 'string') reject('extraGuidance', extraGuidance, 'a string')

  return Object.freeze({ promptMode, includeHeader, extraGuidance })
}
