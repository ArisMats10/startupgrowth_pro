import OpenAI from "openai";

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to backend/.env and restart the backend server."
    );
  }
  return new OpenAI({ apiKey });
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-4o";
}

export function getOpenAIModelFallback() {
  return process.env.OPENAI_MODEL_FALLBACK || "gpt-4o";
}

export function isInvalidModelError(error) {
  const status = error?.status || error?.response?.status;
  const message =
    error?.error?.message || error?.response?.data?.error || error?.message || "";
  return (
    status === 400 &&
    /model/i.test(message) &&
    /(not found|does not exist|invalid|unknown)/i.test(message)
  );
}
