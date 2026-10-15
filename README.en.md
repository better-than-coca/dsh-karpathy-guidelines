# @better-than-coca/dsh-karpathy-guidelines

**English** | [中文](README.md)

The Karpathy coding discipline for DeepSeek Harness, delivered as a **native system-prompt section**.

## Why this is not a port of the Codex package

The original `andrej-karpathy-skills` repository is a Codex-native package: `.codex-plugin/plugin.json`, an `AGENTS.md`, a `skills/<name>/SKILL.md` tree, and a paste-into-Custom-Instructions `instruction.md`. Codex needs that shape because a Codex plugin *is* that shape. DSH is assembled differently, so this plugin uses DSH's own extension point instead of imitating a manifest format the harness never reads:

| What the Codex package uses | What this plugin uses instead |
|---|---|
| `.codex-plugin/plugin.json` | `package.json#dsh.bundle.patch` (the DSH loader contract) |
| `instruction.md` pasted into settings | `ctx.systemPrompt.section()` registered at mount |
| `AGENTS.md` maintainer file | nothing shipped; the plugin owns its own text |
| `skills/<name>/SKILL.md` | `assets/*.md` carried in the package, composed per assembly |
| Hard-coded instruction slot | `getSectionOrder('PLAN_POLICY') - 1` resolved from the host registry |

The behavioural difference that matters: a skill is **model-invoked** — the catalog exposes only its name and `description`, and the body arrives only if the model decides to call the `skill` tool. A prompt section is **always in the request**. This plugin exists because the SKILL.md-only route silently does nothing on the sessions that needed it.

## Requirements

- A DSH host whose loader reads `package.json#dsh.bundle.patch` (the desktop app does; so do the `web` and `headless` profiles).
- Node.js 22 or newer.
- Nothing else. There is no build step and no runtime dependency, and `lib/` is committed, so a source install works as-is.

## Install

Use the `dsh` launcher that ships **with your DSH installation**. The launcher on `PATH` cannot manage the reserved `desktop` profile, which is the one the desktop app runs.

The launcher sits beside the application binary — the folder that contains the executable (`DeepSeek Harness.exe` on Windows) is `<DSH install>` here:

| Platform | Launcher |
|---|---|
| Windows | `<DSH install>\resources\runtime\cli\bin\dsh.cmd` |
| macOS / Linux | `<DSH install>/resources/runtime/cli/bin/dsh` |

Install from npm:

```powershell
& '<DSH install>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add @better-than-coca/dsh-karpathy-guidelines
```

Or install straight from GitHub — no npm account required, and the right choice when you want a commit that is not in a release yet:

```powershell
& '<DSH install>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add github:better-than-coca/dsh-karpathy-guidelines
```

Replace `desktop` with the profile you are installing into. The `github:` form tracks the default branch, so append a release tag to pin a known revision instead:

```powershell
& '<DSH install>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add github:better-than-coca/dsh-karpathy-guidelines#v0.1.3
```

Restart the DSH application afterwards; the loader mounts a new bundle at startup.

**Confirm it is active.** Open a session and look at the start of the system prompt for a section beginning `# Karpathy coding guidelines`. Seeing the `karpathy-guidelines` row in `--dump-config` only proves the bundle was mounted, not that the section registered — the prompt text is the check that matters.

Uninstall removes the dependency and the bundle row, and with it the section:

```powershell
& '<DSH install>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop remove @better-than-coca/dsh-karpathy-guidelines
```

Both forms install the same code — `github:` resolves the repository, npm resolves the published tarball. Prefer npm; reach for `github:` when you need a revision that has not been released.

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
| `promptMode` | `compact` \| `full` \| `off` | `compact` | `compact` is the four principles rewritten to fit a standing block; `full` is the upstream text verbatim; `off` publishes nothing |
| `includeHeader` | boolean | `true` | Prepend one paragraph naming the plugin and stating that repository instructions win |
| `extraGuidance` | string | `''` | Appended verbatim under its own heading, for deployment-specific additions |

An unknown key is a **mount-time error**, not a silent no-op: the plugin names the offending key and the accepted ones. Validation lives in [`lib/config.js`](lib/config.js).

## Model Experience

### Request Surface and Activation Conditions

#### What the Model Sees

One system-prompt section, `better-than-coca:karpathy-guidelines`, ordered one slot before the harness's plan policy. Its text is a provider function, so the body is composed from the frozen configuration at each prompt assembly. With the defaults, the section text is exactly `lib/text.js#composeSectionText({ promptMode: 'compact', includeHeader: true, extraGuidance: '' })`.

`promptMode: 'full'` substitutes the upstream body from `assets/guidelines-full.md`; `promptMode: 'off'` makes the provider return an empty string, which contributes nothing.

#### Token Impact

Measured on the shipped assets: header + compact body is about 1.4k characters, roughly 300 tokens per request; `full` is about 2.4k characters. The cost is fixed for the life of the mount and does not grow with session length.

#### KV Cache Impact

The section is position-stable and its text is derived from one immutable configuration snapshot, so it contributes a stable prompt prefix and does not invalidate cache reuse between turns. Two things replace it: editing the configuration row (the plugin re-mounts and the body changes), and a host upgrade that changes the surrounding section order. Both are operator actions, not per-turn drift.

## How it works

1. The loader mounts the plugin from the bundle patch with its config row.
2. `lib/config.js` validates the row once and freezes the result; unknown keys fail the mount.
3. `lib/index.js` resolves its order from `ctx.systemPrompt.getSectionOrder('PLAN_POLICY') - 1` and registers one section inside `ctx.effect(...)`.
4. Each prompt assembly calls the section's `text` provider, which composes header + body + optional extra guidance from `assets/`.
5. Unloading the plugin disposes the effect and the section disappears from the prompt.

There is no tool, no event listener, no session state, and no network access.

## Known Limitations and Deferred Work

- **No per-turn relevance gate** — the section is in every request, including sessions with no code in them. `promptMode: 'off'` is manual; a hook plugin keyed on the turn's intent could gate it automatically, and that is deliberately not built yet.
- **No mandatory concluding procedure** — the four principles shape how work is done, not how it is reported. The `full` text keeps the upstream `step -> verify` plan template; there is no enforced response header such as `Assumption / Changed / Verified`, because the harness already owns its own response conventions.
- **Provenance** — the `full` body is the upstream SKILL.md text, redistributed under the MIT declaration in that repository's frontmatter. See [`NOTICE`](NOTICE).
- **Live-session rendering** — observed in a real desktop-app request on 2026-10-15 (DSH desktop app, `desktop` profile, `promptMode: compact`): the composed section reached the model's system prompt verbatim. The packaged artifact is also mounted and composed through the loader in an isolated profile, and the section contract is unit-tested. What tests do not cover is a third-party host whose section order differs from the one this was developed against.

## Tests

```powershell
cd <checkout>
node --test 'test/*.test.mjs'
```

Seventeen cases cover configuration defaults and rejection paths, the section registration contract (one section, derived order, disposer on unload, fallback when the registry is absent), and the composed text for every mode.

## Releasing

Releases are tag-driven. Bump `version` in `package.json`, commit, then push a tag carrying the same number:

```bash
git tag v0.1.3
git push origin v0.1.3
```

The `Publish Package` workflow checks that the tag matches `package.json`, runs the test suite, and publishes to npm. It authenticates with [OIDC trusted publishing](https://docs.npmjs.com/trusted-publishers), so there is no npm token in this repository and none in CI secrets — npm exchanges the workflow's short-lived identity token for a publish credential scoped to that single run, and generates provenance attestations automatically.

The workflow can also be started by hand from the Actions tab when a tag push needs a re-run.

## License

MIT. The redistributed guideline text carries its own upstream MIT declaration; see [`NOTICE`](NOTICE).
