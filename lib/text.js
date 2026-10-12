/**
 * Prompt text for `@better-than-coca/dsh-karpathy-guidelines`.
 *
 * The bodies live in `assets/` so the wording is reviewable and diffable on its
 * own, exactly like the upstream skill. This module is pure: it turns a resolved
 * configuration into the string a prompt section renders, which is what makes
 * the model-visible surface unit-testable without mounting the harness.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Stable section name; also the label used in `system-prompt/change` logs. */
export const SECTION_NAME = 'better-than-coca:karpathy-guidelines'

/** Title prepended when `includeHeader` is on. */
export const SECTION_HEADER = [
  '# Karpathy coding guidelines',
  '',
  'Injected by the `@better-than-coca/dsh-karpathy-guidelines` plugin. These rules shape how to work;',
  'repository instructions and explicit user requests take precedence over them when they conflict.',
].join('\n')

/** Heading for optional operator-supplied additions. */
const EXTRA_HEADING = 'Additional rules configured for this deployment:'

/**
 * Read one packaged body.
 * @param {string} file - asset file name under `assets/`.
 * @returns {string} the trimmed body text.
 */
function readAsset(file) {
  return readFileSync(fileURLToPath(new URL(`../assets/${file}`, import.meta.url)), 'utf8').trim()
}

/** Lazily cached asset readers, so a mount reads each body at most once. */
const cache = new Map()

/**
 * Read one packaged body through the cache.
 * @param {string} file - asset file name under `assets/`.
 * @returns {string} the trimmed body text.
 */
function asset(file) {
  const hit = cache.get(file)
  if (hit !== undefined) return hit
  const text = readAsset(file)
  cache.set(file, text)
  return text
}

/**
 * Compose the exact text the model will read for one configuration.
 * @param {{promptMode: 'full'|'compact'|'off', includeHeader: boolean, extraGuidance: string}} config - resolved configuration.
 * @returns {string} section text; an empty string means "publish nothing".
 */
export function composeSectionText(config) {
  if (config.promptMode === 'off') return ''

  const body =
    config.promptMode === 'full'
      ? asset('guidelines-full.md')
      : asset('guidelines-compact.md')

  const parts = []
  if (config.includeHeader) parts.push(SECTION_HEADER)
  parts.push(body)
  const extra = config.extraGuidance.trim()
  if (extra.length > 0) parts.push(`${EXTRA_HEADING}\n\n${extra}`)
  return parts.join('\n\n')
}

/**
 * Character cost of a composed body, exported for tests and for operators who
 * want to weigh `compact` against `full` before choosing.
 * @param {'full'|'compact'} mode - body choice.
 * @returns {number} character count of the body alone.
 */
export function bodyLength(mode) {
  return mode === 'full' ? asset('guidelines-full.md').length : asset('guidelines-compact.md').length
}
