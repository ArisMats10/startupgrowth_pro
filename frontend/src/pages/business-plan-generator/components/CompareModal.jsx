import React, { useEffect, useState } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import pdfToText from 'react-pdftotext';
import { compareBusinessPlans } from 'services/aiAnalysisService';
import { listBusinessPlans, getBusinessPlan } from '../../../services/businessPlanPlansService';

const stripHtml = (s) => {
  if (typeof s !== 'string') return '';
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const buildPlanText = (plan) => {
  const data = plan?.businessPlanData && typeof plan.businessPlanData === 'object' ? plan.businessPlanData : {};
  const keys = Object.keys(data);

  if (keys.length === 0) return '';

  const parts = keys.map((sectionId) => {
    const section = data?.[sectionId] && typeof data[sectionId] === 'object' ? data[sectionId] : {};
    const title = (section?.title || sectionId || '').toString().trim();
    const content = stripHtml(section?.content || '');
    if (!title && !content) return '';
    return `SECTION: ${title || sectionId}\n${content || '(empty)'}`;
  }).filter(Boolean);

  return parts.join('\n\n');
};

const CompareModal = ({ isOpen, onClose }) => {
  const [plans, setPlans] = useState([]);

  // texts for A and B (either from plan or pdf)
  const [texts, setTexts] = useState(['', '']);
  const [sources, setSources] = useState(['plan', 'plan']); // 'plan' | 'pdf'
  const [selectedPlanIds, setSelectedPlanIds] = useState(['', '']);

  const [isLoading, setIsLoading] = useState([false, false]);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    // reset compare output every open (optional, but keeps state clean)
    setComparisonResult(null);
    setError(null);

    // fetch saved plans list
    (async () => {
      try {
        const list = await listBusinessPlans();
        setPlans(Array.isArray(list) ? list : []);
      } catch (e) {
        // user might not be logged in
        setPlans([]);
        console.warn('Failed to load saved plans:', e?.response?.data?.error || e?.message || e);
      }
    })();
  }, [isOpen]);

  const setLoadingIndex = (index, value) => {
    setIsLoading((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const setTextIndex = (index, value) => {
    setTexts((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSourceChange = (index, nextSource) => {
    setError(null);
    setComparisonResult(null);

    setSources((prev) => {
      const next = [...prev];
      next[index] = nextSource;
      return next;
    });

    // clear the current text for that side when switching sources
    setTextIndex(index, '');
    setSelectedPlanIds((prev) => {
      const next = [...prev];
      next[index] = '';
      return next;
    });
  };

  const handleSelectPlan = async (index, planId) => {
    setError(null);
    setComparisonResult(null);

    setSelectedPlanIds((prev) => {
      const next = [...prev];
      next[index] = planId;
      return next;
    });

    if (!planId) {
      setTextIndex(index, '');
      return;
    }

    setLoadingIndex(index, true);
    try {
      const plan = await getBusinessPlan(planId);
      const txt = buildPlanText(plan);
      setTextIndex(index, txt);
      if (!txt.trim()) {
        setError('Selected plan has no content to compare.');
      }
    } catch (e) {
      setTextIndex(index, '');
      setError(e?.response?.data?.error || e?.message || 'Failed to load plan.');
    } finally {
      setLoadingIndex(index, false);
    }
  };

  const handleFileUpload = async (event, index) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setComparisonResult(null);

    setLoadingIndex(index, true);
    try {
      const text = await pdfToText(file);
      setTextIndex(index, text || '');
    } catch (err) {
      console.error('Error extracting text from PDF:', err);
      setTextIndex(index, '');
      setError('Failed to extract text from the PDF.');
    } finally {
      setLoadingIndex(index, false);
    }
  };

  const handleCompare = async () => {
    setError(null);
    setComparisonResult(null);

    if (!texts[0]?.trim() || !texts[1]?.trim()) {
      setError('Please provide both plans (saved plan or PDF) before comparing.');
      return;
    }

    setIsComparing(true);
    try {
      const prompt =
        `Compare the following two business plans and highlight key differences, strengths, and weaknesses. ` +
        `Provide a summary of how they differ in market analysis, financial projections, marketing strategies, and overall feasibility.`;

      const result = await compareBusinessPlans(texts[0], texts[1], prompt);
      setComparisonResult(result);
    } catch (err) {
      console.error('Error comparing business plans:', err);
      setError(err?.message || 'Failed to compare business plans. Please try again.');
    } finally {
      setIsComparing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-card rounded-lg shadow-lg w-full max-w-6xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Compare Business Plans</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <Icon name="X" size={16} />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((index) => (
            <div key={index} className="border rounded p-4 bg-background">
              <h3 className="text-md font-medium mb-2">Plan {index + 1}</h3>

              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm text-muted-foreground">Source:</label>
                <select
                  className="border border-border rounded px-2 py-1 text-sm bg-card"
                  value={sources[index]}
                  onChange={(e) => handleSourceChange(index, e.target.value)}
                >
                  <option value="plan">Saved plan</option>
                  <option value="pdf">PDF upload</option>
                </select>
              </div>

              {sources[index] === 'plan' ? (
                <div className="mb-2">
                  <select
                    className="w-full border border-border rounded px-2 py-2 text-sm bg-card"
                    value={selectedPlanIds[index]}
                    onChange={(e) => handleSelectPlan(index, e.target.value)}
                  >
                    <option value="">Select a saved plan…</option>
                    {plans.map((p) => (
                      <option key={p?._id} value={p?._id}>
                        {p?.title || 'Untitled plan'}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Loads the saved plan content into the compare box.
                  </p>
                </div>
              ) : (
                <div className="mb-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => handleFileUpload(event, index)}
                    className="mb-2"
                  />
                </div>
              )}

              {isLoading[index] ? (
                <p className="text-sm text-muted-foreground">
                  {sources[index] === 'plan' ? 'Loading plan...' : 'Extracting text...'}
                </p>
              ) : (
                <textarea
                  className="w-full h-64 border border-border rounded p-2 text-sm bg-muted/10"
                  value={texts[index]}
                  readOnly
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 mt-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex-1" />
          <Button
            variant="primary"
            size="sm"
            onClick={handleCompare}
            disabled={isComparing || !texts[0]?.trim() || !texts[1]?.trim()}
          >
            {isComparing ? 'Comparing...' : 'Compare with AI'}
          </Button>
        </div>

        {comparisonResult && (
          <div className="mt-6 p-4 border rounded bg-muted/10 max-h-80 overflow-auto text-sm">
            <h3 className="font-semibold mb-2">AI Comparison Result</h3>
            <p className="mb-2">
              <strong>Summary:</strong> {comparisonResult.comparisonSummary}
            </p>

            {comparisonResult.strengthsA?.length > 0 && (
              <div className="mb-2">
                <strong>Strengths of Plan A:</strong>
                <ul className="list-disc list-inside">
                  {comparisonResult.strengthsA.map((s, i) => (
                    <li key={`sa-${i}`}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {comparisonResult.strengthsB?.length > 0 && (
              <div className="mb-2">
                <strong>Strengths of Plan B:</strong>
                <ul className="list-disc list-inside">
                  {comparisonResult.strengthsB.map((s, i) => (
                    <li key={`sb-${i}`}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {comparisonResult.weaknessesA?.length > 0 && (
              <div className="mb-2">
                <strong>Weaknesses of Plan A:</strong>
                <ul className="list-disc list-inside">
                  {comparisonResult.weaknessesA.map((w, i) => (
                    <li key={`wa-${i}`}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {comparisonResult.weaknessesB?.length > 0 && (
              <div className="mb-2">
                <strong>Weaknesses of Plan B:</strong>
                <ul className="list-disc list-inside">
                  {comparisonResult.weaknessesB.map((w, i) => (
                    <li key={`wb-${i}`}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {comparisonResult.improvementSuggestions?.length > 0 && (
              <div className="mb-2">
                <strong>Improvement Suggestions:</strong>
                <ul className="list-disc list-inside">
                  {comparisonResult.improvementSuggestions.map((s, i) => (
                    <li key={`is-${i}`}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {comparisonResult.overallRecommendation && (
              <p>
                <strong>Overall Recommendation:</strong> {comparisonResult.overallRecommendation}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 p-3 border-t border-border mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompareModal;