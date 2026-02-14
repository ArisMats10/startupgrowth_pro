import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100';
axios.defaults.withCredentials = true;

function getAxiosErrorMessage(error, fallbackMessage) {
  const status = error?.response?.status;
  const backendMessage = error?.response?.data?.error;

  if (typeof backendMessage === 'string' && backendMessage.trim()) return backendMessage;
  if (status === 401) return 'Please log in to use AI features.';
  return error?.message || fallbackMessage;
}


/**
 * Generates SWOT analysis insights based on input data and a custom prompt
 * @param {Object} swotData - SWOT analysis data
 * @param {string} prompt - Custom prompt for the AI
 * @param {Object} [extraCriteria={}] - Additional criteria fields for SWOT
 * @returns {Promise<Object>} AI-generated insights and recommendations
 */
export async function generateSWOTInsights(swotData, prompt, extraCriteria = {}) {
  try {
    // Security: always generate via backend so API keys never reach the browser.
    const res = await axios.post(`${API_URL}/api/tools/swot/insights`, {
      swotData,
      prompt,
      extraCriteria,
      save: false,
    });

    if (res?.data?.result) return res.data.result;
    throw new Error('Empty response from AI service.');
  } catch (error) {
    console.error('Error generating SWOT insights:', error);
    throw new Error(getAxiosErrorMessage(error, 'Failed to generate AI insights.'));
  }
}

export async function generateAndSaveSwotAiForAnalysis({ id, swotData, prompt } = {}) {
  if (!id) throw new Error('id is required');
  const res = await axios.post(`${API_URL}/api/tools/swot/analyses/${id}/ai`, {
    swotData,
    prompt,
  });
  return res?.data;
}

export async function saveSwotItemsDraft({ swotData, title = '' }) {
  const res = await axios.post(`${API_URL}/api/tools/swot/items`, {
    swotData,
    title,
  });
  return res?.data;
}

export async function loadSwotItemsDraft() {
  const res = await axios.get(`${API_URL}/api/tools/swot/items`);
  return res?.data;
}

/**
 * Generates Porter's Five Forces analysis insights with custom prompt and extra criteria
 * @param {Array} forces - Array of force analysis data
 * @param {string} prompt - Custom prompt for the AI
 * @param {Object} [extraCriteria={}] - Additional criteria fields for recommendations, risks, opportunities
 * @returns {Promise<Object>} AI-generated analysis insights
 */
export async function generatePortersForcesInsights(forces, prompt, extraCriteria = {}, options = {}) {
  try {
    const res = await axios.post(`${API_URL}/api/tools/porter/insights`, {
      forces,
      prompt,
      extraCriteria,
      save: Boolean(options?.save),
      title: options?.title || '',
      industry: options?.industry || '',
    });

    if (res?.data?.result) {
      if (options?.returnMeta) {
        return { result: res.data.result, savedId: res.data.savedId || null };
      }
      return res.data.result;
    }

    throw new Error('Empty response from AI service.');
  } catch (error) {
    console.error('Error generating Porter\'s Forces insights:', error);
    throw new Error(getAxiosErrorMessage(error, 'Failed to generate competitive analysis.'));
  }
}

export async function saveAnalysisRecord({ type, title = '', input, output, upsert = false }) {
  const res = await axios.post(`${API_URL}/api/tools/analyses`, {
    type,
    title,
    input,
    output,
    upsert,
  });
  return res?.data;
}

export async function listSavedAnalyses({ type, subtype } = {}) {
  const params = {
    ...(type ? { type } : {}),
    ...(subtype ? { subtype } : {}),
  };
  const res = await axios.get(`${API_URL}/api/tools/analyses`, {
    params,
  });
  return res?.data;
}

export async function getSavedAnalysisById({ id }) {
  if (!id) throw new Error('id is required');
  const res = await axios.get(`${API_URL}/api/tools/analyses/${id}`);
  return res?.data;
}

export async function deleteSavedAnalysisById({ id }) {
  if (!id) throw new Error('id is required');
  const res = await axios.delete(`${API_URL}/api/tools/analyses/${id}`);
  return res?.data;
}

export async function renameSavedAnalysis({ id, title }) {
  if (!id) throw new Error('id is required');
  const res = await axios.patch(`${API_URL}/api/tools/analyses/${id}/title`, { title });
  return res?.data;
}

export async function updateSavedAnalysisById({ id, title, input, output }) {
  if (!id) throw new Error('id is required');
  const res = await axios.patch(`${API_URL}/api/tools/analyses/${id}`, {
    ...(title !== undefined ? { title } : {}),
    ...(input !== undefined ? { input } : {}),
    ...(output !== undefined ? { output } : {}),
  });
  return res?.data;
}

export async function loadLatestAnalysis({ type, industry }) {
  const res = await axios.get(`${API_URL}/api/tools/analyses/latest`, {
    params: { type, industry },
  });
  return res?.data;
}

export async function loadLatestAnalysisBySubtype({ type, industry, subtype }) {
  const res = await axios.get(`${API_URL}/api/tools/analyses/latest`, {
    params: { type, industry, subtype },
  });
  return res?.data;
}

export async function loadLatestPorterForceInsights({ industry }) {
  const res = await axios.get(`${API_URL}/api/tools/porter/force-insights`, {
    params: { industry },
  });
  return res?.data;
}

export async function generatePorterForceInsights({ industry, forces, save = true }) {
  const res = await axios.post(`${API_URL}/api/tools/porter/force-insights`, {
    industry,
    forces,
    save,
  });
  return res?.data;
}

export async function generatePorterForceInsightsClient({ industry, forces }) {
  // Deprecated: kept for backwards compatibility. Always use backend AI.
  return generatePorterForceInsights({ industry, forces, save: false });
}


/**
 * Generates AI-powered insights and recommendations for the Analytics Dashboard.
 * @param {Object} analyticsData - The analytics data to analyze
 * @param {string} prompt - Custom prompt for the AI (optional, can be empty for default)
 * @returns {Promise<{insights: Array, recommendations: Array}>}
 */
export async function generateAnalyticsInsights(analyticsData, prompt = '') {
  try {
    const res = await axios.post(`${API_URL}/api/tools/analytics/insights`, {
      analyticsData,
      prompt,
    });
    if (res?.data?.result) return res.data.result;
    throw new Error('Empty response from AI service.');
  } catch (error) {
    console.error('Error generating analytics insights:', error);
    throw new Error(getAxiosErrorMessage(error, 'Failed to generate analytics insights. Please try again.'));
  }
}



/**
 * Generates mentoring session recommendations and insights with a custom prompt
 * @param {Object} mentorProfile - Selected mentor's profile
 * @param {string} businessContext - User's business context/challenges
 * @param {string} sessionGoal - Goal for the mentoring session
 * @param {string} prompt - Custom prompt for the AI
 * @returns {Promise<Object>} AI-generated session recommendations
 */
export async function generateMentoringInsights(mentorProfile, businessContext, sessionGoal, prompt) {
  try {
    const res = await axios.post(`${API_URL}/api/tools/mentoring/insights`, {
      mentorProfile,
      businessContext,
      sessionGoal,
      prompt,
    });
    if (res?.data?.result) return res.data.result;
    throw new Error('Empty response from AI service.');
  } catch (error) {
    console.error('Error generating mentoring insights:', error);
    throw new Error(getAxiosErrorMessage(error, 'Failed to generate mentoring recommendations.'));
  }
}


/**
 * Generates business plan section content based on a custom prompt
 * @param {string} prompt - The prompt for the AI (should include section title/description)
 * @returns {Promise<string>} AI-generated content for the section
 */
export async function generateBusinessPlanSectionContent(prompt) {
  try {
    const res = await axios.post(`${API_URL}/api/tools/business-plan/section`, { prompt });
    if (typeof res?.data?.content === 'string') return res.data.content;
    throw new Error('Empty response from AI service.');
  } catch (error) {
    console.error('Error generating business plan section content:', error);
    throw new Error(getAxiosErrorMessage(error, 'Failed to generate section content.'));
  }
}



/**
 * Analyzes business plan content and provides AI-powered suggestions with a custom prompt
 * @param {string} businessPlanContent - Current business plan content
 * @param {string} section - Specific section being analyzed
 * @param {string} prompt - Custom prompt for the AI
 * @returns {Promise<Object>} AI-generated business plan improvements
 */
export async function generateBusinessPlanInsights(businessPlanContent, section, prompt) {
  try {
    const res = await axios.post(`${API_URL}/api/tools/business-plan/insights`, {
      businessPlanContent,
      section,
      prompt,
      save: false,
    });
    if (res?.data?.result) return res.data.result;
    throw new Error('Empty response from AI service.');
  } catch (error) {
    console.error('Error generating business plan insights:', error);
    throw new Error(getAxiosErrorMessage(error, 'Failed to analyze business plan.'));
  }
}

/**
 * Compares two business plans and provides AI-powered comparison insights
 * @param {string} planA - First business plan content
 * @param {string} planB - Second business plan content
 * @param {string} prompt - Custom prompt for the AI
 * @returns {Promise<Object>} AI-generated comparison
 */
export async function compareBusinessPlans(planA, planB, prompt) {
  try {
    const res = await axios.post(`${API_URL}/api/tools/business-plan/compare`, {
      planA,
      planB,
      prompt,
    });
    if (res?.data?.result) return res.data.result;
    throw new Error('Empty response from AI service.');
  } catch (error) {
    console.error('Error comparing business plans:', error);
    throw new Error(getAxiosErrorMessage(error, 'Failed to compare business plans.'));
  }
}

/**
 * Generates AI business advisor responses
 * @param {Array} chatHistory - Previous chat messages
 * @param {string} userMessage - Latest user message
 * @returns {Promise<string>} AI-generated response
 */
export async function generateBusinessAdvice(chatHistory, userMessage) {
  const history = Array.isArray(chatHistory) ? chatHistory : [];
  const messageText = typeof userMessage === 'string' ? userMessage : '';

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Two attempts against backend: full history, then trimmed.
  const backendAttempts = [history, history.slice(-10)];

  let lastBackendError = null;

  for (let attemptIndex = 0; attemptIndex < backendAttempts.length; attemptIndex += 1) {
    try {
      const res = await axios.post(
        `${API_URL}/api/tools/advisor/respond`,
        {
          chatHistory: backendAttempts[attemptIndex],
          userMessage: messageText,
        },
        { timeout: 20000 }
      );

      if (typeof res?.data?.message === 'string') {
        const message = res.data.message;
        if (message.trim()) return message;
        throw new Error('Empty response from AI advisor');
      }

      throw new Error('Invalid response from AI advisor');
    } catch (backendError) {
      lastBackendError = backendError;

      const status = backendError?.response?.status;
      const backendMessage = backendError?.response?.data?.error;

      // If the backend explicitly responded with a 4xx (except 408), don't retry or fall back silently.
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        throw new Error(backendMessage || backendError?.message || 'Backend AI request failed.');
      }

      // Rate limiting: surface it directly.
      if (status === 429) {
        throw new Error(backendMessage || 'AI is rate-limited right now. Please try again in a minute.');
      }

      // Retry once after a short delay.
      if (attemptIndex < backendAttempts.length - 1) {
        await delay(400);
        continue;
      }
    }
  }

  const backendMessage = lastBackendError?.response?.data?.error;
  throw new Error(
    backendMessage ||
      getAxiosErrorMessage(lastBackendError, 'AI service is temporarily unavailable. Make sure the backend is running.')
  );
}


/**
 * Error handler for API failures with fallback responses
 * @param {Error} error - The error object
 * @param {string} analysisType - Type of analysis that failed
 * @returns {Object} Fallback error response
 */
export function handleAnalysisError(error, analysisType) {
  console.error(`${analysisType} analysis error:`, error);

  return {
    error: true,
    message: `AI analysis temporarily unavailable. ${error?.message || 'Please try again later.'}`,
    fallbackSuggestion: 'Consider reviewing your analysis manually or contact support if the issue persists.'
  };
}