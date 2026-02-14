import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ForceSection = ({
  force,
  isExpanded,
  onToggle,
  onScoreChange,
  onFactorChange,
  onCommentChange,
  onRefreshInsights,
  onDeleteInsights,
  isRefreshingInsights = false,
  isDeletingInsights = false,
  forceInsightsError = '',
}) => {
  const [aiInsights, setAiInsights] = useState(force?.aiInsights || null);
  const [insightsError, setInsightsError] = useState(null);

  useEffect(() => {
    setAiInsights(force?.aiInsights || null);
  }, [force?.aiInsights]);

  const generateForceInsights = async () => {
    setInsightsError(null);
    try {
      if (typeof onRefreshInsights === 'function') {
        await onRefreshInsights(force?.id);
      }
    } catch (e) {
      setInsightsError(e?.message || 'Failed to generate AI insights.');
    }
  };

  const deleteForceInsights = async () => {
    setInsightsError(null);
    try {
      if (typeof onDeleteInsights === 'function') {
        await onDeleteInsights(force?.id);
      }
    } catch (e) {
      setInsightsError(e?.message || 'Failed to delete AI insights.');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 4) return 'text-error';
    if (score >= 3) return 'text-warning';
    return 'text-success';
  };

  const getScoreBg = (score) => {
    if (score >= 4) return 'bg-error';
    if (score >= 3) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div 
        className="p-6 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => onToggle(force?.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-foreground">{force?.name}</h3>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(force?.score)} text-white`}>
                {force?.score}/5
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{force?.description}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5]?.map((score) => (
                <button
                  key={score}
                  onClick={(e) => {
                    e?.stopPropagation();
                    onScoreChange(force?.id, score);
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-colors ${
                    score <= force?.score
                      ? `${getScoreBg(force?.score)} border-transparent text-white`
                      : 'border-muted-foreground/30 hover:border-muted-foreground/60'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            <Icon 
              name={isExpanded ? "ChevronUp" : "ChevronDown"} 
              size={20} 
              className="text-muted-foreground" 
            />
          </div>
        </div>
      </div>
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/20">
          <div className="p-6 space-y-6">
            {/* Criteria Assessment */}
            <div>
              <h4 className="font-medium text-foreground mb-4">Assessment Criteria</h4>
              <div className="space-y-3">
                {force?.criteria?.map((criterion, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-foreground flex-1">{criterion?.question}</span>
                    <div className="flex items-center space-x-2 ml-4">
                      <select
                        value={criterion?.score}
                        onChange={(e) => onFactorChange(force?.id, index, 'score', parseInt(e?.target?.value))}
                        className="px-3 py-1 rounded border border-border bg-background text-sm"
                      >
                        {[1, 2, 3, 4, 5]?.map(score => (
                          <option key={score} value={score}>{score}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div>
              <h4 className="font-medium text-foreground mb-2">Analysis Notes</h4>
              <textarea
                value={force?.comments}
                onChange={(e) => onCommentChange(force?.id, e?.target?.value)}
                placeholder="Add your analysis and observations..."
                className="w-full p-3 rounded-lg border border-border bg-background text-sm resize-none"
                rows={3}
              />
            </div>

            {/* AI Insights Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-foreground flex items-center">
                  <Icon name="Sparkles" size={16} className="mr-2 text-primary" />
                  AI Insights
                </h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateForceInsights}
                    disabled={isRefreshingInsights || isDeletingInsights}
                    loading={isRefreshingInsights}
                  >
                    <Icon name="RefreshCw" size={14} className="mr-1" />
                    Generate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deleteForceInsights}
                    disabled={isRefreshingInsights || isDeletingInsights || !aiInsights}
                    loading={isDeletingInsights}
                  >
                    <Icon name="Trash2" size={14} className="mr-1" />
                    Delete
                  </Button>
                </div>
              </div>

              {insightsError && (
                <div className="bg-error/10 border border-error/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <Icon name="AlertCircle" size={14} className="text-error flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-error font-medium">AI Analysis Unavailable</p>
                      <p className="text-xs text-error/80 mt-1">{insightsError}</p>
                    </div>
                  </div>
                </div>
              )}

              {forceInsightsError && !insightsError && (
                <div className="bg-error/10 border border-error/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <Icon name="AlertCircle" size={14} className="text-error flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-error font-medium">AI Insights Unavailable</p>
                      <p className="text-xs text-error/80 mt-1">{forceInsightsError}</p>
                    </div>
                  </div>
                </div>
              )}

              {isRefreshingInsights ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
                  <span className="text-sm text-muted-foreground">Loading AI insights...</span>
                </div>
              ) : aiInsights ? (
                <div className="space-y-4">
                  <div className="bg-background rounded-lg p-4">
                    <h5 className="font-medium text-sm text-foreground mb-2">Strategic Analysis</h5>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {aiInsights?.analysis}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-background rounded-lg p-4">
                      <h5 className="font-medium text-sm text-foreground mb-3">Recommendations</h5>
                      <ul className="space-y-2">
                        {aiInsights?.recommendations?.slice(0, 3)?.map((rec, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <Icon name="ArrowRight" size={12} className="text-primary mt-1 flex-shrink-0" />
                            <span className="text-xs text-muted-foreground">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-background rounded-lg p-4">
                      <h5 className="font-medium text-sm text-foreground mb-3">Key Trends</h5>
                      <ul className="space-y-2">
                        {aiInsights?.trends?.slice(0, 3)?.map((trend, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <Icon name="TrendingUp" size={12} className="text-accent mt-1 flex-shrink-0" />
                            <span className="text-xs text-muted-foreground">{trend}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center">
                      <Icon name="Sparkles" size={12} className="mr-1" />
                      Saved AI insights for your account
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Icon name="Brain" size={24} className="text-muted-foreground mb-2 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Click "Generate" to create AI insights for this force
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForceSection;