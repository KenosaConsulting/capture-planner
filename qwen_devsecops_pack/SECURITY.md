# SECURITY

- PRs are scanned for secrets (Secretlint), code issues (Semgrep), and vulnerable dependencies (npm audit).
- SBOM is generated on each push using Syft.
- PRs receive an automated **Qwen3-Coder** review focused on security and quality.

## Model routing
Use DashScope OpenAI-compatible endpoint or self-hosted vLLM:
- DashScope: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- vLLM: `http://localhost:8000/v1` (see Qwen docs)
