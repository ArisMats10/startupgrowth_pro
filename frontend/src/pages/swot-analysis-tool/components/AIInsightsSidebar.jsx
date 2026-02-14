import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { generateAndSaveSwotAiForAnalysis, generateSWOTInsights, handleAnalysisError } from '../../../services/aiAnalysisService';

const AIInsightsSidebar = ({
  swotData,
  selectedTemplate,
  onApplySuggestion,
  initialAiResult,
  onAiResultUpdated,
  loadedAnalysisId,
  persistError,
}) => {
  const [insights, setInsights] = useState([]);
  const [strategicConnections, setStrategicConnections] = useState([]);
  const [blindSpots, setBlindSpots] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');
  const [error, setError] = useState(null);
  const [persistStatus, setPersistStatus] = useState('');

  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [activeConnection, setActiveConnection] = useState(null);
  const [connectionQuadrant, setConnectionQuadrant] = useState('opportunities');

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyDraft, setApplyDraft] = useState({ title: '', content: '' });
  const [applyQuadrant, setApplyQuadrant] = useState('opportunities');
  const [applyCategory, setApplyCategory] = useState('General');

  // Generate AI insights based on SWOT data
  const generateInsights = async () => {
    try {
      const hasData = Object.values(swotData)?.some(arr => arr?.length > 0);
      if (!hasData) {
        setInsights([]);
        setStrategicConnections([]);
        setBlindSpots([]);
        setError(null);
        return;
      }

      setIsAnalyzing(true);
      setError(null);
      setPersistStatus('');

      // If an analysis is loaded, generate+save in the backend so it's tied to that specific SWOT analysis.
      if (loadedAnalysisId) {
        const saved = await generateAndSaveSwotAiForAnalysis({
          id: loadedAnalysisId,
          swotData,
          prompt: selectedTemplate,
        });
        const swotAi = saved?.swotAi || null;
        const next = {
          insights: Array.isArray(swotAi?.insights) ? swotAi.insights : [],
          connections: Array.isArray(swotAi?.connections) ? swotAi.connections : [],
          blindSpots: Array.isArray(swotAi?.blindSpots) ? swotAi.blindSpots : [],
        };
        setInsights(next.insights);
        setStrategicConnections(next.connections);
        setBlindSpots(next.blindSpots);

        if (typeof onAiResultUpdated === 'function') {
          await onAiResultUpdated(next, { alreadyPersisted: true });
        }
        setPersistStatus('Saved to this analysis.');
        return;
      }

      const result = await generateSWOTInsights(swotData, selectedTemplate);
      
      setInsights(result?.insights || []);
      setStrategicConnections(result?.connections || []);
      setBlindSpots(result?.blindSpots || []);

      if (typeof onAiResultUpdated === 'function') {
        // For non-loaded analyses, we can only keep it in memory.
        await onAiResultUpdated({
          insights: result?.insights || [],
          connections: result?.connections || [],
          blindSpots: result?.blindSpots || [],
        });
        setPersistStatus('Not saved (load an analysis first).');
      }
      
    } catch (error) {
      const fallbackResponse = handleAnalysisError(error, 'SWOT');
      setError(fallbackResponse?.message);
      
      // Provide some basic fallback insights
      setInsights([
        {
          id: '1',
          type: 'suggestion',
          category: 'strengths',
          title: 'Leverage Core Strengths',
          content: 'Focus on maximizing your key strengths to gain competitive advantage.',
          confidence: 75,
          priority: 'high'
        }
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Load persisted AI results when a saved SWOT analysis is loaded
  useEffect(() => {
    if (!initialAiResult || typeof initialAiResult !== 'object') return;
    setInsights(Array.isArray(initialAiResult?.insights) ? initialAiResult.insights : []);
    setStrategicConnections(Array.isArray(initialAiResult?.connections) ? initialAiResult.connections : []);
    setBlindSpots(Array.isArray(initialAiResult?.blindSpots) ? initialAiResult.blindSpots : []);
    setError(null);
  }, [initialAiResult]);

  useEffect(() => {
    const hasSwotData = Object.values(swotData)?.some(arr => arr?.length > 0);
    const hasAiData =
      (Array.isArray(insights) && insights.length > 0) ||
      (Array.isArray(strategicConnections) && strategicConnections.length > 0) ||
      (Array.isArray(blindSpots) && blindSpots.length > 0);

    // Don't wipe persisted AI results just because the SWOT matrix is empty.
    // Users expect the last AI analysis to remain visible after loading an analysis.
    if (!hasSwotData && !hasAiData) {
      setInsights([]);
      setStrategicConnections([]);
      setBlindSpots([]);
      setError(null);
    }
  }, [swotData]);

  const getInsightIcon = (type) => {
    switch (type) {
      case 'suggestion': return 'Lightbulb';
      case 'warning': return 'AlertTriangle';
      case 'opportunity': return 'Target';
      case 'improvement': return 'TrendingUp';
      default: return 'Info';
    }
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'suggestion': return 'text-primary';
      case 'warning': return 'text-warning';
      case 'opportunity': return 'text-success';
      case 'improvement': return 'text-accent';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-error text-error-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getQuadrantMeta = (value) => {
    const key = normalizeQuadrantKey(value);
    if (!key) return null;

    switch (key) {
      case 'strengths':
        return { key, label: 'Strengths', icon: 'TrendingUp', className: 'bg-success/10 text-success' };
      case 'weaknesses':
        return { key, label: 'Weaknesses', icon: 'TrendingDown', className: 'bg-warning/10 text-warning' };
      case 'opportunities':
        return { key, label: 'Opportunities', icon: 'Target', className: 'bg-primary/10 text-primary' };
      case 'threats':
        return { key, label: 'Threats', icon: 'AlertTriangle', className: 'bg-error/10 text-error' };
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'suggestions', label: 'AI Insights', icon: 'Brain' },
    { id: 'connections', label: 'Connections', icon: 'Network' },
    { id: 'blindspots', label: 'Blind Spots', icon: 'Eye' }
  ];

  const quadrantOptions = [
    { value: 'strengths', label: 'Strengths' },
    { value: 'weaknesses', label: 'Weaknesses' },
    { value: 'opportunities', label: 'Opportunities' },
    { value: 'threats', label: 'Threats' },
  ];

  const normalizeQuadrantKey = (value) => {
    if (typeof value !== 'string') return null;
    const v = value.trim().toLowerCase();
    if (!v) return null;
    if (v === 'strength' || v === 'strengths') return 'strengths';
    if (v === 'weakness' || v === 'weaknesses') return 'weaknesses';
    if (v === 'opportunity' || v === 'opportunities') return 'opportunities';
    if (v === 'threat' || v === 'threats') return 'threats';

    // Common AI-ish synonyms
    if (v === 'risk' || v === 'risks') return 'threats';
    if (v === 'challenge' || v === 'challenges') return 'threats';
    if (v === 'improvement' || v === 'improvements') return 'weaknesses';
    if (v === 'advantage' || v === 'advantages') return 'strengths';
    if (v === 'growth') return 'opportunities';

    return null;
  };

  const openApplyModal = ({ title = '', content = '', defaultQuadrant = 'opportunities', defaultCategory = 'General' }) => {
    setApplyDraft({ title, content });
    setApplyQuadrant(defaultQuadrant);
    setApplyCategory((typeof defaultCategory === 'string' ? defaultCategory : '').trim() || 'General');
    setIsApplyModalOpen(true);
  };

  const closeApplyModal = () => {
    setIsApplyModalOpen(false);
    setApplyDraft({ title: '', content: '' });
    setApplyQuadrant('opportunities');
    setApplyCategory('General');
  };

  const applyDraftToSwot = () => {
    const q = normalizeQuadrantKey(applyQuadrant) || 'opportunities';
    const content = (applyDraft?.content || applyDraft?.title || '').toString().trim();
    if (!content) return;
    onApplySuggestion?.({ category: q, quadrant: q, content, title: applyDraft?.title || '', itemCategory: applyCategory });
    closeApplyModal();
  };

  const handleApplyFromInsight = (insight) => {
    const q = normalizeQuadrantKey(insight?.category || insight?.quadrant);
    const title = insight?.title || '';
    const content = (insight?.content || insight?.suggestion || insight?.text || insight?.area || title || '').toString().trim();

    if (q && content) {
      onApplySuggestion?.({ category: q, quadrant: q, content, title, itemCategory: 'General' });
      return;
    }

    openApplyModal({
      title,
      content,
      defaultQuadrant: q || 'opportunities',
      defaultCategory: 'General',
    });
  };

  const handleApplyFromBlindSpot = (blindSpot) => {
    const q = normalizeQuadrantKey(blindSpot?.category || blindSpot?.quadrant);
    const title = blindSpot?.area || '';
    const content = (blindSpot?.suggestion || blindSpot?.content || blindSpot?.text || blindSpot?.area || '').toString().trim();

    if (q && content) {
      onApplySuggestion?.({ category: q, quadrant: q, content, title, itemCategory: 'General' });
      return;
    }

    openApplyModal({
      title,
      content,
      defaultQuadrant: q || 'threats',
      defaultCategory: 'General',
    });
  };

  const openConnectionModal = (connection) => {
    setActiveConnection(connection);
    setConnectionQuadrant('opportunities');
    setIsConnectionModalOpen(true);
  };

  const closeConnectionModal = () => {
    setIsConnectionModalOpen(false);
    setActiveConnection(null);
  };

  const applyConnectionToSwot = () => {
    if (!activeConnection) return;
    const connectionText = activeConnection?.connection || '';
    const descriptionText = activeConnection?.description || '';
    const impactText = activeConnection?.impact ? `Impact: ${activeConnection.impact}` : '';

    const content = [connectionText, descriptionText, impactText].filter(Boolean).join(' — ');
    if (!content?.trim()) return;

    onApplySuggestion?.({
      category: connectionQuadrant,
      quadrant: connectionQuadrant,
      content,
      title: connectionText,
      itemCategory: 'General',
    });

    closeConnectionModal();
  };

  return (
    <div className="bg-card border border-border rounded-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center">
            <Icon name="Sparkles" size={20} className="mr-2 text-primary" />
            AI Analysis Engine
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={generateInsights}
            disabled={isAnalyzing}
            loading={isAnalyzing}
          >
            <Icon name="RefreshCw" size={14} className="mr-1" />
            Analyze
          </Button>
        </div>

        {persistError ? (
          <div className="text-xs text-error mb-2">{persistError}</div>
        ) : persistStatus ? (
          <div className="text-xs text-muted-foreground mb-2">{persistStatus}</div>
        ) : null}

        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          {tabs?.map((tab) => (
            <button
              key={tab?.id}
              onClick={() => setActiveTab(tab?.id)}
              className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-md text-xs font-medium transition-smooth ${
                activeTab === tab?.id
                  ? 'bg-card text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name={tab?.icon} size={12} />
              <span>{tab?.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4">
            <div className="bg-error/10 border border-error/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Icon name="AlertCircle" size={16} className="text-error flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-error font-medium mb-1">AI Analysis Unavailable</p>
                  <p className="text-sm text-error/80">{error}</p>
                  {error?.includes('API key') && (
                    <div className="mt-2">
                      <a 
                        href="https://platform.openai.com/api-keys" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Get your OpenAI API Key →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="p-4 space-y-4">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-muted-foreground">Analyzing your SWOT data...</p>
                <p className="text-xs text-muted-foreground mt-2">Powered by OpenAI GPT-5</p>
              </div>
            ) : insights?.length > 0 ? (
              insights?.map((insight) => (
                <div key={insight?.id} className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon 
                        name={getInsightIcon(insight?.type)} 
                        size={16} 
                        className={getInsightColor(insight?.type)} 
                      />
                      <h4 className="font-medium text-sm text-foreground">{insight?.title}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getQuadrantMeta(insight?.category) ? (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center space-x-1 ${getQuadrantMeta(insight?.category)?.className}`}
                          title="SWOT Quadrant"
                        >
                          <Icon name={getQuadrantMeta(insight?.category)?.icon} size={12} />
                          <span>{getQuadrantMeta(insight?.category)?.label}</span>
                        </span>
                      ) : null}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(insight?.priority)}`}>
                        {insight?.priority}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight?.content}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">AI Confidence:</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${insight?.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-foreground">{insight?.confidence}%</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApplyFromInsight(insight)}
                      className="text-xs"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Icon name="Brain" size={32} className="text-muted-foreground mb-3 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Add items to your SWOT matrix to get AI-powered insights
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="p-4 space-y-4">
            <div className="text-center mb-4">
              <h4 className="font-medium text-foreground mb-1">Strategic Connections</h4>
              <p className="text-xs text-muted-foreground">
                AI-identified relationships between your SWOT elements
              </p>
            </div>
            
            {strategicConnections?.length > 0 ? (
              strategicConnections?.map((connection) => (
                <div key={connection?.id} className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon name="ArrowRight" size={14} className="text-primary" />
                    <span className="text-sm font-medium text-foreground">{connection?.connection}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{connection?.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-accent font-medium">{connection?.impact}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => openConnectionModal(connection)}
                    >
                      <Icon name="ExternalLink" size={12} className="mr-1" />
                      Explore
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Icon name="Network" size={32} className="text-muted-foreground mb-3 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Strategic connections will appear after AI analysis
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'blindspots' && (
          <div className="p-4 space-y-4">
            <div className="text-center mb-4">
              <h4 className="font-medium text-foreground mb-1">Potential Blind Spots</h4>
              <p className="text-xs text-muted-foreground">
                AI-suggested areas you might want to consider
              </p>
            </div>
            
            {blindSpots?.length > 0 ? (
              blindSpots?.map((blindSpot) => (
                <div key={blindSpot?.id} className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium text-sm text-foreground">{blindSpot?.area}</h5>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      {blindSpot?.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{blindSpot?.suggestion}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyFromBlindSpot(blindSpot)}
                    className="w-full text-xs"
                  >
                    <Icon name="Plus" size={12} className="mr-1" />
                    Add to Analysis
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Icon name="Eye" size={32} className="text-muted-foreground mb-3 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Blind spot analysis will appear after AI insights generation
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connection Explore Modal */}
      {isConnectionModalOpen && activeConnection ? (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-soft z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-modal max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon name="Network" size={24} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">Explore Connection</h3>
                    <p className="text-sm text-muted-foreground">Turn this insight into an item in your SWOT matrix</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={closeConnectionModal}>
                  <Icon name="X" size={20} />
                </Button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Icon name="ArrowRight" size={16} className="text-primary mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">{activeConnection?.connection}</div>
                    {activeConnection?.description ? (
                      <div className="text-sm text-muted-foreground mt-1">{activeConnection.description}</div>
                    ) : null}
                    {activeConnection?.impact ? (
                      <div className="text-xs text-accent font-medium mt-2">Impact: {activeConnection.impact}</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <Select
                label="Add to Quadrant"
                description="Choose where to add this connection in your SWOT matrix"
                options={quadrantOptions}
                value={connectionQuadrant}
                onChange={setConnectionQuadrant}
              />
            </div>

            <div className="p-6 border-t border-border flex items-center justify-end space-x-3">
              <Button variant="outline" onClick={closeConnectionModal}>Cancel</Button>
              <Button variant="default" onClick={applyConnectionToSwot}>
                <Icon name="Plus" size={16} className="mr-2" />
                Add to Analysis
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Apply To SWOT Modal (fallback when AI doesn't provide a valid quadrant/content) */}
      {isApplyModalOpen ? (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-soft z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-modal max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon name="Plus" size={24} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">Add to SWOT Analysis</h3>
                    <p className="text-sm text-muted-foreground">Choose a quadrant for this AI suggestion</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={closeApplyModal}>
                  <Icon name="X" size={20} />
                </Button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              {applyDraft?.title ? (
                <div className="font-medium text-foreground">{applyDraft.title}</div>
              ) : null}

              {applyDraft?.content ? (
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  {applyDraft.content}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No content provided by AI for this suggestion.</div>
              )}

              <Select
                label="Quadrant"
                description="Pick where this should be added"
                options={quadrantOptions}
                value={applyQuadrant}
                onChange={setApplyQuadrant}
              />

              <Input
                type="text"
                label="Category"
                placeholder="e.g., Technology, Finance"
                value={applyCategory}
                onChange={(e) => setApplyCategory(e?.target?.value)}
              />
            </div>

            <div className="p-6 border-t border-border flex items-center justify-end space-x-3">
              <Button variant="outline" onClick={closeApplyModal}>Cancel</Button>
              <Button variant="default" onClick={applyDraftToSwot} disabled={!(applyDraft?.content || applyDraft?.title)}>
                <Icon name="Plus" size={16} className="mr-2" />
                Add to Analysis
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* AI Attribution Footer */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
          <Icon name="Sparkles" size={12} />
          <span>Powered by OpenAI GPT-5</span>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsSidebar;