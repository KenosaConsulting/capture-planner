// tools/qwen/qwenClient.mjs
// Minimal OpenAI-compatible client pointed at Qwen (DashScope or self-hosted vLLM).
// Requires env: QWEN_API_KEY, QWEN_API_BASE, QWEN_MODEL_ID
import OpenAI from "openai";

export function makeQwenClient() {
  const apiKey = process.env.QWEN_API_KEY;
  const baseURL = process.env.QWEN_API_BASE || "https://dashscope.aliyuncs.com/compatible-mode/v1";
  if (!apiKey) throw new Error("QWEN_API_KEY is required");
  const client = new OpenAI({ apiKey, baseURL });
  const model = process.env.QWEN_MODEL_ID || "qwen-coder-plus";
  return { client, model };
}

export async function chat(messages, options = {}) {
  const { client, model } = makeQwenClient();
  const resp = await client.chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.2,
    top_p: options.top_p ?? 0.9,
    max_tokens: options.max_tokens ?? 1200,
  });
  const text = resp.choices?.[0]?.message?.content ?? "";
  return text;
}
