# @better-than-coca/dsh-karpathy-guidelines

**English** | [中文](README.md)

Karpathy's coding discipline, delivered as a **native system-prompt section** for DeepSeek Harness — present in every request.

## What it solves

A skill is **model-invoked**. The catalog exposes only its name and `description`; the body reaches the context only if the model decides to call the `skill` tool.

So a plugin that ships nothing but a SKILL.md **silently does nothing** in exactly the sessions that needed it.

A prompt section is different: the harness writes it into every assembled prompt. The model has no choice to make, and therefore no chance to miss it.

## How it relates to the Codex package

The upstream `andrej-karpathy-skills` repository is a Codex-native package. It contains `.codex-plugin/plugin.json`, an `AGENTS.md`, a `skills/<name>/SKILL.md` tree, and an `instruction.md` you paste into Custom Instructions.

Codex needs that shape because a Codex plugin *is* that shape. DSH is assembled differently, so this plugin does not imitate a manifest format the harness never reads. It uses DSH's own extension points:

| The Codex package uses | This plugin uses instead |
|---|---|
| `.codex-plugin/plugin.json` | `package.json#dsh.bundle.patch` (the DSH loader contract) |
| `instruction.md` pasted into settings | `ctx.systemPrompt.section()` registered at mount |
| `AGENTS.md` maintainer file | nothing shipped; the plugin owns its own text |
| `skills/<name>/SKILL.md` | `assets/*.md` carried in the package, composed per assembly |
| A hard-coded instruction slot | `getSectionOrder('PLAN_POLICY') - 1`, resolved from the host registry |

## Requirements

- A DSH host whose loader reads `package.json#dsh.bundle.patch`. The desktop app does, and so do the `web` and `headless` profiles.
- Node.js 22 or newer.
- Nothing else. There is no build step and no runtime dependency, and `lib/` is committed, so a source install works as-is.

## Install

Use the `dsh` launcher that ships **with your DSH installation**. The launcher on `PATH` cannot manage the reserved `desktop` profile, which is the one the desktop app runs.

The launcher sits beside the application binary. The folder containing the executable (`DeepSeek Harness.exe` on Windows) is `<DSH install>` below:

| Platform | Launcher |
|---|---|
| Windows | `<DSH install>\resources\runtime\cli\bin\dsh.cmd` |
| macOS / Linux | `<DSH install>/resources/runtime/cli/bin/dsh` |

Install from npm — the recommended route:

```powershell
& '<DSH install>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add @better-than-coca/dsh-karpathy-guidelines
```

Installing from GitHub works too. It needs no npm account, and it is the right route for a commit that is not in a release yet:

```powershell
& '<DSH install>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add github:better-than-coca/dsh-karpathy-guidelines
```

The `github:` form tracks the default branch. To pin a known revision, append its release tag:

```powershell
& '<DSH install>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add github:better-than-coca/dsh-karpathy-guidelines#v0.1.4
```

Replace `desktop` with the profile you are installing into. Restart the DSH application afterwards; the loader mounts a new bundle at startup.

Both routes install the same code: `github:` resolves the repository, npm resolves the published tarball. Prefer npm, and reach for `github:` only when you need an unreleased revision.

**Confirm it is active.** Open a session and look at the start of the system prompt for a section beginning `# Karpathy coding guidelines`. Seeing the `karpathy-guidelines` row in `--dump-config` only proves the bundle mounted; it does not prove the section registered. The prompt text is the check that matters.

Uninstall removes the dependency and the bundle row, and the section goes with it:

```powershell
& '<DSH install>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop remove @better-than-coca/dsh-karpathy-guidelines
```

## Configuration

Edit the `karpathy-guidelines` row in the DSH configuration editor, or the `config:` block this bundle's patch contributes:

```yaml
- insert:
    - id: karpathy-guidelines
      name: '@better-than-coca/dsh-karpathy-guidelines'
      config:
        promptMode: compact
        includeHeader: true
        extraGuidance: ''
```

| Key | Values | Default | Effect |
|---|---|---|---|
| `promptMode` | `compact` \| `full` \| `off` | `compact` | `compact` compresses the four principles to fit a standing section; `full` is the upstream text verbatim; `off` publishes nothing |
| `includeHeader` | boolean | `true` | Prepends one paragraph naming the plugin and stating that repository instructions win |
| `extraGuidance` | string | `''` | Appended verbatim under its own heading, for deployment-specific additions |

An unknown key is a **mount-time error**, not a silent no-op. The plugin names the offending key and the ones it accepts. Validation lives in [`lib/config.js`](lib/config.js).

## What the model sees

One system-prompt section, `better-than-coca:karpathy-guidelines`, ordered one slot before the harness's plan policy.

Its text is a provider function, so each prompt assembly composes the body from the frozen configuration. With the defaults, the section text is exactly `lib/text.js#composeSectionText({ promptMode: 'compact', includeHeader: true, extraGuidance: '' })`.

`promptMode: 'full'` substitutes the upstream body from `assets/guidelines-full.md`; `promptMode: 'off'` makes the provider return an empty string, which contributes nothing.

**Token impact.** Measured on the shipped assets: header + compact body is about 1.4k characters, roughly 300 tokens per request; `full` is about 2.4k characters. The cost is fixed for the life of the mount and does not grow with session length.

**KV cache impact.** The section is position-stable and its text comes from one immutable configuration snapshot, so it contributes a stable prompt prefix and does not break cache reuse between turns. Two things do break it: editing the configuration row (the plugin re-mounts and the body changes), and a host upgrade that changes the surrounding section order. Both are operator actions, not per-turn drift.

## How it works

1. The loader mounts the plugin from the bundle patch and its config row.
2. `lib/config.js` validates the row once and freezes the result; unknown keys fail the mount.
3. `lib/index.js` resolves its order from `ctx.systemPrompt.getSectionOrder('PLAN_POLICY') - 1` and registers one section inside `ctx.effect(...)`.
4. Each prompt assembly calls the section's `text` provider, which composes header + body + optional extra guidance from `assets/`.
5. Unloading the plugin disposes the effect, and the section disappears from the prompt.

No tool, no event listener, no session state, no network access.

## Known limitations and deferred work

- **No per-turn relevance gate.** The section is in every request, including sessions with no code in them. Turning it `off` is manual. A hook plugin keyed on the turn's intent could gate it automatically; that is deliberately not built yet.
- **No mandatory concluding procedure.** The four principles shape how work is done, not how it is reported. The `full` text keeps the upstream `step -> verify` plan template. There is no enforced response header such as `Assumption / Changed / Verified`, because the harness already owns its own response conventions.
- **Provenance.** The `full` body is the upstream SKILL.md text, redistributed under the MIT declaration in that repository's frontmatter. See [`NOTICE`](NOTICE).
- **Live-session rendering.** Observed in a real desktop-app request on 2026-10-15 (DSH desktop app, `desktop` profile, `promptMode: compact`): the composed section reached the model's system prompt verbatim. The packaged artifact is also mounted and composed through the loader in an isolated profile, and the section contract is unit-tested. What the tests do not cover is a third-party host whose section order differs from the one this was developed against.

## Tests

```powershell
cd <checkout>
node --test 'test/*.test.mjs'
```

Seventeen cases cover configuration defaults and rejection paths, the section registration contract (one section, derived order, disposer on unload, fallback when the registry is absent), and the composed text for every mode.

## Releasing

Releases are tag-driven. Bump `version` in `package.json`, commit, then push a tag carrying the same number:

```bash
git tag v0.1.4
git push origin v0.1.4
```

The `Publish Package` workflow first checks that the tag matches `package.json`, runs the test suite, and then publishes to npm.

It authenticates with [OIDC trusted publishing](https://docs.npmjs.com/trusted-publishers), so there is no npm token in this repository and none in CI secrets. npm exchanges the workflow's short-lived identity token for a publish credential scoped to that one run, and generates provenance attestations automatically.

When a tag push needs a re-run, the workflow can also be started by hand from the Actions tab.

## License

MIT. The redistributed guideline text carries its own upstream MIT declaration; see [`NOTICE`](NOTICE).
