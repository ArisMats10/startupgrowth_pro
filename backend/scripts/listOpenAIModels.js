import dotenv from "dotenv";
import { getOpenAIClient } from "../src/services/openaiClient.js";

dotenv.config();

async function main() {
  const openai = getOpenAIClient();
  const result = await openai.models.list();

  const models = Array.isArray(result?.data) ? result.data : [];
  const ids = models
    .map((m) => m?.id)
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b)));

  for (const id of ids) {
    console.log(id);
  }
}

main().catch((err) => {
  const status = err?.status || err?.response?.status;
  const message = err?.message || err?.response?.data?.error || String(err);
  console.error(`Failed to list models${status ? ` (status ${status})` : ""}: ${message}`);
  process.exit(1);
});
