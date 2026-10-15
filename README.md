# @better-than-coca/dsh-karpathy-guidelines

[English](README.en.md) | **中文**

把 Karpathy 的编码纪律做成 DeepSeek Harness 的**原生 system prompt 段落**。

## 为什么它不是 Codex 那个包的移植

上游 `andrej-karpathy-skills` 仓库是 Codex 原生的包：`.codex-plugin/plugin.json`、一份 `AGENTS.md`、一棵 `skills/<name>/SKILL.md` 目录，以及一段让你粘进 Custom Instructions 的 `instruction.md`。Codex 需要这个形状，因为 Codex 插件就是这个形状。DSH 的组装方式不同，所以这个插件改用 DSH 自己的扩展点，而不是去仿造一份 harness 根本不读的 manifest 格式：

| Codex 包用的 | 这个插件改用 |
|---|---|
| `.codex-plugin/plugin.json` | `package.json#dsh.bundle.patch`（DSH loader 的契约） |
| `instruction.md` 粘进设置 | 挂载时注册 `ctx.systemPrompt.section()` |
| `AGENTS.md` 维护者文件 | 不发；插件自己持有文本 |
| `skills/<name>/SKILL.md` | 打进包里的 `assets/*.md`，按组装方式组合 |
| 写死的指令槽位 | 从宿主注册表解析出的 `getSectionOrder('PLAN_POLICY') - 1` |

真正要紧的行为差异：skill 是**模型触发**的——技能目录只暴露 name 和 description，正文要等模型决定调用 `skill` 工具时才会到达。prompt 段落则是**每次请求都在**。这个插件存在的原因就是：只给 SKILL.md 的那条路，在真正需要它的会话里会静默失效。

## 环境要求

- 宿主的 DSH loader 要会读 `package.json#dsh.bundle.patch`（桌面端会读，`web` 和 `headless` profile 也会读）。
- Node.js 22 或更新。
- 别的都不需要。没有构建步骤，没有运行时依赖，`lib/` 是提交进仓库的，所以直接源码安装就能用。

## 安装

用**跟着你 DSH 安装目录一起发出来的**那个 `dsh` 启动器。PATH 上那个启动器管不了保留的 `desktop` profile，而桌面端跑的正是它。

启动器就在应用程序二进制文件旁边——含可执行文件（Windows 上是 `DeepSeek Harness.exe`）的那个文件夹，下文记作 `<DSH install>`：

| 平台 | 启动器 |
|---|---|
| Windows | `<DSH install>\resources\runtime\cli\bin\dsh.cmd` |
| macOS / Linux | `<DSH install>/resources/runtime/cli/bin/dsh` |

从 npm 安装：

```powershell
& '<DSH install>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add @better-than-coca/dsh-karpathy-guidelines
```

或者直接从 GitHub 装——不需要 npm 账号，适合你想装一个还没进 release 的 commit：

```powershell
& '<DSH install>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add github:better-than-coca/dsh-karpathy-guidelines
```

把 `desktop` 换成你要装进去的那个 profile。`github:` 形式跟的是默认分支，所以想锁到一个确定的版本，就在后面缀上 release tag：

```powershell
& '<DSH install>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add github:better-than-coca/dsh-karpathy-guidelines#v0.1.4
```

装完重启 DSH 应用；新的 bundle 在启动时挂载。

**确认它真的生效。** 开一个会话，看 system prompt 开头有没有一段以 `# Karpathy coding guidelines` 起头。在 `--dump-config` 里看到 `karpathy-guidelines` 这一行，只能证明 bundle 挂上了，不能证明段落注册成功——真正算数的是 prompt 里的那段文本。

卸载会移掉这个依赖和 bundle 行，段落随之消失：

```powershell
& '<DSH install>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop remove @better-than-coca/dsh-karpathy-guidelines
```

两种装法装到的是同一份代码——`github:` 去解析仓库，npm 去解析已发布的 tarball。优先用 npm；需要未发布的版本时再用 `github:`。

## 配置

在 DSH 的配置编辑器里改 `karpathy-guidelines` 这一行，或者改这个 bundle 的 patch 贡献出来的 `config:` 块：

```yaml
- insert:
    - id: karpathy-guidelines
      name: '@better-than-coca/dsh-karpathy-guidelines'
      config:
        promptMode: compact
        includeHeader: true
        extraGuidance: ''
```

| 键 | 取值 | 默认 | 作用 |
|---|---|---|---|
| `promptMode` | `compact` \| `full` \| `off` | `compact` | `compact` 是把四条准则改写成一枚常驻段落的篇幅；`full` 是上游原文；`off` 什么都不发 |
| `includeHeader` | boolean | `true` | 在前面加一段，写明插件名并声明仓库指令优先 |
| `extraGuidance` | string | `''` | 原样追加在它自己的一级标题下，用于部署侧的补充 |

未知的键是**挂载时报错**，不是静默忽略：插件会点名那个非法的键和可接受的键。校验代码在 [`lib/config.js`](lib/config.js)。

## 模型侧看到什么

### 请求面与激活条件

#### 模型看到的东西

一个 system prompt 段落，名为 `better-than-coca:karpathy-guidelines`，排在 harness 的 plan policy 前一个槽位。它的文本是个 provider 函数，所以每次组装 prompt 时，正文都是从冻结的那份配置现算出来的。默认配置下，段落文本就等于 `lib/text.js#composeSectionText({ promptMode: 'compact', includeHeader: true, extraGuidance: '' })`。

`promptMode: 'full'` 会换成 `assets/guidelines-full.md` 里的上游正文；`promptMode: 'off'` 让 provider 返回空字符串，等于不贡献任何内容。

#### Token 开销

按随包发布的资源实测：header + compact 正文约 1.4k 字符，折合每次请求约 300 token；`full` 约 2.4k 字符。这个开销在挂载期间恒定，不随会话变长而增长。

#### 对 KV cache 的影响

段落位置固定，文本来自同一份不可变配置快照，所以它贡献的是一段稳定的 prompt 前缀，不会把轮次之间的 cache 复用打散。会打破它的是另外两件事：改配置行（插件重挂载，正文变了），以及宿主升级改变了周边的段落顺序。两者都是运维动作，不是逐轮漂移。

## 工作原理

1. loader 按 bundle patch 和它的 config 行挂载插件。
2. `lib/config.js` 校验一次并冻结结果；未知的键直接让挂载失败。
3. `lib/index.js` 从 `ctx.systemPrompt.getSectionOrder('PLAN_POLICY') - 1` 解析出自己的顺序，在 `ctx.effect(...)` 里注册一个段落。
4. 每次组装 prompt 时调用段落的 `text` provider，它从 `assets/` 组合出 header + 正文 + 可选的附加指引。
5. 卸载插件会释放 effect，段落从 prompt 里消失。

没有工具、没有事件监听、没有会话状态、不访问网络。

## 已知限制与暂缓的工作

- **没有逐轮的相关性闸门**——段落进每一次请求，包括完全不含代码的会话。切 `off` 要手动；一个按当轮意图判断的 hook 插件本可以自动做这件事，这里是刻意还没写。
- **没有强制的收尾流程**——四条准则塑造的是怎么做，不是怎么汇报。`full` 文本保留了上游的 `step -> verify` 计划模板；这里没有强制的响应头（比如 `Assumption / Changed / Verified`），因为 harness 本身已经有自己的响应约定。
- **再分发的来源**——`full` 正文是上游 SKILL.md 的文本，按那个仓库 frontmatter 里的 MIT 声明再分发。见 [`NOTICE`](NOTICE)。
- **真实会话里的渲染**——2026-10-15 在一次真实桌面端请求里观测到（DSH 桌面端、`desktop` profile、`promptMode: compact`）：组合出的段落原样进了模型的 system prompt。打包产物另在一个隔离 profile 里经 loader 挂载并组合，段落契约也有单元测试。测试没覆盖的是第三方宿主——它的段落顺序可能和开发时的这个不一样。

## 测试

```powershell
cd <checkout>
node --test 'test/*.test.mjs'
```

17 个用例，覆盖配置默认值与拒绝路径、段落注册契约（只有一个段落、顺序是推导来的、卸载时释放、注册表缺失时的回退），以及每种模式组合出来的文本。

## 发布

发布由 tag 驱动。改 `package.json` 里的 `version`、提交，然后推一个同号的 tag：

```bash
git tag v0.1.4
git push origin v0.1.4
```

`Publish Package` workflow 会先核对 tag 与 `package.json` 是否一致，跑测试套件，然后发布到 npm。它用 [OIDC trusted publishing](https://docs.npmjs.com/trusted-publishers) 认证，所以这个仓库里没有 npm token，CI secrets 里也没有——npm 拿 workflow 的短期身份令牌换一份只对那一次运行有效的发布凭据，并自动生成 provenance 证明。

需要重跑一次 tag push 时，也可以从 Actions 页手动触发。

## 许可

MIT。再分发的那份准则文本带着它自己的上游 MIT 声明；见 [`NOTICE`](NOTICE)。
