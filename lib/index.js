/**
 * `@better-than-coca/dsh-karpathy-guidelines`
 *
 * Delivers the Karpathy coding discipline as a DSH **system-prompt section**
 * (`ctx.systemPrompt.section()`), the harness's own extension point for
 * model-visible standing instructions. It deliberately does not reproduce the
 * Codex package shape: no `.codex-plugin` manifest, no copied skill directory,
 * no `AGENTS.md` edit. The harness already owns ordered prompt assembly, so the
 * plugin contributes one ordered section and lets that mechanism do the work.
 *
 * Shape decisions worth knowing:
 *
 * - The section renders from a function, so the body is composed at each prompt
 *   assembly from one frozen configuration snapshot instead of being baked in at
 *   mount time.
 * - The body is a small text asset, not a tool. Nothing here needs a model call,
 *   a session event, or persisted state, so the plugin stays read-only and its
 *   entire model-visible surface is one string.
 * - Ordering is derived from the harness registry (`plan-policy` is the first
 *   policy slot), so the block is read before tool instructions and does not
 *   depend on any hard-coded slot number surviving a host upgrade.
 * - Registration is an effect: unloading the plugin removes the section and the
 *   prompt returns to its previous composition.
 */

import { resolveConfig } from './config.js'
import { SECTION_NAME, composeSectionText } from './text.js'

/** Plugin module name. */
export const name = 'karpathy-guidelines'

/** Services this plugin requires; without them the section cannot register. */
export const inject = ['systemPrompt']

/**
 * Fallback order when the harness does not expose the policy slot. Kept equal to
 * the `plan-policy` registry order minus one, so the fallback and the derived
 * value agree on any host that ships the current registry.
 */
const FALLBACK_ORDER = 499

/**
 * Resolve the section's sort order from the harness registry.
 * @param {{getSectionOrder?: (name: string) => number}} systemPrompt - the injected service.
 * @returns {number} a finite order; falls back when the registry lookup is unavailable.
 */
function resolveOrder(systemPrompt) {
  try {
    const planPolicy = systemPrompt?.getSectionOrder?.('PLAN_POLICY')
    if (typeof planPolicy === 'number' && Number.isFinite(planPolicy)) return planPolicy - 1
  } catch {
    // A host without the named registry is expected, not exceptional.
  }
  return FALLBACK_ORDER
}

/**
 * Mount the section.
 *
 * The row's configuration arrives as Cordis's second `apply` argument. Reading
 * it from `ctx.config` instead throws `cannot get property "config" without
 * inject` — the context proxy resolves undeclared properties as services — and
 * the whole plugin then fails silently, because a plugin `apply` error reaches
 * the host logger only.
 *
 * @param {object} ctx - Cordis context supplied by the loader.
 * @param {Record<string, unknown>} [config] - this plugin row's configuration.
 * @returns {void}
 */
export function apply(ctx, config) {
  const resolved = resolveConfig(config)
  const order = resolveOrder(ctx.systemPrompt)

  ctx.effect(() =>
    ctx.systemPrompt.section({
      name: SECTION_NAME,
      order,
      text: () => composeSectionText(resolved),
    }),
  )

  ctx.logger?.info?.('karpathy-guidelines: prompt mode %s at order %d', resolved.promptMode, order)
}
