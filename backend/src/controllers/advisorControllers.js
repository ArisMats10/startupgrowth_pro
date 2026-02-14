import mongoose from "mongoose";
import AdvisorConversation from "../models/advisorConversationModel.js";
import {
  getOpenAIClient,
  getOpenAIModel,
  getOpenAIModelFallback,
  isInvalidModelError,
} from "../services/openaiClient.js";

async function createChatCompletionWithModelFallback(openai, params) {
  const modelCandidates = [getOpenAIModel(), getOpenAIModelFallback()].filter(Boolean);
  let lastError = null;

  for (const model of modelCandidates) {
    try {
      return await openai.chat.completions.create({
        ...params,
        model,
      });
    } catch (error) {
      lastError = error;
      if (model !== modelCandidates[modelCandidates.length - 1] && isInvalidModelError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Failed to create chat completion");
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

    const response = await createChatCompletionWithModelFallback(openai, {
      messages: [
        {
          role: "system",
          content:
            "You are an AI business advisor. Provide concise, practical advice about business strategy, planning, and growth. Reference the available tools: SWOT Analysis, Porter's Five Forces, and Business Plan Generator when relevant.",
        },
        ...normalizedHistory,
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_completion_tokens: 300,
    });

    const message = response?.choices?.[0]?.message?.content;
    if (typeof message !== "string" || !message.trim()) {
      return res.status(502).json({ error: "AI returned an empty response. Please try again." });
    }
    return res.status(200).json({ message });
  } catch (error) {
    const status = error?.status || error?.response?.status;
    const message = error?.message || error?.response?.data?.error || "Failed to generate advice";

    if (/OPENAI_API_KEY is not set/i.test(message)) {
      return res.status(503).json({ error: message });
    }

    if (status === 401) {
      return res.status(502).json({ error: "OpenAI authentication failed. Check OPENAI_API_KEY." });
    }

    if (status === 429) {
      return res.status(429).json({ error: "OpenAI rate limit/quota exceeded. Try again later." });
    }

    return res.status(500).json({ error: message });
  }
}
