import mongoose from "mongoose";
import AdvisorConversation from "../models/advisorConversationModel.js";
import {
  getOpenAIClient,
  getOpenAIModel,
  getOpenAIModelFallback,
  isInvalidModelError,
} from "../services/openaiClient.js";

function extractChatCompletionText(response) {
  const message = response?.choices?.[0]?.message;
  const text = message?.content;
  return typeof text === "string" ? text.trim() : "";
}

function extractResponsesApiText(response) {
  const direct = response?.output_text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const output = Array.isArray(response?.output) ? response.output : [];
  const chunks = [];
  for (const item of output) {
    const contentArr = Array.isArray(item?.content) ? item.content : [];
    for (const c of contentArr) {
      if (c?.type === "output_text" && typeof c?.text === "string") {
        chunks.push(c.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

function buildTranscript(messages) {
  const safe = Array.isArray(messages) ? messages : [];
  return safe
    .map((m) => {
      const role = String(m?.role || "user").toUpperCase();
      const content = typeof m?.content === "string" ? m.content.trim() : "";
      if (!content) return null;
      return `${role}: ${content}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

async function createAdvisorTextWithModelFallback(openai, { system, messages, temperature, maxTokens }) {
  const modelCandidates = [getOpenAIModel(), getOpenAIModelFallback()].filter(Boolean);
  let lastError = null;
  let lastDebug = null;

  const isTransientError = (error) => {
    const status = error?.status || error?.response?.status;
    const message = String(error?.message || error?.response?.data?.error || "");
    if (status && [500, 502, 503, 504].includes(status)) return true;
    return /(ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up|fetch failed|network)/i.test(message);
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const maxTransientRetries = 2;
  const maxEmptyRetries = 1;

  const summarizeMessages = (msgs) => {
    const safe = Array.isArray(msgs) ? msgs : [];
    return {
      count: safe.length,
      roles: safe.reduce((acc, m) => {
        const role = String(m?.role || "unknown");
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {}),
      charCount: safe.reduce((sum, m) => {
        const content = typeof m?.content === "string" ? m.content : "";
        return sum + content.length;
      }, 0),
    };
  };

  for (const model of modelCandidates) {
    const isLastModel = model === modelCandidates[modelCandidates.length - 1];

    const preferResponsesFirst = /^gpt-5/i.test(String(model));

    let emptyRetriesLeft = maxEmptyRetries;

    const tryChatCompletions = async () => {
      // Works well for 4o; may be flaky/empty for some 5.x configs.
      for (let attempt = 0; attempt <= maxTransientRetries; attempt += 1) {
        try {
          const response = await openai.chat.completions.create({
            model,
            messages: [{ role: "system", content: system }, ...(messages || [])],
            temperature,
            max_completion_tokens: maxTokens,
            tool_choice: "none",
          });

          const text = extractChatCompletionText(response);
          if (text) return { text, model, api: "chat.completions" };

          lastDebug = { model, api: "chat.completions", reason: "empty" };

          if (process.env.NODE_ENV !== "production") {
            console.warn("[advisor] empty chat.completions output", {
              model,
              attempt,
              messages: summarizeMessages(messages),
            });
          }

          if (emptyRetriesLeft > 0) {
            emptyRetriesLeft -= 1;
            await delay(150);
            continue;
          }

          break;
        } catch (error) {
          lastError = error;

          if (!isLastModel && isInvalidModelError(error)) {
            break;
          }

          if (attempt < maxTransientRetries && isTransientError(error)) {
            await delay(250 * Math.pow(2, attempt));
            continue;
          }

          if (!isLastModel && isTransientError(error)) {
            break;
          }

          throw error;
        }
      }
      return null;
    };

    const tryResponsesApi = async () => {
      // Better supported for many 5.x models; prefer it for gpt-5.x.
      let localEmptyRetriesLeft = maxEmptyRetries;

      for (let attempt = 0; attempt <= maxTransientRetries; attempt += 1) {
        try {
          const input = Array.isArray(messages)
            ? messages.map((m) => ({
                role: m?.role === "assistant" ? "assistant" : "user",
                content: typeof m?.content === "string" ? m.content : "",
              }))
            : "(no prior messages)";

          const response = await openai.responses.create({
            model,
            instructions: system,
            input,
            temperature,
            max_output_tokens: maxTokens,
          });

          const text = extractResponsesApiText(response);
          if (text) return { text, model, api: "responses" };

          lastDebug = { model, api: "responses", reason: "empty" };
          lastError = new Error("AI returned an empty response");

          if (process.env.NODE_ENV !== "production") {
            console.warn("[advisor] empty responses output", {
              model,
              attempt,
              messages: summarizeMessages(messages),
            });
          }

          if (localEmptyRetriesLeft > 0) {
            localEmptyRetriesLeft -= 1;
            await delay(150);
            continue;
          }

          break;
        } catch (error) {
          lastError = error;

          if (!isLastModel && isInvalidModelError(error)) {
            break;
          }

          if (attempt < maxTransientRetries && isTransientError(error)) {
            await delay(250 * Math.pow(2, attempt));
            continue;
          }

          if (!isLastModel && isTransientError(error)) {
            break;
          }

          throw error;
        }
      }

      return null;
    };

    const first = preferResponsesFirst ? tryResponsesApi : tryChatCompletions;
    const second = preferResponsesFirst ? tryChatCompletions : tryResponsesApi;

    const primary = await first();
    if (primary?.text) return primary;

    const secondary = await second();
    if (secondary?.text) return secondary;
  }

  const err = lastError || new Error("Failed to generate advice");
  if (lastDebug) err.advisorDebug = lastDebug;
  throw err;
}

function normalizeMessages(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((msg) => {
      const type = msg?.type === "user" ? "user" : msg?.type === "bot" ? "bot" : null;
      const message = typeof msg?.message === "string" ? msg.message.trim() : "";
      const timestamp = msg?.timestamp ? new Date(msg.timestamp) : new Date();

      if (!type || !message) return null;
      if (Number.isNaN(timestamp?.getTime?.())) return null;

      return { type, message, timestamp };
    })
    .filter(Boolean);
}

function defaultGreetingMessages() {
  return [
    {
      type: "bot",
      message: "Hello! I'm your AI business advisor. How can I help you today?",
      timestamp: new Date(),
    },
  ];
}

export async function getLatestAdvisorConversation(req, res) {
  try {
    const conversation = await AdvisorConversation.findOne({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ conversation: conversation || null });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function createAdvisorConversation(req, res) {
  try {
    const messages = normalizeMessages(req.body?.messages);

    // Enforce a single active conversation per user.
    await AdvisorConversation.deleteMany({ user: req.user._id });

    const conversation = await AdvisorConversation.create({
      user: req.user._id,
      messages: messages.length ? messages : defaultGreetingMessages(),
    });

    return res.status(201).json({ conversation });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function deleteAdvisorConversation(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid conversation id" });
    }

    const deleted = await AdvisorConversation.findOneAndDelete({ _id: id, user: req.user._id });
    if (!deleted) return res.status(404).json({ error: "Conversation not found" });

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function appendAdvisorConversationMessages(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid conversation id" });
    }

    const messages = normalizeMessages(req.body?.messages);
    if (!messages.length) {
      const existing = await AdvisorConversation.findOne({ _id: id, user: req.user._id });
      if (!existing) return res.status(404).json({ error: "Conversation not found" });
      return res.status(200).json({ conversation: existing });
    }

    const conversation = await AdvisorConversation.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $push: { messages: { $each: messages } } },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    return res.status(200).json({ conversation });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function generateAdvisorResponse(req, res) {
  try {
    const userMessage = typeof req.body?.userMessage === "string" ? req.body.userMessage.trim() : "";
    const chatHistory = Array.isArray(req.body?.chatHistory) ? req.body.chatHistory : [];

    if (!userMessage) {
      return res.status(400).json({ error: "userMessage is required" });
    }

    const normalizedHistory = chatHistory
      .slice(-30)
      .map((msg) => {
        const type = msg?.type === "user" ? "user" : msg?.type === "bot" ? "bot" : null;
        const message = typeof msg?.message === "string" ? msg.message.trim() : "";
        if (!type || !message) return null;
        return {
          role: type === "user" ? "user" : "assistant",
          content: message,
        };
      })
      .filter(Boolean);

    const openai = getOpenAIClient();

    const system =
      "You are an AI business advisor. Provide concise, practical advice about business strategy, planning, and growth. Reference the available tools: SWOT Analysis, Porter's Five Forces, and Business Plan Generator when relevant.";

    const { text } = await createAdvisorTextWithModelFallback(openai, {
      system,
      messages: [...normalizedHistory, { role: "user", content: userMessage }],
      temperature: 0.7,
      maxTokens: 300,
    });

    if (!text) {
      return res.status(503).json({ error: "AI returned an empty response. Please try again." });
    }
    return res.status(200).json({ message: text });
  } catch (error) {
    const status = error?.status || error?.response?.status;
    const message = error?.message || error?.response?.data?.error || "Failed to generate advice";
    const debug = process.env.NODE_ENV !== 'production' ? error?.advisorDebug : undefined;

    if (/empty response/i.test(String(message))) {
      return res.status(503).json({ error: "AI returned an empty response. Please try again.", ...(debug ? { debug } : {}) });
    }

    if (/OPENAI_API_KEY is not set/i.test(message)) {
      return res.status(503).json({ error: message, ...(debug ? { debug } : {}) });
    }

    if (status === 401) {
      // This is a backend configuration problem (invalid API key), not the user's auth.
      return res
        .status(503)
        .json({ error: "AI provider authentication failed. Verify OPENAI_API_KEY in backend/.env and restart the server.", ...(debug ? { debug } : {}) });
    }

    if (status === 429) {
      return res.status(429).json({ error: "OpenAI rate limit/quota exceeded. Try again later.", ...(debug ? { debug } : {}) });
    }

    // Upstream AI or network instability: return a consistent 503 so the frontend can handle it.
    if (status && [500, 502, 503, 504].includes(status)) {
      return res.status(503).json({ error: "AI service is temporarily unavailable. Please try again.", ...(debug ? { debug } : {}) });
    }

    return res.status(500).json({ error: message, ...(debug ? { debug } : {}) });
  }
}
