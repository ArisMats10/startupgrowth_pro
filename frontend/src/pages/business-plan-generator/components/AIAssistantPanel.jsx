import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import {
  generateBusinessPlanInsights,
  generateBusinessPlanSectionContent,
  handleAnalysisError,
} from '../../../services/aiAnalysisService';

const strip = (v) => (typeof v === 'string' ? v.trim() : '');

const clamp = (text, max = 1200) => {
  const t = strip(text);
  if (!t) return '';
  return t.length > max ? `${t.slice(0, max)}…` : t;
};

const AIAssistantPanel = ({
  selectedSection,
  sectionTitle,
  sectionDescription,
  content,
  onContentChange,
  businessPlanData = {},
  initialAiInsights = null,
  onAiInsightsChange,
  aiDraft = '',
  onAiDraftChange,
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiInsights, setAiInsights] = useState(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [aiGeneratedContent, setAiGeneratedContent] = useState('');
  const [showAIGeneratedBox, setShowAIGeneratedBox] = useState(false);

  const promptRef = useRef(null);

  useEffect(() => {
    setAiGeneratedContent(aiDraft || '');
    setShowAIGeneratedBox(Boolean((aiDraft || '').trim()));
  }, [selectedSection, aiDraft]);

  useEffect(() => {
    setAiInsights(initialAiInsights || null);
  }, [selectedSection, initialAiInsights]);

  const buildCompanyContext = useMemo(() => {
    const getSectionContent = (sectionId) => strip(businessPlanData?.[sectionId]?.content);

    const executive = getSectionContent('executive-summary');
    const company = getSectionContent('company-description');
    const products = getSectionContent('products-services');
    const market = getSectionContent('market-analysis');
    const marketing = getSectionContent('marketing-sales-strategy');
    const financials = getSectionContent('financial-projections');
    const funding = getSectionContent('funding-requirements');

    const parts = [
      executive ? `EXECUTIVE SUMMARY (source of truth):\n${clamp(executive, 1500)}` : '',
      company ? `COMPANY DESCRIPTION:\n${clamp(company, 1200)}` : '',
      products ? `PRODUCTS & SERVICES:\n${clamp(products, 1200)}` : '',
      market ? `MARKET ANALYSIS:\n${clamp(market, 1200)}` : '',
      marketing ? `MARKETING & SALES STRATEGY:\n${clamp(marketing, 1000)}` : '',
      financials ? `FINANCIAL PROJECTIONS:\n${clamp(financials, 1000)}` : '',
      funding ? `FUNDING REQUIREMENTS:\n${clamp(funding, 1000)}` : '',
    ].filter(Boolean);

    return parts.length ? parts.join('\n\n') : '';
  }, [businessPlanData]);

  const applyImprovement = (improvement) => {
    const text =
      `Improve this section focusing on: ${improvement?.area}\n` +
      `Suggestion: ${improvement?.suggestion}\n` +
      (improvement?.impact ? `Target impact: ${improvement.impact}\n` : '');

    setCustomPrompt((prev) => (prev?.trim() ? `${prev.trim()}\n\n${text}` : text));
    promptRef.current?.focus?.();
  };

  const addMissingElement = (element) => {
    const text =
      `Add the missing element: ${element?.element}\n` +
      (element?.importance ? `Importance: ${element.importance}\n` : '') +
      `Guidance: ${element?.suggestion}\n` +
      `Write content I can paste into the section.`;

    setCustomPrompt((prev) => (prev?.trim() ? `${prev.trim()}\n\n${text}` : text));
    promptRef.current?.focus?.();
  };

  const handleGenerateContent = async () => {
    if (!selectedSection) return;

    setIsGeneratingContent(true);
    try {
      const resolvedTitle =
        (sectionTitle || '').trim() ||
        (selectedSection?.title || '').trim?.() ||
        String(selectedSection);

      const resolvedDescription = (sectionDescription || '').trim();
      const existingText = (content || '').trim();

      const baseInstruction = customPrompt?.trim()
        ? customPrompt.trim()
        : existingText
          ? `Improve, expand, and polish the section text below. Keep it consistent with the business plan context.`
          : `Write a detailed, original, practical section for a business plan, consistent with the business plan context.`;

      const fullPrompt = [
        baseInstruction,
        '',
        `TARGET SECTION: ${resolvedTitle}`,
        resolvedDescription ? `SECTION DESCRIPTION: ${resolvedDescription}` : null,
        '',
        `CURRENT SECTION TEXT (may be empty):`,
        existingText || `(empty)`,
        '',
        buildCompanyContext ? `BUSINESS PLAN CONTEXT (use as source of truth):\n${buildCompanyContext}` : null,
        '',
        `CONSISTENCY RULES:`,
        `- Reuse the same company name, product names, target market, and numbers already mentioned in the context.`,
        `- Do not invent contradictory facts. If info is missing, write plausible placeholders clearly marked (e.g. "[TBD]").`,
        `- Return ONLY the section text (no JSON, no markdown fences).`,
      ]
        .filter(Boolean)
        .join('\n');

      let aiContent = await generateBusinessPlanSectionContent(fullPrompt);

      if (!aiContent || !aiContent.trim()) {
        const retryPrompt =
          `Write the "${resolvedTitle}" section for a business plan.\n` +
          (resolvedDescription ? `Description: ${resolvedDescription}\n` : '') +
          (existingText ? `Incorporate and improve this existing text:\n${existingText}\n` : '') +
          `Return ONLY the section text.`;

        aiContent = await generateBusinessPlanSectionContent(retryPrompt);
      }

      if (!aiContent || !aiContent.trim()) {
        throw new Error('AI returned empty draft. Please try again.');
      }

      setAiGeneratedContent((prev) => {
        const prevTrimmed = (prev || '').trim();
        const nextChunk = (aiContent || '').trim();
        const merged = prevTrimmed ? `${prevTrimmed}\n\n${nextChunk}` : nextChunk;
        onAiDraftChange?.(merged);
        return merged;
      });

      setShowAIGeneratedBox(true);
    } catch (error) {
      alert(error?.message || 'Failed to generate content.');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const applyGeneratedContent = () => {
    if (!selectedSection) return;

    const draft = (aiGeneratedContent || '').trim();
    if (!draft) return;

    const current = (content || '').trim();
    const merged = current ? `${current}\n\n${draft}` : draft;
    onContentChange?.(selectedSection, merged);
  };

  const generateSectionInsights = async () => {
    if (!selectedSection || !content?.trim()) {
      alert('Please add some content first to get AI insights');
      return;
    }

    setIsGeneratingInsights(true);

    try {
      const insights = await generateBusinessPlanInsights(content, sectionTitle || selectedSection);
      setAiInsights(insights);
      onAiInsightsChange?.(insights);
    } catch (error) {
      const fallback = handleAnalysisError(error, 'Business plan analysis');
      alert(fallback?.message);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  if (!selectedSection) {
    return null;
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-card rounded-lg border border-border">
      <div className="p-3 md:p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-medium text-foreground flex items-center text-sm md:text-base">
          <Icon name="Sparkles" size={16} className="mr-2 text-primary" />
          AI Assistant
        </h3>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-4">
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateContent}
            disabled={isGeneratingContent}
            loading={isGeneratingContent}
            className="w-full"
          >
            <Icon name="Wand" size={14} className="mr-1" />
            Generate AI Content
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateSectionInsights}
            disabled={isGeneratingInsights}
            loading={isGeneratingInsights}
            className="w-full"
          >
            <Icon name="Brain" size={14} className="mr-1" />
            Analyze
          </Button>
        </div>

        <div>
          <textarea
            ref={promptRef}
            className="w-full border border-border rounded p-2 text-sm bg-muted/30"
            rows={3}
            placeholder="Enter a custom prompt for AI content generation (optional)..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />
        </div>

        {showAIGeneratedBox && (
          <div className="border border-border rounded-lg bg-muted/20">
            <div className="flex items-center justify-between gap-2 p-2 border-b border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon name="Wand" size={14} className="text-primary" />
                <span>AI Generated Draft</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyGeneratedContent}
                  disabled={!aiGeneratedContent?.trim()}
                >
                  Append
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAiGeneratedContent('');
                    setShowAIGeneratedBox(false);
                    onAiDraftChange?.('');
                  }}
                >
                  <Icon name="X" size={14} className="mr-1" />
                  Clear
                </Button>
              </div>
            </div>
            <div className="p-2">
              <textarea
                className="w-full border border-border rounded p-2 text-sm bg-background"
                rows={6}
                placeholder="AI-generated content will appear here. You can edit it before applying."
                value={aiGeneratedContent}
                onChange={(e) => {
                  setAiGeneratedContent(e.target.value);
                  onAiDraftChange?.(e.target.value);
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Tip: edit the draft here, then click “Append”.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {isGeneratingInsights ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-3" />
              <p className="text-sm text-muted-foreground">Analyzing your content...</p>
            </div>
          ) : !aiInsights ? (
            <div className="text-center py-6">
              <Icon name="Brain" size={28} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No insights yet</p>
              <p className="text-xs text-muted-foreground">Click “Analyze” to generate insights.</p>
            </div>
          ) : (
            <>
              <div className="bg-background rounded-lg p-3">
                <h4 className="text-sm font-medium text-foreground mb-2">Content Quality</h4>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{
                        width: `${Math.min(
                          Math.max((aiInsights?.assessment?.overallScore || 0) * 10, 0),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">{aiInsights?.assessment?.overallScore || 0}/10</span>
                </div>

                {aiInsights?.assessment?.strengths?.length > 0 && (
                  <ul className="space-y-1">
                    {aiInsights.assessment.strengths.slice(0, 3).map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start">
                        <Icon name="Check" size={12} className="text-success mt-0.5 mr-1" />
                        {s}
                      </li>
                    ))}
                  </ul>
                )}

                {aiInsights?.assessment?.weaknesses?.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {aiInsights.assessment.weaknesses.slice(0, 3).map((w, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start">
                        <Icon name="AlertCircle" size={12} className="text-warning mt-0.5 mr-1" />
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {aiInsights?.missingElements?.length > 0 && (
                <div className="bg-background rounded-lg p-3">
                  <h4 className="text-sm font-medium text-foreground mb-2">Missing Elements</h4>
                  <div className="space-y-2">
                    {aiInsights.missingElements.slice(0, 4).map((el, i) => (
                      <div key={i} className="border border-border rounded p-2">
                        <div className="flex items-start justify-between mb-1 gap-2">
                          <p className="text-xs font-medium text-foreground">{el?.element}</p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              el?.importance === 'high'
                                ? 'bg-error/10 text-error'
                                : el?.importance === 'medium'
                                  ? 'bg-warning/10 text-warning'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {el?.importance}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{el?.suggestion}</p>
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addMissingElement(el)}
                            className="text-xs h-6"
                          >
                            Add to Prompt
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiInsights?.improvements?.length > 0 && (
                <div className="bg-background rounded-lg p-3">
                  <h4 className="text-sm font-medium text-foreground mb-2">Suggested Improvements</h4>
                  <div className="space-y-2">
                    {aiInsights.improvements.slice(0, 4).map((imp, i) => (
                      <div key={i} className="border border-border rounded p-2">
                        <p className="text-xs font-medium text-foreground mb-1">{imp?.area}</p>
                        <p className="text-xs text-muted-foreground mb-2">{imp?.suggestion}</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-accent">{imp?.impact} impact</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => applyImprovement(imp)}
                            className="text-xs h-6"
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiInsights?.bestPractices?.length > 0 && (
                <div className="bg-background rounded-lg p-3">
                  <h4 className="text-sm font-medium text-foreground mb-2">Best Practices</h4>
                  <ul className="space-y-1">
                    {aiInsights.bestPractices.slice(0, 5).map((bp, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start">
                        <Icon name="Star" size={12} className="text-primary mt-0.5 mr-1" />
                        {bp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPanel;
