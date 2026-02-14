import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ForceSection from './components/ForceSection';
import IndustrySelector from './components/IndustrySelector';
import ScoreVisualization from './components/ScoreVisualization';
import ActionPanel from './components/ActionPanel';
import {
  generatePorterForceInsights,
  generatePorterForceInsightsClient,
  generatePortersForcesInsights,
  loadLatestAnalysis,
  loadLatestAnalysisBySubtype,
  loadLatestPorterForceInsights,
  saveAnalysisRecord,
} from '../../services/aiAnalysisService';
import { exportPortersFiveForcesAsPDF } from '../../services/jspdf';
import { useAuth } from '../../context/authContext.jsx';

const INDUSTRY_DEFAULT_FORCE_SCORES = {
  saas: {
    'competitive-rivalry': 4,
    'supplier-power': 2,
    'buyer-power': 4,
    'threat-substitution': 3,
    'threat-new-entry': 3,
  },
  ecommerce: {
    'competitive-rivalry': 4,
    'supplier-power': 3,
    'buyer-power': 5,
    'threat-substitution': 4,
    'threat-new-entry': 4,
  },
  fintech: {
    'competitive-rivalry': 4,
    'supplier-power': 3,
    'buyer-power': 4,
    'threat-substitution': 3,
    'threat-new-entry': 2,
  },
  healthcare: {
    'competitive-rivalry': 3,
    'supplier-power': 3,
    'buyer-power': 3,
    'threat-substitution': 2,
    'threat-new-entry': 2,
  },
  manufacturing: {
    'competitive-rivalry': 3,
    'supplier-power': 4,
    'buyer-power': 3,
    'threat-substitution': 3,
    'threat-new-entry': 2,
  },
  consulting: {
    'competitive-rivalry': 4,
    'supplier-power': 1,
    'buyer-power': 4,
    'threat-substitution': 3,
    'threat-new-entry': 5,
  },
  food: {
    'competitive-rivalry': 5,
    'supplier-power': 3,
    'buyer-power': 4,
    'threat-substitution': 4,
    'threat-new-entry': 4,
  },
  education: {
    'competitive-rivalry': 4,
    'supplier-power': 2,
    'buyer-power': 4,
    'threat-substitution': 4,
    'threat-new-entry': 3,
  },
  'real-estate': {
    'competitive-rivalry': 3,
    'supplier-power': 3,
    'buyer-power': 3,
    'threat-substitution': 2,
    'threat-new-entry': 2,
  },
  custom: {
  'competitive-rivalry': 1,
    'supplier-power': 1,
    'buyer-power': 1,
    'threat-substitution': 1,
    'threat-new-entry': 1,
  },
};

function criteriaDefaultsForForceScore(score) {
  // Deterministic, non-random defaults that roughly match the overall force score.
  switch (Number(score)) {
    case 1:
      return [1, 1, 1, 2, 1];
    case 2:
      return [2, 2, 3, 2, 1];
    case 3:
      return [3, 3, 3, 2, 4];
    case 4:
      return [4, 4, 3, 5, 4];
    case 5:
      return [5, 5, 4, 5, 5];
    default:
      return [3, 3, 3, 3, 3];
  }
}

function applyIndustryDefaultsToForces(forces, industry) {
  const defaults = INDUSTRY_DEFAULT_FORCE_SCORES[industry];
  if (!defaults) return forces;

  return (forces || []).map((force) => {
    const defaultScore = defaults?.[force?.id];
    if (!defaultScore) return force;
    const criteriaScores = criteriaDefaultsForForceScore(defaultScore);

    return {
      ...force,
      score: defaultScore,
      criteria: (force?.criteria || []).map((criterion, idx) => ({
        ...criterion,
        score: criteriaScores[idx] ?? defaultScore,
      })),
      comments: '',
      aiInsights: null,
    };
  });
}

const PortersFiveForcesAnalysis = () => {
  const { user } = useAuth();
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [activeTab, setActiveTab] = useState('analysis');
  const [expandedForce, setExpandedForce] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [analysisName, setAnalysisName] = useState('');
  const [industryAnalysisTitle, setIndustryAnalysisTitle] = useState('');
  const [forces, setForces] = useState([]);
  const [aiIndustryAnalysis, setAiIndustryAnalysis] = useState(null);
  const [aiSavedId, setAiSavedId] = useState(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isCheckingSaved, setIsCheckingSaved] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [hasSavedIndustryAnalysis, setHasSavedIndustryAnalysis] = useState(false);
  const [analysisCreatedByName, setAnalysisCreatedByName] = useState('');
  const [refreshingForceId, setRefreshingForceId] = useState(null);
  const [deletingForceId, setDeletingForceId] = useState(null);
  const [forceInsightsErrorById, setForceInsightsErrorById] = useState({});
  const forceInsightsSaveTimerRef = useRef(null);
  const savedForceInsightsLoadedKeyRef = useRef('');
  const savedIndustryCheckKeyRef = useRef('');

  // Initialize forces data
  useEffect(() => {
    const initialForces = [
      {
        id: 'competitive-rivalry',
        name: 'Competitive Rivalry',
        description: 'Intensity of competition among existing players',
        score: 3,
        comments: '',
        criteria: [
          { question: 'Number of competitors in the market', score: 1 },
          { question: 'Rate of industry growth', score: 1 },
          { question: 'Product differentiation level', score: 1 },
          { question: 'Switching costs for customers', score: 1 },
          { question: 'Exit barriers for competitors', score: 1 }
        ],
        keyFactors: [
          { name: 'Market Concentration', description: 'Few large players dominate the market', impact: 'High' },
          { name: 'Product Commoditization', description: 'Limited differentiation increases price competition', impact: 'High' },
          { name: 'Customer Loyalty', description: 'Strong brand loyalty reduces competitive pressure', impact: 'Medium' },
          { name: 'Innovation Rate', description: 'Rapid technological change intensifies competition', impact: 'High' }
        ],
        aiInsights: null
      },
      {
        id: 'supplier-power',
        name: 'Supplier Power',
        description: 'Bargaining power of suppliers in your industry',
        score: 2,
        comments: '',
        criteria: [
          { question: 'Number of suppliers available', score: 4 },
          { question: 'Uniqueness of supplier products/services', score: 2 },
          { question: 'Cost of switching suppliers', score: 2 },
          { question: 'Supplier concentration vs industry concentration', score: 3 },
          { question: 'Importance of volume to suppliers', score: 2 }
        ],
        keyFactors: [
          { name: 'Supplier Concentration', description: 'Limited number of key suppliers increases their power', impact: 'Medium' },
          { name: 'Switching Costs', description: 'Low costs to change suppliers reduce supplier power', impact: 'Low' },
          { name: 'Forward Integration', description: 'Suppliers ability to integrate forward', impact: 'Low' },
          { name: 'Input Importance', description: 'Critical inputs give suppliers more leverage', impact: 'Medium' }
        ],
        aiInsights: null
      },
      {
        id: 'buyer-power',
        name: 'Buyer Power',
        description: 'Bargaining power of customers in your market',
        score: 4,
        comments: '',
        criteria: [
          { question: 'Number of customers vs suppliers', score: 4 },
          { question: 'Customer concentration', score: 3 },
          { question: 'Switching costs for customers', score: 4 },
          { question: 'Customer price sensitivity', score: 4 },
          { question: 'Backward integration threat', score: 3 }
        ],
        keyFactors: [
          { name: 'Price Sensitivity', description: 'Customers highly sensitive to price changes', impact: 'High' },
          { name: 'Information Access', description: 'Easy access to competitor information increases power', impact: 'High' },
          { name: 'Volume Purchases', description: 'Large volume buyers have more negotiating power', impact: 'Medium' },
          { name: 'Product Importance', description: 'Product importance to customer operations', impact: 'Medium' }
        ],
        aiInsights: null
      },
      {
        id: 'threat-substitution',
        name: 'Threat of Substitution',
        description: 'Likelihood of customers switching to alternative solutions',
        score: 3,
        comments: '',
        criteria: [
          { question: 'Availability of substitute products', score: 3 },
          { question: 'Relative price of substitutes', score: 3 },
          { question: 'Performance of substitutes', score: 2 },
          { question: 'Customer propensity to substitute', score: 4 },
          { question: 'Switching costs to substitutes', score: 2 }
        ],
        keyFactors: [
          { name: 'Technology Disruption', description: 'New technologies creating alternative solutions', impact: 'High' },
          { name: 'Performance Gap', description: 'Substitutes may offer different performance characteristics', impact: 'Medium' },
          { name: 'Cost Advantage', description: 'Substitutes often compete on cost', impact: 'High' },
          { name: 'Customer Habits', description: 'Established customer behaviors resist substitution', impact: 'Medium' }
        ],
        aiInsights: null
      },
      {
        id: 'threat-new-entry',
        name: 'Threat of New Entry',
        description: 'Ease with which new competitors can enter the market',
        score: 2,
        comments: '',
        criteria: [
          { question: 'Capital requirements for entry', score: 2 },
          { question: 'Economies of scale importance', score: 3 },
          { question: 'Brand loyalty and customer switching costs', score: 2 },
          { question: 'Access to distribution channels', score: 2 },
          { question: 'Regulatory barriers', score: 1 }
        ],
        keyFactors: [
          { name: 'Capital Requirements', description: 'Moderate capital needed to enter the market', impact: 'Medium' },
          { name: 'Regulatory Barriers', description: 'Limited regulatory restrictions on new entrants', impact: 'Low' },
          { name: 'Brand Recognition', description: 'Established brands have customer loyalty advantage', impact: 'Medium' },
          { name: 'Distribution Access', description: 'Multiple channels available for market access', impact: 'Low' }
        ],
        aiInsights: null
      }
    ];

    setForces(initialForces);
  }, []);

  // Mock data for collaboration
  // const [collaborators] = useState([
  //   { id: 1, name: 'John Doe', email: 'john@startup.com', role: 'owner' },
  //   { id: 2, name: 'Sarah Johnson', email: 'sarah@startup.com', role: 'editor' },
  //   { id: 3, name: 'Mike Chen', email: 'mike@startup.com', role: 'viewer' }
  // ]);

  // const [comments] = useState([
  //   {
  //     id: 1,
  //     author: 'Sarah Johnson',
  //     content: 'I think we should consider the impact of emerging AI tools on competitive rivalry. They might lower barriers to entry for new competitors.',
  //     timestamp: new Date(Date.now() - 3600000),
  //     replies: [
  //       {
  //         id: 11,
  //         author: 'John Doe',
  //         content: 'Good point! I\'ll update the analysis to reflect this trend.',
  //         timestamp: new Date(Date.now() - 1800000)
  //       }
  //     ]
  //   },
  //   {
  //     id: 2,
  //     author: 'Mike Chen',
  //     content: 'The supplier power analysis looks comprehensive. Have we considered the recent consolidation in our key supplier market?',
  //     timestamp: new Date(Date.now() - 7200000),
  //     replies: []
  //   }
  // ]);

  const calculateOverallScore = () => {
    if (forces?.length === 0) return 0;
    const totalScore = forces?.reduce((sum, force) => sum + force?.score, 0);
    return totalScore / forces?.length;
  };

  const getCompletedForces = () => {
    return (forces || []).filter((force) => {
      const item = force?.aiInsights;
      const analysis = typeof item?.analysis === 'string' ? item.analysis.trim() : '';
      const recsOk = Array.isArray(item?.recommendations);
      const trendsOk = Array.isArray(item?.trends);
      return Boolean(analysis) && recsOk && trendsOk;
    }).length;
  };

  const handleForceToggle = (forceId) => {
    setExpandedForce(expandedForce === forceId ? null : forceId);
  };

  const handleScoreChange = (forceId, newScore) => {
    setForces(forces?.map(force => 
      force?.id === forceId ? { ...force, score: newScore } : force
    ));
  };

  const handleFactorChange = (forceId, criterionIndex, field, value) => {
    setForces(forces?.map(force => {
      if (force?.id === forceId) {
        const updatedCriteria = [...force?.criteria];
        updatedCriteria[criterionIndex] = { ...updatedCriteria?.[criterionIndex], [field]: value };
        return { ...force, criteria: updatedCriteria };
      }
      return force;
    }));
  };

  const handleCommentChange = (forceId, comment) => {
    setForces(forces?.map(force => 
      force?.id === forceId ? { ...force, comments: comment } : force
    ));
  };

  const handleSave = async (analysisName) => {
    const trimmedName = typeof analysisName === 'string' ? analysisName.trim() : '';
    if (!trimmedName) {
      setAiError('Please give your analysis a name before saving.');
      return false;
    }

    if (!backendAvailable) {
      setAiError('Backend is unavailable. Please start the backend to save.');
      return false;
    }

    if (!aiIndustryAnalysis) {
      setAiError('Generate (and review) the AI Industry Analysis first, then save.');
      return false;
    }

    setIsSaving(true);
    try {
      const createdByName = user?.fullname || '';

      // IMPORTANT: Industry analysis records should not persist per-force AI insights.
      // Those are stored separately under subtype=force_insights.
      const forcesWithoutAiInsights = (forces || []).map((f) => ({
        ...f,
        aiInsights: null,
      }));

      const payload = {
        type: 'porter',
        title: trimmedName,
        input: {
          subtype: 'industry_analysis',
          createdByName,
          industry: selectedIndustry,
          forces: forcesWithoutAiInsights,
          overallScore: calculateOverallScore(),
        },
        output: {
          aiIndustryAnalysis: aiIndustryAnalysis || null,
        },
        upsert: true,
      };

      const res = await saveAnalysisRecord(payload);
      setAiSavedId(res?.savedId || null);
      setHasSavedIndustryAnalysis(true);
      setIndustryAnalysisTitle(trimmedName);
      return true;
    } catch (error) {
      setAiError(error?.response?.data?.error || error?.message || 'Failed to save analysis.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = (format) => {
    try {
      if (format === 'pdf') {
        if (!backendAvailable) {
          setAiError('Backend is unavailable. Please start the backend to export.');
          return;
        }
        if (!aiSavedId) {
          setAiError('Please load or save an analysis before exporting.');
          return;
        }

        const createdByName = analysisCreatedByName || user?.fullname || '';
        const safeFilePart = String(industryAnalysisTitle || selectedIndustry || 'analysis')
          .trim()
          .replace(/[^a-z0-9\-\s_]/gi, '')
          .replace(/\s+/g, '_')
          .slice(0, 60);
        const filename = `Porters_Five_Forces_${safeFilePart}.pdf`;
        exportPortersFiveForcesAsPDF(
          {
            analysisTitle: industryAnalysisTitle,
            industry: selectedIndustry,
            forces,
            overallScore: calculateOverallScore(),
            aiIndustryAnalysis,
            createdBy: createdByName,
          },
          filename
        );
        return;
      }

      if (format === 'json') {
        const data = {
          industry: selectedIndustry,
          overallScore: calculateOverallScore(),
          forces,
          aiIndustryAnalysis,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Porters_Five_Forces_${selectedIndustry || 'analysis'}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }

      setAiError(`Export format not implemented: ${format}`);
    } catch (error) {
      setAiError(error?.message || 'Failed to export PDF.');
    }
  };

  const handleShare = (shareData) => {
    console.log('Sharing analysis:', shareData);
    // Implement share logic
  };

  const handleLoadTemplate = (templateId) => {
    console.log('Loading template:', templateId);
    // Implement template loading logic
  };

  const handleIndustryChange = (industry) => {
    if (forceInsightsSaveTimerRef.current) {
      clearTimeout(forceInsightsSaveTimerRef.current);
      forceInsightsSaveTimerRef.current = null;
    }
    setSelectedIndustry(industry);
    setExpandedForce(null);
    setAiIndustryAnalysis(null);
    setAiSavedId(null);
    setIndustryAnalysisTitle('');
    setAnalysisCreatedByName('');
    setRefreshingForceId(null);
    setForceInsightsErrorById({});
    setAiError('');
    setHasSavedIndustryAnalysis(false);
    setBackendAvailable(true);
    setForces((prev) => {
      const next = applyIndustryDefaultsToForces(prev, industry);
      return next;
    });
  };

  useEffect(() => {
    const userId = user?._id || user?.id || '';
    if (!selectedIndustry) {
      setHasSavedIndustryAnalysis(false);
      setBackendAvailable(true);
      return;
    }

    const key = `${userId || 'anon'}|${selectedIndustry}`;
    if (savedIndustryCheckKeyRef.current === key) return;
    savedIndustryCheckKeyRef.current = key;

    (async () => {
      setIsCheckingSaved(true);
      try {
        const res = await loadLatestAnalysisBySubtype({
          type: 'porter',
          industry: selectedIndustry,
          subtype: 'industry_analysis',
        });
        const analysis = res?.analysis;
        setBackendAvailable(true);
        setHasSavedIndustryAnalysis(Boolean(analysis));
      } catch (error) {
        const status = error?.response?.status;
        if (status === 404) {
          setBackendAvailable(true);
          setHasSavedIndustryAnalysis(false);
        } else if (status === 401) {
          // Backend reachable; user may not be logged in.
          setBackendAvailable(true);
          setHasSavedIndustryAnalysis(false);
        } else {
          // Network/500/etc.
          setBackendAvailable(false);
          setHasSavedIndustryAnalysis(false);
        }
      } finally {
        setIsCheckingSaved(false);
      }
    })();
  }, [selectedIndustry, user?._id, user?.id]);

  const applyForceInsightsToForces = (forceInsightsMap) => {
    setForces((prev) =>
      (prev || []).map((f) => {
        const id = f?.id;
        const hasKey = Boolean(id) && Object.prototype.hasOwnProperty.call(forceInsightsMap || {}, id);
        return {
          ...f,
          aiInsights: hasKey ? forceInsightsMap?.[id] || null : f?.aiInsights || null,
        };
      })
    );
  };

  const isValidForceInsightsItem = (item) => {
    const analysis = typeof item?.analysis === 'string' ? item.analysis.trim() : '';
    const recsOk = Array.isArray(item?.recommendations);
    const trendsOk = Array.isArray(item?.trends);
    return Boolean(analysis) && recsOk && trendsOk;
  };

  const isValidForceInsightsMap = (map, expectedIds, options = {}) => {
    if (!map || typeof map !== 'object') return false;

    const ids = Array.isArray(expectedIds) ? expectedIds.filter(Boolean) : [];
    const requireAll = Boolean(options?.requireAll);

    if (requireAll && ids.length > 0) {
      return ids.every((id) => isValidForceInsightsItem(map?.[id]));
    }

    // Partial maps are allowed (e.g. single-force refresh). Require at least one valid entry.
    const keysToCheck = ids.length > 0 ? ids : Object.keys(map);
    return keysToCheck.some((id) => isValidForceInsightsItem(map?.[id]));
  };

  const normalizeForceKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const coerceForceInsightsMap = (map, expectedIds) => {
    if (!map || typeof map !== 'object') return map;
    const keys = Object.keys(map);
    if (keys.length === 0) return map;

    const normalizedKeyToOriginal = keys.reduce((acc, k) => {
      acc[normalizeForceKey(k)] = k;
      return acc;
    }, {});

    const coerced = {};
    for (const expectedId of expectedIds || []) {
      const direct = map?.[expectedId];
      if (direct) {
        coerced[expectedId] = direct;
        continue;
      }
      const match = normalizedKeyToOriginal[normalizeForceKey(expectedId)];
      if (match && map?.[match]) {
        coerced[expectedId] = map[match];
      }
    }

    // If we couldn't map anything, return original
    return Object.keys(coerced).length > 0 ? coerced : map;
  };

  const scheduleForceInsightsUpsert = ({ industry, forcesSnapshot, forceInsightsMap }) => {
    if (forceInsightsSaveTimerRef.current) {
      clearTimeout(forceInsightsSaveTimerRef.current);
      forceInsightsSaveTimerRef.current = null;
    }

    const expectedIds = (forcesSnapshot || []).map((f) => f?.id).filter(Boolean);
    if (!isValidForceInsightsMap(forceInsightsMap, expectedIds, { requireAll: false })) return;

    forceInsightsSaveTimerRef.current = setTimeout(async () => {
      try {
        // Ensure we save only for the currently selected industry
        if (selectedIndustry !== industry) return;
        await saveAnalysisRecord({
          type: 'porter',
          title: `Porter Force AI Insights - ${industry}`,
          input: {
            subtype: 'force_insights',
            industry,
            forcesSnapshot,
          },
          output: {
            forceInsights: forceInsightsMap,
          },
          upsert: true,
        });
      } catch (e) {
        // Non-blocking: insights still shown in UI
        console.warn('Failed to auto-save force insights:', e);
      }
    }, 1000);
  };

  const buildForceInsightsMapFromForces = (forcesList) => {
    const map = {};
    for (const f of forcesList || []) {
      if (!f?.id) continue;
      if (isValidForceInsightsItem(f?.aiInsights)) {
        map[f.id] = f.aiInsights;
      }
    }
    return map;
  };

  const refreshSingleForceInsights = async (forceId) => {
    const id = String(forceId || '');
    if (!id) return;
    if (!selectedIndustry) {
      setForceInsightsErrorById((prev) => ({ ...prev, [id]: 'Please select an industry first.' }));
      return;
    }

    const force = (forces || []).find((f) => f?.id === id);
    if (!force) return;

    setRefreshingForceId(id);
    setForceInsightsErrorById((prev) => ({ ...prev, [id]: '' }));

    try {
      let gen;
      try {
        gen = await generatePorterForceInsights({
          industry: selectedIndustry,
          forces: [force],
          save: false,
        });
      } catch (backendGenError) {
        gen = await generatePorterForceInsightsClient({ industry: selectedIndustry, forces: [force] });
      }

      const map = gen?.result?.forceInsights;
      const coercedMap = coerceForceInsightsMap(map, [id]);
      if (!isValidForceInsightsMap(coercedMap, [id], { requireAll: true })) {
        setForceInsightsErrorById((prev) => ({
          ...prev,
          [id]: 'AI returned invalid/empty insights for this force. Please try Generate again.',
        }));
        return;
      }

      // Update only this force in UI (merge-safe)
      applyForceInsightsToForces(coercedMap);

      // Persist: merge with any existing saved insights, so we don't overwrite other forces.
      const mergedMap = {
        ...buildForceInsightsMapFromForces(forces),
        ...coercedMap,
      };

      scheduleForceInsightsUpsert({
        industry: selectedIndustry,
        forcesSnapshot: forces,
        forceInsightsMap: mergedMap,
      });
    } catch (error) {
      const status = error?.response?.status;
      const message =
        status === 401
          ? 'Please log in to generate AI insights.'
          : error?.response?.data?.error || error?.message || 'Failed to generate AI insights.';
      setForceInsightsErrorById((prev) => ({ ...prev, [id]: message }));
    } finally {
      setRefreshingForceId(null);
    }
  };

  const deleteSingleForceInsight = async (forceId) => {
    const id = String(forceId || '');
    if (!id) return;
    if (!selectedIndustry) {
      setForceInsightsErrorById((prev) => ({ ...prev, [id]: 'Please select an industry first.' }));
      return;
    }

    const force = (forces || []).find((f) => f?.id === id);
    if (!force) return;
    if (!force?.aiInsights) return;

    const ok = window.confirm('Delete AI Insights for this force? This cannot be undone.');
    if (!ok) return;

    setDeletingForceId(id);
    setForceInsightsErrorById((prev) => ({ ...prev, [id]: '' }));

    // Clear UI immediately
    setForces((prev) => (prev || []).map((f) => (f?.id === id ? { ...f, aiInsights: null } : f)));

    try {
      const currentMap = buildForceInsightsMapFromForces(forces);
      delete currentMap[id];

      if (Object.keys(currentMap).length === 0) {
        // Allow clearing the saved doc to an empty map.
        await saveAnalysisRecord({
          type: 'porter',
          title: `Porter Force AI Insights - ${selectedIndustry}`,
          input: {
            subtype: 'force_insights',
            industry: selectedIndustry,
            forcesSnapshot: forces,
          },
          output: {
            forceInsights: {},
          },
          upsert: true,
        });
      } else {
        scheduleForceInsightsUpsert({
          industry: selectedIndustry,
          forcesSnapshot: forces,
          forceInsightsMap: currentMap,
        });
      }
    } catch (error) {
      const status = error?.response?.status;
      const message =
        status === 401
          ? 'Please log in to delete AI insights.'
          : error?.response?.data?.error || error?.message || 'Failed to delete AI insights.';
      setForceInsightsErrorById((prev) => ({ ...prev, [id]: message }));

      // Revert UI if persistence failed
      setForces((prev) => (prev || []).map((f) => (f?.id === id ? { ...f, aiInsights: force.aiInsights } : f)));
    } finally {
      setDeletingForceId(null);
    }
  };

  useEffect(() => {
    const userId = user?._id || user?.id || '';
    if (!selectedIndustry) return;
    if (!Array.isArray(forces) || forces.length === 0) return;

    const key = `${userId || 'anon'}|${selectedIndustry}`;
    if (savedForceInsightsLoadedKeyRef.current === key) return;
    savedForceInsightsLoadedKeyRef.current = key;

    (async () => {
      try {
        const res = await loadLatestPorterForceInsights({ industry: selectedIndustry });
        const analysis = res?.analysis;
        const savedMap = analysis?.output?.forceInsights;
        if (!savedMap || typeof savedMap !== 'object') return;

        const expectedIds = (forces || []).map((f) => f?.id).filter(Boolean);
        const coerced = coerceForceInsightsMap(savedMap, expectedIds);

        // Allow partial maps: apply whatever exists.
        if (isValidForceInsightsMap(coerced, expectedIds, { requireAll: false })) {
          applyForceInsightsToForces(coerced);
        }
      } catch (error) {
        // Silent by design: if not logged in / no saved insights, we just show nothing.
      }
    })();
  }, [selectedIndustry, user?._id, user?.id, forces?.length]);

  useEffect(() => {
    return () => {
      if (forceInsightsSaveTimerRef.current) {
        clearTimeout(forceInsightsSaveTimerRef.current);
        forceInsightsSaveTimerRef.current = null;
      }
    };
  }, []);

  // const handleTemplateLoad = (templateId) => {
  //   console.log('Loading template:', templateId);
  //   // Implement template loading
  // };

  // const handleAddCollaborator = (email) => {
  //   console.log('Adding collaborator:', email);
  //   // Implement add collaborator logic
  // };

  // const handleRemoveCollaborator = (collaboratorId) => {
  //   console.log('Removing collaborator:', collaboratorId);
  //   // Implement remove collaborator logic
  // };

  // const handleAddComment = (comment) => {
  //   console.log('Adding comment:', comment);
  //   // Implement add comment logic
  // };

  const handleGenerateAiIndustryAnalysis = async () => {
    if (!selectedIndustry) {
      setAiError('Please select an industry first.');
      return;
    }

    if (getCompletedForces() < 5) {
      setAiError('Generate AI insights for all 5 forces first.');
      return;
    }

    setIsGeneratingAi(true);
    setAiError('');

    try {
      const forcesPayload = (forces || []).map((f) => ({
        id: f?.id,
        name: f?.name,
        score: typeof f?.score === 'number' ? f.score : Number(f?.score) || 0,
        comments:
          (f?.comments && String(f.comments).trim()) ||
          `Criteria scores: ${(f?.criteria || [])
            .map((c) => `${c?.question || 'Criterion'}=${c?.score ?? '?'}`)
            .join(', ')}`,
      }));

      const prompt = [
        'You are an expert strategy consultant.',
        `Industry: ${selectedIndustry}.`,
        'The user selected 1-5 scores for each of Porter\'s Five Forces (1 = weak pressure, 5 = very strong pressure).',
        'Generate an industry-level assessment based primarily on the five scores and explain what they imply.',
        'Return JSON exactly matching the required schema.',
      ].join('\n');

      const result = await generatePortersForcesInsights(forcesPayload, prompt);
      setAiIndustryAnalysis(result);
      setAiSavedId(null);
      setAnalysisCreatedByName(user?.fullname || '');
    } catch (error) {
      setAiError(error?.message || 'Failed to generate AI analysis.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleLoadSavedAnalysis = async () => {
    if (!selectedIndustry) {
      setAiError('Please select an industry first.');
      return;
    }

    if (!backendAvailable) {
      setAiError('Backend is unavailable. Please start the backend to load saved analyses.');
      return;
    }

    if (!hasSavedIndustryAnalysis) {
      setAiError('No saved analysis found for this industry.');
      return;
    }

    setIsLoadingSaved(true);
    setAiError('');

    try {
      const res = await loadLatestAnalysisBySubtype({
        type: 'porter',
        industry: selectedIndustry,
        subtype: 'industry_analysis',
      });
      const analysis = res?.analysis;
      if (!analysis) {
        setAiError('No saved analysis found for this industry.');
        return;
      }

      const savedForces = analysis?.input?.forces;
      const savedIndustry = analysis?.input?.industry;
      const savedAi = analysis?.output?.aiIndustryAnalysis;
      const savedCreatedByName = analysis?.input?.createdByName;
      const savedTitle = analysis?.title;

      if (savedIndustry && savedIndustry !== selectedIndustry) {
        setSelectedIndustry(savedIndustry);
      }
      if (Array.isArray(savedForces) && savedForces.length > 0) {
        // Load ONLY the AI Industry Analysis + force inputs (scores/criteria/notes),
        // but preserve any currently-loaded per-force AI insights in the UI.
        // Per-force AI insights are stored/loaded separately under subtype=force_insights.
        setForces((prev) => {
          const prevById = (prev || []).reduce((acc, f) => {
            if (f?.id) acc[f.id] = f;
            return acc;
          }, {});

          return (savedForces || []).map((f) => {
            const existing = prevById?.[f?.id];
            return {
              ...f,
              aiInsights: existing?.aiInsights || null,
            };
          });
        });
      }
      setAiIndustryAnalysis(savedAi || null);
      setAiSavedId(analysis?._id || null);
      setAnalysisCreatedByName(savedCreatedByName || user?.fullname || '');
      setIndustryAnalysisTitle(typeof savedTitle === 'string' ? savedTitle : '');
      setExpandedForce(null);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        setAiError('No saved analysis found for this industry.');
      } else if (status === 401) {
        setAiError('Please log in to load your saved analyses.');
      } else {
        setAiError(error?.response?.data?.error || error?.message || 'Failed to load saved analysis.');
      }
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const overallScore = calculateOverallScore();
  const allForcesCompleted = getCompletedForces() === 5;
  const analysisData = {
    completedForces: getCompletedForces(),
    overallScore
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between">
              <div>
                <nav className="flex items-center space-x-2 text-indigo-200 text-sm mb-4">
                  <Link to="/" className="hover:text-white transition-colors">Ηome</Link>
                  <Icon name="ChevronRight" size={16} />
                  <span>Porter's Five Forces Analysis</span>
                </nav>
                <h1 className="text-4xl font-bold mb-4">Porter's Five Forces Analysis</h1>
                <p className="text-xl text-indigo-100 max-w-3xl">
                  Analyze your competitive landscape with comprehensive industry assessment and AI-powered insights to make strategic decisions.
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
                  <Icon name="Target" size={64} className="text-white/80" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Left Sidebar - Industry Selection */}
            <div className="xl:col-span-1">
              <div className="sticky top-24 space-y-6">
                <IndustrySelector
                  selectedIndustry={selectedIndustry}
                  onIndustryChange={handleIndustryChange}
                  // onTemplateLoad={handleTemplateLoad}
                />

                {selectedIndustry && (
                  <div className="bg-card rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">Saved analysis</div>
                        <div className="text-xs text-muted-foreground">
                          {!backendAvailable
                            ? 'Backend unavailable'
                            : hasSavedIndustryAnalysis
                              ? 'Load your latest saved analysis for this industry'
                              : 'No saved analysis yet for this industry'}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleLoadSavedAnalysis}
                        iconName="FolderOpen"
                        iconPosition="left"
                        loading={isLoadingSaved || isCheckingSaved}
                        disabled={!backendAvailable || !hasSavedIndustryAnalysis || isLoadingSaved || isCheckingSaved}
                      >
                        Load
                      </Button>
                    </div>
                  </div>
                )}
                
                {selectedIndustry && (
                  <ScoreVisualization
                    forces={forces}
                    overallScore={overallScore}
                  />
                )}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="xl:col-span-2">
              {!selectedIndustry ? (
                <div className="bg-card rounded-lg border border-border p-12 text-center">
                  <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon name="Building" size={32} className="text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Get Started</h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Select your industry from the sidebar to begin your Porter's Five Forces analysis with customized templates and insights.
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Icon name="CheckCircle" size={16} className="text-green-500" />
                      <span>Industry-specific templates</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Icon name="CheckCircle" size={16} className="text-green-500" />
                      <span>AI-powered insights</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Analysis Progress */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-foreground">Analysis Progress</h2>
                      <div className="text-sm text-muted-foreground">
                        {getCompletedForces()} of 5 forces completed
                      </div>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(getCompletedForces() / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Forces Analysis */}
                  <div className="space-y-4">
                    {forces?.map((force) => (
                      <ForceSection
                        key={force?.id}
                        force={force}
                        isExpanded={expandedForce === force?.id}
                        onToggle={() => handleForceToggle(force?.id)}
                        onScoreChange={handleScoreChange}
                        onFactorChange={handleFactorChange}
                        onCommentChange={handleCommentChange}
                        onRefreshInsights={refreshSingleForceInsights}
                        isRefreshingInsights={refreshingForceId === force?.id}
                        onDeleteInsights={deleteSingleForceInsight}
                        isDeletingInsights={deletingForceId === force?.id}
                        forceInsightsError={forceInsightsErrorById?.[force?.id] || ''}
                      />
                    ))}
                  </div>

                  {/* AI Industry Analysis */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground">AI Industry Analysis</h3>
                        {industryAnalysisTitle && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Analysis name: {industryAnalysisTitle}
                          </div>
                        )}
                        {/* {(analysisCreatedByName || user?.fullname) && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Created by {analysisCreatedByName || user?.fullname}
                          </div>
                        )} */}
                        <p className="text-sm text-muted-foreground">
                          Generate an overall assessment from your 1–5 force scores for {selectedIndustry}.
                        </p>
                        {aiIndustryAnalysis && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {aiSavedId
                              ? 'Saved to your analyses.'
                              : 'Generated, but not saved yet.'}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="default"
                        onClick={handleGenerateAiIndustryAnalysis}
                        iconName="Sparkles"
                        iconPosition="left"
                        loading={isGeneratingAi}
                        disabled={!allForcesCompleted || !selectedIndustry}
                      >
                        Generate
                      </Button>
                      {/* {!allForcesCompleted && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Generate unlocks after all 5 forces have AI Insights.
                        </div>
                      )} */}
                    </div>

                    {aiError && (
                      <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {aiError}
                      </div>
                    )}

                    {aiIndustryAnalysis && (
                      <div className="mt-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="rounded-lg border border-border bg-muted/30 p-4">
                            <div className="text-xs text-muted-foreground">Competitive Intensity</div>
                            <div className="mt-1 text-sm font-medium text-foreground">
                              {aiIndustryAnalysis?.overallAssessment?.competitiveIntensity}
                            </div>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/30 p-4">
                            <div className="text-xs text-muted-foreground">Market Attractiveness</div>
                            <div className="mt-1 text-sm font-medium text-foreground">
                              {aiIndustryAnalysis?.overallAssessment?.marketAttractiveness}
                            </div>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/30 p-4">
                            <div className="text-xs text-muted-foreground">Strategic Position</div>
                            <div className="mt-1 text-sm font-medium text-foreground">
                              {aiIndustryAnalysis?.overallAssessment?.strategicPosition}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-foreground mb-2">Key takeaways</div>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            {(aiIndustryAnalysis?.overallAssessment?.keyTakeaways || []).map((t, idx) => (
                              <li key={idx}>{t}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <div className="text-sm font-semibold text-foreground mb-2">Recommendations</div>
                            <div className="space-y-3">
                              {(aiIndustryAnalysis?.recommendations || []).slice(0, 4).map((rec) => (
                                <div key={rec?.id || rec?.title} className="rounded-lg border border-border p-4">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-medium text-foreground">{rec?.title}</div>
                                    <div className="text-xs text-muted-foreground">{rec?.priority}</div>
                                  </div>
                                  <div className="mt-1 text-sm text-muted-foreground">{rec?.description}</div>
                                  <div className="mt-2 text-xs text-muted-foreground">Expected impact: {rec?.expectedImpact}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div>
                              <div className="text-sm font-semibold text-foreground mb-2">Top risks</div>
                              <div className="space-y-3">
                                {(aiIndustryAnalysis?.risks || []).slice(0, 3).map((r, idx) => (
                                  <div key={`${r?.risk}-${idx}`} className="rounded-lg border border-border p-4">
                                    <div className="text-sm font-medium text-foreground">{r?.risk}</div>
                                    <div className="mt-1 text-xs text-muted-foreground">Severity: {r?.severity}</div>
                                    <div className="mt-2 text-sm text-muted-foreground">{r?.mitigation}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div className="text-sm font-semibold text-foreground mb-2">Opportunities</div>
                              <div className="space-y-3">
                                {(aiIndustryAnalysis?.opportunities || []).slice(0, 3).map((o, idx) => (
                                  <div key={`${o?.opportunity}-${idx}`} className="rounded-lg border border-border p-4">
                                    <div className="text-sm font-medium text-foreground">{o?.opportunity}</div>
                                    <div className="mt-1 text-xs text-muted-foreground">Potential: {o?.potential}</div>
                                    <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                      {(o?.actionItems || []).slice(0, 4).map((a, i) => (
                                        <li key={i}>{a}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">Ready to finalize your analysis?</h3>
                        <p className="text-sm text-muted-foreground">Save your work and generate comprehensive reports</p>
                      </div>
                      <div className="flex space-x-3">
                        <Button
                          variant="outline"
                          onClick={() => handleExport('pdf')}
                          iconName="Download"
                          iconPosition="left"
                        >
                          Export PDF
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => {
                            setAnalysisName(industryAnalysisTitle || '');
                            setShowSaveDialog(true);
                          }}
                          iconName="Save"
                          iconPosition="left"
                          loading={isSaving}
                        >
                          Save Analysis
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Save Dialog*/}
                  {showSaveDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md mx-4">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Icon name="Save" size={16} className="text-primary" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground">Save Analysis</h3>
                        </div>

                        <div className="space-y-4">
                          <Input
                            label="Analysis Name"
                            type="text"
                            placeholder="Enter a name for this analysis..."
                            value={analysisName}
                            onChange={(e) => setAnalysisName(e?.target?.value)}
                            required
                          />

                          <div className="flex space-x-3">
                            <Button
                              variant="outline"
                              onClick={() => setShowSaveDialog(false)}
                              fullWidth
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="default"
                              onClick={async () => {
                                const ok = await handleSave(analysisName);
                                if (ok) {
                                  setShowSaveDialog(false);
                                  setAnalysisName('');
                                }
                              }}
                              disabled={!analysisName?.trim() || isSaving}
                              loading={isSaving}
                              fullWidth
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Sidebar - Actions & Collaboration */}
            {/* <div className="xl:col-span-1">
              <div className="sticky top-24 space-y-6"> */}
                {/* Tab Navigation */}
                {/* <div className="bg-card rounded-lg border border-border p-1">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setActiveTab('actions')}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'actions' ?'bg-primary text-primary-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Actions
                    </button>
                    <button
                      onClick={() => setActiveTab('collaboration')}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'collaboration' ?'bg-primary text-primary-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Team
                    </button>
                  </div>
                </div> */}

                {/* Tab Content */}
                {/* {activeTab === 'actions' && (
                  <ActionPanel
                    onSave={handleSave}
                    onExport={handleExport}
                    onShare={handleShare}
                    onLoadTemplate={handleLoadTemplate}
                    analysisData={analysisData}
                    isSaving={isSaving}
                  />
                )}

                {activeTab === 'collaboration' && (
                  <CollaborationPanel
                    collaborators={collaborators}
                    comments={comments}
                    onAddCollaborator={handleAddCollaborator}
                    onAddComment={handleAddComment}
                    onRemoveCollaborator={handleRemoveCollaborator}
                  />
                )} */}
              {/* </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortersFiveForcesAnalysis;