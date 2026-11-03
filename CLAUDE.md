# Claude Code instructions

- Read relevant files before changing code.
- Make the smallest complete change that satisfies the task.
- Do not modify unrelated files.
- Do not alter `.github/`, CI, security, or dependency configuration unless the task explicitly requires it.
- Do not change lockfiles unless dependencies changed.
- Never claim a command passed unless you actually ran it and it passed.
- If requirements are ambiguous, stop and explain in your final message instead of guessing.
- Do not commit secrets, credentials, or production data.

## Validation

No project toolchain exists yet. When one is added, document the exact
install, lint, typecheck, test, and build commands here and keep the
`Validate` step of `.github/workflows/agent.yml` in sync.

## Repo purpose

This repo is the software factory itself: infrastructure and automation that
let agents make changes to the repo through draft pull requests.
