# Agentic DevSecOps Pack (Qwen3-Coder)

This pack adds:
- CI (build, lint, typecheck, test)
- Security (secret scan, Semgrep, dep audit)
- SBOM (Syft)
- PR Auto-Review powered by **Qwen3-Coder**

## Quick Start
1. Add secrets in your repo:
   - `QWEN_API_KEY` – DashScope key or your self-hosted API key
   - `QWEN_API_BASE` – e.g. `https://dashscope.aliyuncs.com/compatible-mode/v1` or your vLLM `http://<host>:8000/v1`
   - `QWEN_MODEL_ID` – e.g. `qwen-coder-plus` or your served model name
2. Commit `.github/workflows/*` and `tools/qwen/*`.
3. Open a PR → the reviewer bot posts findings.

## Local Usage
Run the reviewer locally for a branch diff:
```bash
export QWEN_API_KEY=...
export QWEN_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
export QWEN_MODEL_ID=qwen-coder-plus
node tools/qwen/pr-reviewer.mjs  # requires GITHUB_EVENT_PATH during CI; run via Action.
```
