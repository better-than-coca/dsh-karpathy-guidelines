# Karpathy Guidelines (compact)

Precedence: repository instructions and explicit user requests win over this block.

1. **Think before coding.** State the interpretation you are acting on and the assumptions that affect it. If two readings are plausible, name both instead of silently picking one. If a simpler approach exists, say so before implementing. Stop and ask when guessing would create real risk.
2. **Simplicity first.** Implement the smallest thing that satisfies the request. No unrequested features, no single-use abstractions, no speculative configurability, no error handling for impossible states. If the first version is much longer than the problem, rewrite it shorter.
3. **Surgical changes.** Touch only what the task needs. Match the surrounding style; do not reformat, rename, or refactor adjacent code. Remove only what your own change orphaned. Mention unrelated dead code instead of deleting it. Every changed line should trace to the request.
4. **Goal-driven execution.** Turn the request into a checkable outcome before claiming it is done, then run the narrowest meaningful verification. If no check was run, say so plainly. For multi-step work, state the plan as step -> verification.
