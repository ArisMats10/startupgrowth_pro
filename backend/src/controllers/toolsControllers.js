import Analysis from "../models/analysisModel.js";
import BusinessPlan from "../models/businessPlanModel.js";
import {
  getOpenAIClient,
  getOpenAIModel,
  getOpenAIModelFallback,
  isInvalidModelError,
} from "../services/openaiClient.js";
import mongoose from "mongoose";

function buildBusinessPlanExcerpt(businessPlanData) {
  try {
    const data = businessPlanData && typeof businessPlanData === "object" ? businessPlanData : {};
    const preferred = data["executive-summary"]?.content;
    const fallbackKey = Object.keys(data)[0];
    const fallback = fallbackKey ? data[fallbackKey]?.content : "";
    const content = typeof preferred === "string" && preferred.trim() ? preferred : (typeof fallback === "string" ? fallback : "");

    return String(content)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 280);
  } catch {
    return "";
  }
}

function mapOpenAIErrorToHttp(error) {
  const status = error?.status || error?.response?.status;
  const message = error?.message || error?.response?.data?.error || "";

  if (/OPENAI_API_KEY is not set/i.test(message)) {
    return { status: 503, message };
  }

  if (status === 401) {
    return { status: 502, message: "OpenAI authentication failed. Check OPENAI_API_KEY." };
  }

  if (status === 429) {
    return {
      status: 429,
      message: "OpenAI rate limit/quota exceeded. Try again later or check your OpenAI plan.",
    };
  }

  // Default: let the caller treat it as server error.
  return null;
}

function normalizeSwotQuadrantItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return item.text || item.content || "";
      return "";
    })
    .map((s) => String(s).trim())
    .filter(Boolean);
}

function validateSwotData(swotData) {
  if (!swotData || typeof swotData !== "object") {
    return "swotData must be an object";
  }
  const requiredKeys = ["strengths", "weaknesses", "opportunities", "threats"];
  for (const key of requiredKeys) {
    if (!(key in swotData)) return `swotData.${key} is required`;
    if (!Array.isArray(swotData[key])) return `swotData.${key} must be an array`;
  }
  return null;
}

function sanitizeSwotData(swotData) {
  return {
    strengths: Array.isArray(swotData?.strengths) ? swotData.strengths : [],
    weaknesses: Array.isArray(swotData?.weaknesses) ? swotData.weaknesses : [],
    opportunities: Array.isArray(swotData?.opportunities) ? swotData.opportunities : [],
    threats: Array.isArray(swotData?.threats) ? swotData.threats : [],
  };
}

function normalizeSwotQuadrantKey(value) {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;

  if (v === "strength" || v === "strengths") return "strengths";
  if (v === "weakness" || v === "weaknesses") return "weaknesses";
  if (v === "opportunity" || v === "opportunities") return "opportunities";
  if (v === "threat" || v === "threats") return "threats";

  // Common AI-ish synonyms
  if (v === "risk" || v === "risks") return "threats";
  if (v === "challenge" || v === "challenges") return "threats";
  if (v === "improvement" || v === "improvements") return "weaknesses";
  if (v === "advantage" || v === "advantages") return "strengths";
  if (v === "growth") return "opportunities";

  return null;
}

function extractQuadrantsFromText(text) {
  const t = typeof text === "string" ? text.toLowerCase() : "";
  const found = new Set();
  if (/\bstrength(s)?\b/.test(t)) found.add("strengths");
  if (/\bweakness(es)?\b/.test(t)) found.add("weaknesses");
  if (/\bopportunit(y|ies)\b/.test(t)) found.add("opportunities");
  if (/\bthreat(s)?\b/.test(t)) found.add("threats");
  return Array.from(found);
}

function buildSwotAiByQuadrant({ insights = [], blindSpots = [], connections = [] }) {
  const empty = () => ({ insights: [], blindSpots: [], connections: [] });
  const byQuadrant = {
    strengths: empty(),
    weaknesses: empty(),
    opportunities: empty(),
    threats: empty(),
  };

  for (const insight of insights) {
    const q = normalizeSwotQuadrantKey(insight?.category || insight?.quadrant);
    if (q) byQuadrant[q].insights.push(insight);
  }

  for (const spot of blindSpots) {
    const q = normalizeSwotQuadrantKey(spot?.category || spot?.quadrant);
    if (q) byQuadrant[q].blindSpots.push(spot);
  }

  for (const c of connections) {
    const qs = Array.isArray(c?.quadrants) ? c.quadrants : extractQuadrantsFromText(`${c?.connection || ""} ${c?.description || ""}`);
    for (const q of qs) {
      if (byQuadrant[q]) byQuadrant[q].connections.push(c);
    }
  }

  return byQuadrant;
}

function enhanceSwotAiResult(parsed) {
  const insights = Array.isArray(parsed?.insights) ? parsed.insights : [];
  const blindSpots = Array.isArray(parsed?.blindSpots) ? parsed.blindSpots : [];
  const connections = Array.isArray(parsed?.connections) ? parsed.connections : [];

  const normalizedInsights = insights.map((i) => {
    const quadrant = normalizeSwotQuadrantKey(i?.category || i?.quadrant);
    return {
      ...i,
      quadrant: quadrant || i?.quadrant || null,
      category: quadrant || i?.category || null,
    };
  });

  const normalizedBlindSpots = blindSpots.map((b) => {
    const quadrant = normalizeSwotQuadrantKey(b?.category || b?.quadrant);
    return {
      ...b,
      quadrant: quadrant || b?.quadrant || null,
      category: quadrant || b?.category || null,
    };
  });

  const normalizedConnections = connections.map((c) => {
    const quadrants = extractQuadrantsFromText(`${c?.connection || ""} ${c?.description || ""}`);
    return {
      ...c,
      quadrants,
    };
  });

  const byQuadrant = buildSwotAiByQuadrant({
    insights: normalizedInsights,
    blindSpots: normalizedBlindSpots,
    connections: normalizedConnections,
  });

  return {
    insights: normalizedInsights,
    connections: normalizedConnections,
    blindSpots: normalizedBlindSpots,
    byQuadrant,
  };
}

export async function generateSwotInsights(req, res) {
  try {
    const { swotData, prompt, title = "", save = false } = req.body || {};

    const validationError = validateSwotData(swotData);
    if (validationError) return res.status(400).json({ error: validationError });

    const strengths = normalizeSwotQuadrantItems(swotData.strengths);
    const weaknesses = normalizeSwotQuadrantItems(swotData.weaknesses);
    const opportunities = normalizeSwotQuadrantItems(swotData.opportunities);
    const threats = normalizeSwotQuadrantItems(swotData.threats);

    const swotContent = [
      `STRENGTHS: ${strengths.join(", ") || "(none)"}`,
      `WEAKNESSES: ${weaknesses.join(", ") || "(none)"}`,
      `OPPORTUNITIES: ${opportunities.join(", ") || "(none)"}`,
      `THREATS: ${threats.join(", ") || "(none)"}`,
    ].join("\n");

    const defaultPrompt =
      "You are an expert business strategist. Based on the SWOT below, return JSON with keys: insights (array), connections (array), blindSpots (array). Be practical, specific, and concise.";

    const schema = {
      type: "object",
      properties: {
        insights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              type: { type: "string" },
              category: { type: "string" },
              title: { type: "string" },
              content: { type: "string" },
              confidence: { type: "number" },
              priority: { type: "string" },
            },
            required: [
              "id",
              "type",
              "category",
              "title",
              "content",
              "confidence",
              "priority",
            ],
          },
        },
        connections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              connection: { type: "string" },
              description: { type: "string" },
              impact: { type: "string" },
            },
            required: ["id", "connection", "description", "impact"],
          },
        },
        blindSpots: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              area: { type: "string" },
              suggestion: { type: "string" },
              category: { type: "string" },
            },
            required: ["id", "area", "suggestion", "category"],
          },
        },
      },
      required: ["insights", "connections", "blindSpots"],
    };

    let response;
    try {
      const openai = getOpenAIClient();
      response = await openai.chat.completions.create({
        model: getOpenAIModel(),
        messages: [{ role: "user", content: `${prompt || defaultPrompt}\n\n${swotContent}` }],
        response_format: {
          type: "json_schema",
          json_schema: { name: "swot_insights", schema },
        },
        temperature: 0.7,
        max_completion_tokens: 1800,
      });
    } catch (error) {
      const mapped = mapOpenAIErrorToHttp(error);
      if (mapped) return res.status(mapped.status).json({ error: mapped.message });
      throw error;
    }

    const content = response?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;

    if (!parsed) return res.status(502).json({ error: "Empty AI response" });

    const enhanced = enhanceSwotAiResult(parsed);

    let savedDoc = null;
    if (save && mongoose.connection.readyState === 1) {
      const cleanSwotData = sanitizeSwotData(swotData);
      savedDoc = await Analysis.create({
        createdBy: req.user._id,
        user: req.user._id,
        type: "swot",
        title,
        swotData: cleanSwotData,
        input: { swotData: cleanSwotData },
        output: enhanced,
      });
    }

    return res.status(200).json({ result: enhanced, savedId: savedDoc?._id || null });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

// Generate & persist SWOT AI analysis (insights/connections/blind spots) for a specific saved SWOT analysis.
// Also allows sending the latest swotData from the UI so the AI analysis corresponds to the current quadrant items.
export async function generateAndSaveSwotAiForAnalysis(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database not connected" });
    }

    const { id } = req.params || {};
    const { swotData: incomingSwotData, prompt } = req.body || {};

    const analysis = await Analysis.findOne({
      _id: id,
      $or: [{ createdBy: req.user._id }, { user: req.user._id }],
    });
    if (!analysis) return res.status(404).json({ error: "Not found" });

    // Prefer swotData from the request (current UI state). Otherwise use the stored one.
    const sourceSwot = incomingSwotData && typeof incomingSwotData === "object"
      ? incomingSwotData
      : (analysis.swotData || analysis?.input?.swotData);

    const validationError = validateSwotData(sourceSwot);
    if (validationError) return res.status(400).json({ error: validationError });

    const cleanSwotData = sanitizeSwotData(sourceSwot);

    // Keep the analysis document in sync with the latest SWOT quadrant items.
    analysis.type = "swot";
    analysis.swotData = cleanSwotData;
    analysis.input = {
      ...(analysis.input && typeof analysis.input === "object" ? analysis.input : {}),
      subtype: analysis?.input?.subtype || "swot_analysis",
      swotData: cleanSwotData,
    };

    const strengths = normalizeSwotQuadrantItems(cleanSwotData.strengths);
    const weaknesses = normalizeSwotQuadrantItems(cleanSwotData.weaknesses);
    const opportunities = normalizeSwotQuadrantItems(cleanSwotData.opportunities);
    const threats = normalizeSwotQuadrantItems(cleanSwotData.threats);

    const swotContent = [
      `STRENGTHS: ${strengths.join(", ") || "(none)"}`,
      `WEAKNESSES: ${weaknesses.join(", ") || "(none)"}`,
      `OPPORTUNITIES: ${opportunities.join(", ") || "(none)"}`,
      `THREATS: ${threats.join(", ") || "(none)"}`,
    ].join("\n");

    const defaultPrompt =
      "You are an expert business strategist. Based on the SWOT below, return JSON with keys: insights (array), connections (array), blindSpots (array). Be practical, specific, and concise.";

    const schema = {
      type: "object",
      properties: {
        insights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              type: { type: "string" },
              category: { type: "string" },
              title: { type: "string" },
              content: { type: "string" },
              confidence: { type: "number" },
              priority: { type: "string" },
            },
            required: [
              "id",
              "type",
              "category",
              "title",
              "content",
              "confidence",
              "priority",
            ],
          },
        },
        connections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              connection: { type: "string" },
              description: { type: "string" },
              impact: { type: "string" },
            },
            required: ["id", "connection", "description", "impact"],
          },
        },
        blindSpots: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              area: { type: "string" },
              suggestion: { type: "string" },
              category: { type: "string" },
            },
            required: ["id", "area", "suggestion", "category"],
          },
        },
      },
      required: ["insights", "connections", "blindSpots"],
    };

    let response;
    try {
      const openai = getOpenAIClient();
      response = await openai.chat.completions.create({
        model: getOpenAIModel(),
        messages: [{ role: "user", content: `${prompt || defaultPrompt}\n\n${swotContent}` }],
        response_format: {
          type: "json_schema",
          json_schema: { name: "swot_insights", schema },
        },
        temperature: 0.7,
        max_completion_tokens: 1800,
      });
    } catch (error) {
      const mapped = mapOpenAIErrorToHttp(error);
      if (mapped) return res.status(mapped.status).json({ error: mapped.message });
      throw error;
    }

    const content = response?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    if (!parsed) return res.status(502).json({ error: "Empty AI response" });

    const enhanced = enhanceSwotAiResult(parsed);
    const swotAi = {
      ...enhanced,
      generatedAt: new Date().toISOString(),
    };

    analysis.output = {
      ...(analysis.output && typeof analysis.output === "object" ? analysis.output : {}),
      swotAi,
    };

    await analysis.save();

    return res.status(200).json({ swotAi });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

// Save the user's current SWOT quadrant items (draft) so the 4 quadrants persist.
// This is separate from "Save Analysis" (which creates a titled record) and is meant
// to support auto-save / resume.
export async function saveSwotItems(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database not connected" });
    }

    const { swotData, title = "" } = req.body || {};
    const validationError = validateSwotData(swotData);
    if (validationError) return res.status(400).json({ error: validationError });

    const cleanSwotData = sanitizeSwotData(swotData);

    const filter = {
      type: "swot",
      createdBy: req.user._id,
      "input.subtype": "swot_items",
    };

    const update = {
      $set: {
        createdBy: req.user._id,
        user: req.user._id,
        type: "swot",
        title: title || "SWOT Draft",
        swotData: cleanSwotData,
        input: {
          subtype: "swot_items",
          swotData: cleanSwotData,
        },
        output: {},
      },
    };

    const saved = await Analysis.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    return res.status(200).json({ savedId: saved?._id || null });
  } catch (error) {
    console.error("saveSwotItems error:", error);
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function getLatestSwotItems(req, res) {
  try {
    const query = {
      type: "swot",
      $or: [{ createdBy: req.user._id }, { user: req.user._id }],
      "input.subtype": "swot_items",
    };

    const analysis = await Analysis.findOne(query).sort({ createdAt: -1 });
    return res.status(200).json({ analysis: analysis || null });
  } catch (error) {
    console.error("getLatestSwotItems error:", error);
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function generatePortersInsights(req, res) {
  try {
    const {
      forces,
      prompt,
      title = "",
      save = false,
      industry = "",
    } = req.body || {};
    if (!Array.isArray(forces) || forces.length === 0) {
      return res.status(400).json({ error: "forces must be a non-empty array" });
    }

    const forcesContent = forces
      .map((f) => {
        const name = f?.name || "Unnamed Force";
        const score = typeof f?.score === "number" ? f.score : "?";
        const comments = f?.comments || f?.description || "No comments provided";
        return `${name} (Score: ${score}/5): ${comments}`;
      })
      .join("\n");

    const defaultPrompt =
      "You are an expert strategy consultant. Based on Porter’s Five Forces below, return JSON with keys: overallAssessment, recommendations, risks, opportunities.";

    const schema = {
      type: "object",
      properties: {
        overallAssessment: {
          type: "object",
          properties: {
            competitiveIntensity: { type: "string" },
            marketAttractiveness: { type: "string" },
            strategicPosition: { type: "string" },
            keyTakeaways: { type: "array", items: { type: "string" } },
          },
          required: [
            "competitiveIntensity",
            "marketAttractiveness",
            "strategicPosition",
            "keyTakeaways",
          ],
        },
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              priority: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              expectedImpact: { type: "string" },
            },
            required: ["id", "priority", "title", "description", "expectedImpact"],
          },
        },
        risks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              risk: { type: "string" },
              severity: { type: "string" },
              mitigation: { type: "string" },
            },
            required: ["risk", "severity", "mitigation"],
          },
        },
        opportunities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              opportunity: { type: "string" },
              potential: { type: "string" },
              actionItems: { type: "array", items: { type: "string" } },
            },
            required: ["opportunity", "potential", "actionItems"],
          },
        },
      },
      required: ["overallAssessment", "recommendations", "risks", "opportunities"],
    };

    let response;
    try {
      const openai = getOpenAIClient();
      response = await openai.chat.completions.create({
        model: getOpenAIModel(),
        messages: [
          { role: "user", content: `${prompt || defaultPrompt}\n\n${forcesContent}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "porters_insights", schema },
        },
        temperature: 0.7,
        max_completion_tokens: 2200,
      });
    } catch (error) {
      const mapped = mapOpenAIErrorToHttp(error);
      if (mapped) return res.status(mapped.status).json({ error: mapped.message });
      throw error;
    }

    const content = response?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    if (!parsed) return res.status(502).json({ error: "Empty AI response" });

    let savedDoc = null;
    if (save && mongoose.connection.readyState === 1) {
      savedDoc = await Analysis.create({
        createdBy: req.user._id,
        user: req.user._id,
        type: "porter",
        title,
        input: { forces, industry },
        output: parsed,
      });
    }

    return res.status(200).json({ result: parsed, savedId: savedDoc?._id || null });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function generateBusinessPlanSection(req, res) {
  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required" });
    }

    const systemInstruction =
      "You write business plan sections. Follow the user's instructions carefully, stay consistent with provided context, and avoid repeating the exact same wording when asked to revise.";

    const extractResponseText = (response) => {
      const content = response?.choices?.[0]?.message?.content;
      return typeof content === "string" ? content.trim() : "";
    };

    const extractResponsesApiText = (response) => {
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
    };

    const createWithChatCompletions = async (openai, model, userPrompt) => {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        presence_penalty: 0.2,
        frequency_penalty: 0.1,
        max_completion_tokens: 900,
      });

      const text = extractResponseText(response);
      return { text, raw: response };
    };

    const createWithResponsesApi = async (openai, model, userPrompt) => {
      // Some newer models may prefer/require the Responses API.
      const response = await openai.responses.create({
        model,
        instructions: systemInstruction,
        input: userPrompt,
        temperature: 0.8,
        max_output_tokens: 900,
      });

      const text = extractResponsesApiText(response);
      return { text, raw: response };
    };

    const openai = getOpenAIClient();
    const modelCandidates = [getOpenAIModel(), getOpenAIModelFallback()].filter(Boolean);

    let lastError = null;
    for (const model of modelCandidates) {
      try {
        // Try chat.completions first.
        const chat = await createWithChatCompletions(openai, model, prompt);
        if (chat.text) return res.status(200).json({ content: chat.text });

        // If chat returns empty, try Responses API.
        const resp = await createWithResponsesApi(openai, model, prompt);
        if (resp.text) return res.status(200).json({ content: resp.text });

        lastError = new Error("Empty AI response");
      } catch (error) {
        lastError = error;
        if (model !== modelCandidates[modelCandidates.length - 1] && isInvalidModelError(error)) {
          continue;
        }

        const mapped = mapOpenAIErrorToHttp(error);
        if (mapped) return res.status(mapped.status).json({ error: mapped.message });

        // If this model didn't work, try fallback model before failing.
        if (model !== modelCandidates[modelCandidates.length - 1]) {
          continue;
        }
      }
    }

    // Never return empty content: surface an actionable error.
    const message = lastError?.message || "AI returned empty content";
    return res.status(503).json({ error: message });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function generateBusinessPlanInsights(req, res) {
  try {
    const { businessPlanContent, section, prompt, title = "", save = false } = req.body || {};
    if (!businessPlanContent || typeof businessPlanContent !== "string") {
      return res.status(400).json({ error: "businessPlanContent is required" });
    }
    if (!section || typeof section !== "string") {
      return res.status(400).json({ error: "section is required" });
    }

    // const finalPrompt =
    //   prompt ||
    //   `Analyze this business plan section (${section}) and return actionable improvements as JSON.`;

    const finalPrompt =
        prompt ||
        `Analyze this business plan section (${section}). Return JSON ONLY matching the schema.
      - overallScore must be a number 0-10
      - missingElements importance must be one of: high, medium, low
      - suggestions must be concrete and actionable`;


    const schema = {
        type: "object",
        properties: {
          assessment: {
            type: "object",
            properties: {
              overallScore: { type: "number" }, // 0..10
              strengths: { type: "array", items: { type: "string" } },
              weaknesses: { type: "array", items: { type: "string" } },
            },
            required: ["overallScore", "strengths", "weaknesses"],
          },
          missingElements: {
            type: "array",
            items: {
              type: "object",
              properties: {
                element: { type: "string" },
                importance: { type: "string" }, // "high" | "medium" | "low"
                suggestion: { type: "string" },
              },
              required: ["element", "importance", "suggestion"],
            },
          },
          improvements: {
            type: "array",
            items: {
              type: "object",
              properties: {
                area: { type: "string" },
                suggestion: { type: "string" },
                impact: { type: "string" },
              },
              required: ["area", "suggestion", "impact"],
            },
          },
          bestPractices: { type: "array", items: { type: "string" } },
        },
        required: ["assessment", "missingElements", "improvements", "bestPractices"],
      };

    let response;
    try {
      const openai = getOpenAIClient();
      response = await openai.chat.completions.create({
        model: getOpenAIModel(),
        messages: [
          {
            role: "user",
            content: `${finalPrompt}\n\nSECTION: ${section}\n\nCONTENT:\n${businessPlanContent}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "business_plan_insights", schema },
        },
        temperature: 0.7,
        max_completion_tokens: 2000,
      });
    } catch (error) {
      const mapped = mapOpenAIErrorToHttp(error);
      if (mapped) return res.status(mapped.status).json({ error: mapped.message });
      throw error;
    }

    const content = response?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    if (!parsed) return res.status(502).json({ error: "Empty AI response" });

    let savedDoc = null;
    if (save && mongoose.connection.readyState === 1) {
      savedDoc = await Analysis.create({
        createdBy: req.user._id,
        user: req.user._id,
        type: "business_plan",
        title,
        input: { businessPlanContent, section, prompt: finalPrompt },
        output: parsed,
      });
    }

    return res.status(200).json({ result: parsed, savedId: savedDoc?._id || null });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function compareBusinessPlans(req, res) {
  try {
    const { planA, planB, prompt } = req.body || {};
    if (typeof planA !== "string" || !planA.trim()) {
      return res.status(400).json({ error: "planA is required" });
    }
    if (typeof planB !== "string" || !planB.trim()) {
      return res.status(400).json({ error: "planB is required" });
    }

    const defaultPrompt =
      "Compare the two business plans. Return JSON ONLY matching the schema. Be concise, specific, and actionable.";

    const schema = {
      type: "object",
      properties: {
        comparisonSummary: { type: "string" },
        strengthsA: { type: "array", items: { type: "string" } },
        strengthsB: { type: "array", items: { type: "string" } },
        weaknessesA: { type: "array", items: { type: "string" } },
        weaknessesB: { type: "array", items: { type: "string" } },
        improvementSuggestions: { type: "array", items: { type: "string" } },
        overallRecommendation: { type: "string" },
      },
      required: [
        "comparisonSummary",
        "strengthsA",
        "strengthsB",
        "weaknessesA",
        "weaknessesB",
        "improvementSuggestions",
        "overallRecommendation",
      ],
    };

    let response;
    try {
      const openai = getOpenAIClient();
      response = await openai.chat.completions.create({
        model: getOpenAIModel(),
        messages: [
          {
            role: "user",
            content: `${typeof prompt === "string" && prompt.trim() ? prompt : defaultPrompt}\n\nBUSINESS PLAN A:\n${planA}\n\nBUSINESS PLAN B:\n${planB}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "business_plan_comparison", schema },
        },
        temperature: 0.7,
        max_completion_tokens: 2200,
      });
    } catch (error) {
      const mapped = mapOpenAIErrorToHttp(error);
      if (mapped) return res.status(mapped.status).json({ error: mapped.message });
      throw error;
    }

    const content = response?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    if (!parsed) return res.status(502).json({ error: "Empty AI response" });

    return res.status(200).json({ result: parsed });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function generateAnalyticsInsights(req, res) {
  try {
    const { analyticsData, prompt } = req.body || {};
    if (!analyticsData || typeof analyticsData !== "object") {
      return res.status(400).json({ error: "analyticsData must be an object" });
    }

    const analyticsSummary = Object.entries(analyticsData)
      .map(([key, value]) => {
        if (value && typeof value === "object") return `${key}: ${JSON.stringify(value)}`;
        return `${key}: ${value}`;
      })
      .join("\n");

    const defaultPrompt =
      "You are an AI business analyst. Analyze the analytics data and return JSON with: insights (3-5) and recommendations (2-3).";

    const schema = {
      type: "object",
      properties: {
        insights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "number" },
              type: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              impact: { type: "string" },
              action: { type: "string" },
              timestamp: { type: "string" },
            },
            required: ["id", "type", "title", "description", "impact", "action", "timestamp"],
          },
        },
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "number" },
              category: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              priority: { type: "string" },
              effort: { type: "string" },
              impact: { type: "string" },
            },
            required: ["id", "category", "title", "description", "priority", "effort", "impact"],
          },
        },
      },
      required: ["insights", "recommendations"],
    };

    let response;
    try {
      const openai = getOpenAIClient();
      response = await openai.chat.completions.create({
        model: getOpenAIModel(),
        messages: [
          {
            role: "user",
            content: `${typeof prompt === "string" && prompt.trim() ? prompt : defaultPrompt}\n\n${analyticsSummary}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "analytics_insights", schema },
        },
        temperature: 0.9,
        max_completion_tokens: 1800,
      });
    } catch (error) {
      const mapped = mapOpenAIErrorToHttp(error);
      if (mapped) return res.status(mapped.status).json({ error: mapped.message });
      throw error;
    }

    const content = response?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    if (!parsed) return res.status(502).json({ error: "Empty AI response" });

    return res.status(200).json({ result: parsed });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function generateMentoringInsights(req, res) {
  try {
    const { mentorProfile, businessContext, sessionGoal, prompt } = req.body || {};

    if (!mentorProfile || typeof mentorProfile !== "object") {
      return res.status(400).json({ error: "mentorProfile must be an object" });
    }
    if (typeof businessContext !== "string" || !businessContext.trim()) {
      return res.status(400).json({ error: "businessContext is required" });
    }
    if (typeof sessionGoal !== "string" || !sessionGoal.trim()) {
      return res.status(400).json({ error: "sessionGoal is required" });
    }

    const context = [
      `Mentor: ${mentorProfile?.name || ""}`,
      `Expertise: ${Array.isArray(mentorProfile?.specializations) ? mentorProfile.specializations.join(", ") : ""}`,
      `Experience: ${mentorProfile?.experience || ""}`,
      `Business Context: ${businessContext}`,
      `Session Goal: ${sessionGoal}`,
    ]
      .filter(Boolean)
      .join("\n");

    const defaultPrompt =
      "Generate mentoring session preparation tasks, key questions, discussion topics, action items, and tips. Return JSON ONLY matching the schema.";

    const schema = {
      type: "object",
      properties: {
        preparation: {
          type: "array",
          items: {
            type: "object",
            properties: {
              task: { type: "string" },
              description: { type: "string" },
              priority: { type: "string" },
            },
            required: ["task", "description", "priority"],
          },
        },
        keyQuestions: { type: "array", items: { type: "string" } },
        discussionTopics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              topic: { type: "string" },
              relevance: { type: "string" },
              expectedOutcome: { type: "string" },
            },
            required: ["topic", "relevance", "expectedOutcome"],
          },
        },
        actionItems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action: { type: "string" },
              timeline: { type: "string" },
              measurableOutcome: { type: "string" },
            },
            required: ["action", "timeline", "measurableOutcome"],
          },
        },
        sessionTips: { type: "array", items: { type: "string" } },
      },
      required: ["preparation", "keyQuestions", "discussionTopics", "actionItems", "sessionTips"],
    };

    let response;
    try {
      const openai = getOpenAIClient();
      response = await openai.chat.completions.create({
        model: getOpenAIModel(),
        messages: [
          {
            role: "user",
            content: `${typeof prompt === "string" && prompt.trim() ? prompt : defaultPrompt}\n\n${context}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "mentoring_session_insights", schema },
        },
        temperature: 0.7,
        max_completion_tokens: 2000,
      });
    } catch (error) {
      const mapped = mapOpenAIErrorToHttp(error);
      if (mapped) return res.status(mapped.status).json({ error: mapped.message });
      throw error;
    }

    const content = response?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    if (!parsed) return res.status(502).json({ error: "Empty AI response" });

    return res.status(200).json({ result: parsed });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function createBusinessPlan(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Service Unavailable: Database not connected" });
    }

    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { title, template = null, businessPlanData, completionStatus = {}, aiInsightsBySection = {}, aiDraftsBySection = {} } = req.body || {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "title is required" });
    }
    if (!businessPlanData || typeof businessPlanData !== "object") {
      return res.status(400).json({ error: "businessPlanData must be an object" });
    }

    const doc = await BusinessPlan.create({
      user: userId,
      title: title.trim(),
      template,
      excerpt: buildBusinessPlanExcerpt(businessPlanData),
      businessPlanData,
      completionStatus: completionStatus && typeof completionStatus === "object" ? completionStatus : {},
      aiInsightsBySection: aiInsightsBySection && typeof aiInsightsBySection === "object" ? aiInsightsBySection : {},
      aiDraftsBySection: aiDraftsBySection && typeof aiDraftsBySection === "object" ? aiDraftsBySection : {},
    });

    return res.status(201).json({
      plan: {
        _id: doc._id,
        title: doc.title,
        template: doc.template,
        excerpt: doc.excerpt,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function listBusinessPlans(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Service Unavailable: Database not connected" });
    }

    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const plans = await BusinessPlan.find({ user: userId })
      .sort({ updatedAt: -1 })
      .select({ title: 1, template: 1, excerpt: 1, createdAt: 1, updatedAt: 1 })
      .lean();

    return res.json({ plans });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function getBusinessPlan(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Service Unavailable: Database not connected" });
    }

    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params || {};
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid plan id" });
    }

    const plan = await BusinessPlan.findOne({ _id: id, user: userId }).lean();
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    return res.json({ plan });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function deleteBusinessPlan(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Service Unavailable: Database not connected" });
    }

    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params || {};
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid plan id" });
    }

    const deleted = await BusinessPlan.findOneAndDelete({ _id: id, user: userId }).lean();
    if (!deleted) return res.status(404).json({ error: "Plan not found" });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function updateBusinessPlan(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Service Unavailable: Database not connected" });
    }

    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params || {};
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid plan id" });
    }

    const { title, template, businessPlanData, completionStatus ,aiInsightsBySection, aiDraftsBySection,autosave } = req.body || {};
    const update = {};

    if (typeof title === "string" && title.trim()) update.title = title.trim();
    if (template !== undefined) update.template = template;
    if (businessPlanData !== undefined) {
      if (!businessPlanData || typeof businessPlanData !== "object") {
        return res.status(400).json({ error: "businessPlanData must be an object" });
      }
      update.businessPlanData = businessPlanData;
      update.excerpt = buildBusinessPlanExcerpt(businessPlanData);
    }
    if (completionStatus !== undefined) {
      update.completionStatus = completionStatus && typeof completionStatus === "object" ? completionStatus : {};
    }

    if (aiInsightsBySection !== undefined) {
      update.aiInsightsBySection =
      aiInsightsBySection && typeof aiInsightsBySection === "object" ? aiInsightsBySection : {};
    }
    if (aiDraftsBySection !== undefined) {
      update.aiDraftsBySection =
      aiDraftsBySection && typeof aiDraftsBySection === "object" ? aiDraftsBySection : {};
    }
      const updated = await BusinessPlan.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: update },
      { new: true, timestamps: true }
    );

    if (!updated) return res.status(404).json({ error: "Plan not found" });

    return res.json({
      plan: {
        _id: updated._id,
        title: updated.title,
        template: updated.template,
        excerpt: updated.excerpt,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function listAnalyses(req, res) {
  try {
    const { type, subtype } = req.query || {};
    const query = {
      $or: [{ createdBy: req.user._id }, { user: req.user._id }],
    };
    if (type) query.type = type;
    if (subtype && typeof subtype === "string") {
      query["input.subtype"] = subtype;
    }

    // Compute a lightweight items count for SWOT lists without returning full swotData.
    const safeSize = (expr) => ({
      $cond: [{ $isArray: expr }, { $size: expr }, 0],
    });

    const strengthsArr = {
      $ifNull: ["$swotData.strengths", { $ifNull: ["$input.swotData.strengths", []] }],
    };
    const weaknessesArr = {
      $ifNull: ["$swotData.weaknesses", { $ifNull: ["$input.swotData.weaknesses", []] }],
    };
    const opportunitiesArr = {
      $ifNull: ["$swotData.opportunities", { $ifNull: ["$input.swotData.opportunities", []] }],
    };
    const threatsArr = {
      $ifNull: ["$swotData.threats", { $ifNull: ["$input.swotData.threats", []] }],
    };

    const analyses = await Analysis.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 1,
          type: 1,
          title: 1,
          createdAt: 1,
          updatedAt: 1,
          input: { subtype: "$input.subtype" },
          itemsCount: {
            $add: [
              safeSize(strengthsArr),
              safeSize(weaknessesArr),
              safeSize(opportunitiesArr),
              safeSize(threatsArr),
            ],
          },
        },
      },
    ]);

    return res.status(200).json({ analyses });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function getAnalysis(req, res) {
  try {
    const { id } = req.params;
    const analysis = await Analysis.findOne({
      _id: id,
      $or: [{ createdBy: req.user._id }, { user: req.user._id }],
    });
    if (!analysis) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ analysis });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function getLatestAnalysis(req, res) {
  try {
    const { type, industry, subtype } = req.query || {};

    if (!type || typeof type !== "string") {
      return res.status(400).json({ error: "type is required" });
    }

    const allowedTypes = ["swot", "porter", "business_plan"];
    if (!allowedTypes.includes(type)) {
      return res
        .status(400)
        .json({ error: `type must be one of: ${allowedTypes.join(", ")}` });
    }

    const query = {
      type,
      $or: [{ createdBy: req.user._id }, { user: req.user._id }],
    };
    if (industry && typeof industry === "string") {
      query["input.industry"] = industry;
    }

    if (subtype && typeof subtype === "string") {
      query["input.subtype"] = subtype;
    }

    const analysis = await Analysis.findOne(query).sort({ createdAt: -1 });
    if (!analysis) return res.status(404).json({ error: "Not found" });

    return res.status(200).json({ analysis });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function generatePorterForceInsights(req, res) {
  try {
    const { industry = "", forces, save = true } = req.body || {};

    if (!industry || typeof industry !== "string") {
      return res.status(400).json({ error: "industry is required" });
    }

    if (!Array.isArray(forces) || forces.length === 0) {
      return res.status(400).json({ error: "forces must be a non-empty array" });
    }

    const expectedIds = (forces || [])
      .map((f) => (typeof f?.id === "string" ? f.id.trim() : ""))
      .filter(Boolean);

    if (expectedIds.length === 0) {
      return res.status(400).json({ error: "forces must include non-empty id fields" });
    }

    const forcesContent = forces
      .map((f) => {
        const id = f?.id || "";
        const name = f?.name || "Unnamed Force";
        const score = typeof f?.score === "number" ? f.score : Number(f?.score);
        const scoreText = Number.isFinite(score) ? `${score}/5` : "?/5";
        const criteriaText = Array.isArray(f?.criteria)
          ? f.criteria
              .map((c) => `${c?.question || "Criterion"}=${c?.score ?? "?"}`)
              .join(", ")
          : "";
        const comments = f?.comments || "";

        return [
          `ID: ${id}`,
          `Name: ${name}`,
          `Score: ${scoreText}`,
          criteriaText ? `Criteria: ${criteriaText}` : null,
          comments ? `Notes: ${comments}` : null,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n---\n\n");

    const prompt = [
      "You are an expert strategy consultant.",
      `Industry: ${industry}.`,
      "Generate AI insights for EACH of Porter’s Five Forces provided.",
      "Use the force score (1-5) and any criteria/notes if provided.",
      `Return forceInsights with EXACT keys matching these force IDs (do not rename, do not omit): ${expectedIds.join(
        ", "
      )}.`,
      "Return JSON matching the schema.",
      "For recommendations and trends, return short bullet-like strings.",
      "Do not include markdown.",
    ].join("\n");

    const forceInsightItemSchema = {
      type: "object",
      properties: {
        analysis: { type: "string" },
        recommendations: { type: "array", items: { type: "string" } },
        trends: { type: "array", items: { type: "string" } },
      },
      required: ["analysis", "recommendations", "trends"],
      additionalProperties: false,
    };

    const forceInsightsProperties = expectedIds.reduce((acc, id) => {
      acc[id] = forceInsightItemSchema;
      return acc;
    }, {});

    const schema = {
      type: "object",
      properties: {
        forceInsights: {
          type: "object",
          properties: forceInsightsProperties,
          required: expectedIds,
          additionalProperties: false,
        },
      },
      required: ["forceInsights"],
      additionalProperties: false,
    };

    const openai = getOpenAIClient();
    const modelCandidates = [getOpenAIModel(), getOpenAIModelFallback()].filter(Boolean);
    let response = null;
    let lastError = null;

    for (const model of modelCandidates) {
      try {
        response = await openai.chat.completions.create({
          model,
          messages: [{ role: "user", content: `${prompt}\n\n${forcesContent}` }],
          response_format: {
            type: "json_schema",
            json_schema: { name: "porter_force_insights", schema },
          },
          temperature: 0.6,
          max_completion_tokens: 1800,
        });
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        if (model !== modelCandidates[modelCandidates.length - 1] && isInvalidModelError(err)) {
          continue;
        }
        throw err;
      }
    }

    if (!response) {
      throw lastError || new Error("Failed to create chat completion");
    }

    const content = response?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    if (!parsed) return res.status(502).json({ error: "Empty AI response" });

    const normalizeForceId = (value) => {
      if (typeof value !== "string") return "";
      return value
        .toLowerCase()
        .trim()
        .replace(/[_\s]+/g, "-")
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    };

    const forceInsights = parsed?.forceInsights;
    if (!forceInsights || typeof forceInsights !== "object") {
      return res.status(502).json({ error: "AI response missing forceInsights" });
    }

    // Be resilient: occasionally the model returns normalized keys (e.g. supplier_power).
    const normalizedExpected = expectedIds.reduce((acc, id) => {
      acc[normalizeForceId(id)] = id;
      return acc;
    }, {});

    for (const key of Object.keys(forceInsights)) {
      if (expectedIds.includes(key)) continue;
      const mapped = normalizedExpected[normalizeForceId(key)];
      if (mapped && !(mapped in forceInsights)) {
        forceInsights[mapped] = forceInsights[key];
      }
    }

    const missingIds = expectedIds.filter((id) => !(id in forceInsights));
    if (missingIds.length > 0) {
      // Prefer returning a partial-but-usable response instead of hard failing the UI.
      for (const id of missingIds) {
        forceInsights[id] = {
          analysis:
            "AI could not generate insights for this force on this attempt. Please retry generating insights.",
          recommendations: [],
          trends: [],
        };
      }
      parsed.warnings = [
        `AI response missing insights for force IDs: ${missingIds.join(", ")}`,
      ];
    }

    const hasAnyNonEmpty = expectedIds.some((id) => {
      const item = forceInsights?.[id];
      const analysis = typeof item?.analysis === "string" ? item.analysis.trim() : "";
      const recs = Array.isArray(item?.recommendations) ? item.recommendations : [];
      const trends = Array.isArray(item?.trends) ? item.trends : [];
      return Boolean(analysis) && (recs.length > 0 || trends.length > 0);
    });

    if (!hasAnyNonEmpty) {
      return res.status(502).json({ error: "AI returned empty insights" });
    }

    if (!save || mongoose.connection.readyState !== 1) {
      // Still return the generated data even if DB is down.
      return res.status(200).json({ result: parsed, savedId: null });
    }

    const filter = {
      type: "porter",
      createdBy: req.user._id,
      "input.subtype": "force_insights",
      "input.industry": industry,
    };

    const update = {
      $set: {
        createdBy: req.user._id,
        user: req.user._id,
        type: "porter",
        title: `Porter Force AI Insights - ${industry}`,
        input: {
          subtype: "force_insights",
          industry,
          forcesSnapshot: forces,
        },
        output: {
          forceInsights: parsed.forceInsights,
        },
      },
    };

    const saved = await Analysis.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    return res.status(200).json({ result: parsed, savedId: saved?._id || null });
  } catch (error) {
    console.error("generatePorterForceInsights error:", error);
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function getLatestPorterForceInsights(req, res) {
  try {
    const { industry = "" } = req.query || {};
    if (!industry || typeof industry !== "string") {
      return res.status(400).json({ error: "industry is required" });
    }

    const query = {
      type: "porter",
      $or: [{ createdBy: req.user._id }, { user: req.user._id }],
      "input.subtype": "force_insights",
      "input.industry": industry,
    };

    const analysis = await Analysis.findOne(query).sort({ createdAt: -1 });
    return res.status(200).json({ analysis: analysis || null });
  } catch (error) {
    console.error("getLatestPorterForceInsights error:", error);
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function deleteAnalysis(req, res) {
  try {
    const { id } = req.params;
    const deleted = await Analysis.findOneAndDelete({
      _id: id,
      $or: [{ createdBy: req.user._id }, { user: req.user._id }],
    });
    if (!deleted) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function renameAnalysis(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database not connected" });
    }

    const { id } = req.params;
    const { title } = req.body || {};
    const trimmed = typeof title === "string" ? title.trim() : "";

    if (!trimmed) {
      return res.status(400).json({ error: "title is required" });
    }
    if (trimmed.length > 200) {
      return res.status(400).json({ error: "title is too long (max 200 characters)" });
    }

    const updated = await Analysis.findOneAndUpdate(
      {
        _id: id,
        $or: [{ createdBy: req.user._id }, { user: req.user._id }],
      },
      { $set: { title: trimmed } },
      { new: true }
    ).select("_id title updatedAt");

    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ analysis: updated });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function updateAnalysis(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database not connected" });
    }

    const { id } = req.params;
    const { title, input, output } = req.body || {};

    if (title === undefined && input === undefined && output === undefined) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const update = { $set: {} };

    if (title !== undefined) {
      const trimmed = typeof title === "string" ? title.trim() : "";
      if (!trimmed) {
        return res.status(400).json({ error: "title is required" });
      }
      if (trimmed.length > 200) {
        return res.status(400).json({ error: "title is too long (max 200 characters)" });
      }
      update.$set.title = trimmed;
    }

    if (input !== undefined) {
      update.$set.input = input;
    }

    if (output !== undefined) {
      update.$set.output = output;
    }

    // If this is a SWOT analysis and input contains swotData, keep the structured field in sync.
    if (input && typeof input === "object" && input?.swotData) {
      update.$set.swotData = sanitizeSwotData(input.swotData);
      // Also normalize input.swotData for consistency
      update.$set["input.swotData"] = sanitizeSwotData(input.swotData);
    }

    const updated = await Analysis.findOneAndUpdate(
      {
        _id: id,
        $or: [{ createdBy: req.user._id }, { user: req.user._id }],
      },
      update,
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ analysis: updated });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}

export async function createAnalysis(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database not connected" });
    }

    const { type, title = "", input, output, upsert = false } = req.body || {};

    if (!type || typeof type !== "string") {
      return res.status(400).json({ error: "type is required" });
    }

    const allowedTypes = ["swot", "porter", "business_plan"];
    if (!allowedTypes.includes(type)) {
      return res
        .status(400)
        .json({ error: `type must be one of: ${allowedTypes.join(", ")}` });
    }

    if (input === undefined || input === null) {
      return res.status(400).json({ error: "input is required" });
    }

    if (output === undefined || output === null) {
      return res.status(400).json({ error: "output is required" });
    }

    if (upsert === true && input && typeof input === "object") {
      const subtype = input?.subtype;
      const industry = input?.industry;
      if (!subtype || typeof subtype !== "string") {
        return res.status(400).json({ error: "input.subtype is required for upsert" });
      }
      if (!industry || typeof industry !== "string") {
        return res.status(400).json({ error: "input.industry is required for upsert" });
      }

      const filter = {
        type,
        createdBy: req.user._id,
        "input.subtype": subtype,
        "input.industry": industry,
      };

      const update = {
        $set: {
          createdBy: req.user._id,
          user: req.user._id,
          type,
          title,
          input,
          output,
        },
      };

      const doc = await Analysis.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });

      return res.status(200).json({ savedId: doc?._id || null });
    }

    const cleanSwotData = type === "swot" ? sanitizeSwotData(input?.swotData) : null;

    const doc = await Analysis.create({
      createdBy: req.user._id,
      user: req.user._id,
      type,
      title,
      ...(type === "swot" && input?.swotData ? { swotData: cleanSwotData } : {}),
      ...(type === "swot" && input?.swotData ? { input: { ...input, swotData: cleanSwotData } } : { input }),
      output,
    });

    return res.status(201).json({ savedId: doc?._id || null });
  } catch (error) {
    // Surface validation errors clearly
    return res.status(500).json({ error: error?.message || "Server Error" });
  }
}
