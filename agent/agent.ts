import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { defineAgent } from "eve";

const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: "https://ollama.com/v1",
  apiKey: process.env.OLLAMA_API_KEY!,
});

export default defineAgent({
  model: ollama(process.env.EVAL_OLLAMA_MODEL ?? "glm-5.2:cloud"),
  modelContextWindowTokens: 128_000, // ollama:cloud tags aren't in the AI Gateway catalog, so eve can't look them up
});
