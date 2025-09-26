// tools/qwen/pr-reviewer.mjs
// Fetch PR diff & files, ask Qwen3-Coder for review (quality, security), and post a summary comment.
import { Octokit } from "octokit";
import { readFileSync } from "fs";
import { chat } from "./qwenClient.mjs";

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN is required");
const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) throw new Error("GITHUB_EVENT_PATH is missing");
const event = JSON.parse(readFileSync(eventPath, "utf8"));

const { pull_request: pr, repository: repo } = event;
const [owner, repoName] = repo.full_name.split("/");
const octokit = new Octokit({ auth: token });

const prNumber = pr.number;

const filesResp = await octokit.rest.pulls.listFiles({
  owner, repo: repoName, pull_number: prNumber, per_page: 100
});

const changes = filesResp.data.map(f => ({
  filename: f.filename,
  status: f.status,
  patch: f.patch || ""
}));

// Build a compact prompt to fit token limits
const diffText = changes.map(c => `# ${c.status.toUpperCase()} ${c.filename}
${c.patch}`).join("\n\n").slice(0, 200_000);

const system = `You are Qwen3-Coder acting as a senior DevSecOps reviewer.
Return a tight review with these sections:
1) Summary risk score (0-10) + rationale
2) Security findings (CWE, severity, file:line)
3) Code quality issues (performance, readability)
4) Tests required (list concrete test names)
5) Fix-it patch hints (small diffs only)
Keep it specific and actionable. Prefer bullets. If no issues, say so.`;

const user = `Repository: ${repo.full_name}
PR #${prNumber}: ${pr.title}
Author: ${pr.user?.login}
Diff (unified, truncated if huge):

${diffText}`;

const content = await chat([
  { role: "system", content: system },
  { role: "user", content: user }
], { max_tokens: 1400, temperature: 0.1 });

await octokit.rest.issues.createComment({
  owner, repo: repoName, issue_number: prNumber,
  body: `🤖 **Qwen DevSecOps Review**\n\n${content}`
});

console.log("Posted Qwen review comment.");
