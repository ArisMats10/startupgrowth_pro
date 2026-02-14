import React, { useEffect, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { deleteSavedAnalysisById, getSavedAnalysisById, renameSavedAnalysis } from '../../../services/aiAnalysisService';

const AnalysisActions = ({ 
  swotData, 
  onSaveAnalysis, 
  onUpdateLoadedAnalysis,
  onExportAnalysis, 
  onLoadAnalysis,
  loadedAnalysisId,
  analysisTitle,
  onTitleChange,
  savedAnalyses = [],
  isLoadingSaved = false,
  saveError = '',
  loadError = '',
  onRefreshSaved,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingLoaded, setIsUpdatingLoaded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState(analysisTitle || '');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewAnalysis, setPreviewAnalysis] = useState(null);
  const [resumeLoadAfterPreview, setResumeLoadAfterPreview] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [renamingId, setRenamingId] = useState(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!showLoadDialog) return;
    if (typeof onRefreshSaved === 'function') {
      onRefreshSaved();
    }
  }, [showLoadDialog]);

  const handleDeleteAnalysis = async (analysis, e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();

    const id = analysis?._id || analysis?.id;
    if (!id) return;

    const ok = window.confirm(`Delete "${analysis?.title || 'Untitled'}"? This cannot be undone.`);
    if (!ok) return;

    setIsDeleting(true);
    setDeletingId(id);
    try {
      await deleteSavedAnalysisById({ id });
      if (typeof onRefreshSaved === 'function') await onRefreshSaved();
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const startRename = (analysis, e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();
    const id = analysis?._id || analysis?.id;
    if (!id) return;
    setRenamingId(id);
    setRenameTitle(analysis?.title || '');
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameTitle('');
    setIsRenaming(false);
  };

  const submitRename = async (analysis, e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();

    const id = analysis?._id || analysis?.id;
    const trimmed = typeof renameTitle === 'string' ? renameTitle.trim() : '';
    if (!id || !trimmed) return;

    setIsRenaming(true);
    try {
      await renameSavedAnalysis({ id, title: trimmed });
      if (typeof onRefreshSaved === 'function') await onRefreshSaved();
      cancelRename();
    } finally {
      setIsRenaming(false);
    }
  };

  const handleSave = async () => {
    if (!saveTitle?.trim()) return;
    
    setIsSaving(true);

    try {
      const ok = await (typeof onSaveAnalysis === 'function' ? onSaveAnalysis(saveTitle?.trim()) : false);
      if (ok) {
        setShowSaveDialog(false);
        // Keep the title in the input; users often save multiple times.
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      await (typeof onExportAnalysis === 'function' ? onExportAnalysis(format) : null);
    } finally {
      setIsExporting(false);
    }
  };


  const getTotalItems = () => {
    return Object.values(swotData)?.reduce((total, items) => total + items?.length, 0);
  };

  const getCompletionPercentage = () => {
    const totalItems = getTotalItems();
    const quadrantsWithItems = Object.values(swotData)?.filter(items => items?.length > 0)?.length;
    return Math.round((quadrantsWithItems / 4) * 100);
  };

  const getSwotDataFromAnalysis = (analysis) => {
    const raw = analysis?.swotData || analysis?.input?.swotData || analysis?.input?.data?.swotData;
    const strengths = Array.isArray(raw?.strengths) ? raw.strengths : [];
    const weaknesses = Array.isArray(raw?.weaknesses) ? raw.weaknesses : [];
    const opportunities = Array.isArray(raw?.opportunities) ? raw.opportunities : [];
    const threats = Array.isArray(raw?.threats) ? raw.threats : [];
    return { strengths, weaknesses, opportunities, threats };
  };

  const getTotalItemsForAnalysis = (analysis) => {
    const itemsCount = analysis?.itemsCount;
    if (Number.isFinite(itemsCount)) return itemsCount;
    const swot = getSwotDataFromAnalysis(analysis);
    return Object.values(swot)?.reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
  };

  const openPreview = (analysis, e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();
    setResumeLoadAfterPreview(!!showLoadDialog);
    if (showLoadDialog) setShowLoadDialog(false);

    setPreviewError('');
    setIsPreviewOpen(true);
    setPreviewAnalysis(analysis);

    const id = analysis?._id || analysis?.id;
    if (!id) return;

    // Always fetch full analysis to ensure preview shows the correct swotData.
    setIsPreviewLoading(true);
    Promise.resolve()
      .then(async () => {
        const res = await getSavedAnalysisById({ id });
        const doc = res?.analysis;
        if (doc) setPreviewAnalysis(doc);
      })
      .catch((err) => {
        setPreviewError(err?.response?.data?.error || err?.message || 'Failed to load preview.');
      })
      .finally(() => {
        setIsPreviewLoading(false);
      });
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewAnalysis(null);
    setPreviewError('');
    setIsPreviewLoading(false);
    if (resumeLoadAfterPreview) setShowLoadDialog(true);
    setResumeLoadAfterPreview(false);
  };

  return (
    <div className="space-y-4">
      {/* Analysis Title */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Enter analysis title..."
            value={analysisTitle}
            onChange={(e) => onTitleChange(e?.target?.value)}
            className="text-lg font-medium"
          />
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="BarChart3" size={16} />
          <span>{getTotalItems()} items</span>
          <span>•</span>
          <span>{getCompletionPercentage()}% complete</span>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="default"
            onClick={() => setShowSaveDialog(true)}
            disabled={getTotalItems() === 0}
          >
            <Icon name="Save" size={16} className="mr-2" />
            Save Analysis
          </Button>

          {loadedAnalysisId ? (
            <Button
              variant="outline"
              onClick={async () => {
                setIsUpdatingLoaded(true);
                try {
                  await (typeof onUpdateLoadedAnalysis === 'function' ? onUpdateLoadedAnalysis() : null);
                } finally {
                  setIsUpdatingLoaded(false);
                }
              }}
              disabled={getTotalItems() === 0 || isUpdatingLoaded}
              loading={isUpdatingLoaded}
            >
              <Icon name="Save" size={16} className="mr-2" />
              Save
            </Button>
          ) : null}
          
          <Button
            variant="outline"
            onClick={() => setShowLoadDialog(true)}
          >
            <Icon name="FolderOpen" size={16} className="mr-2" />
            Load Analysis
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative group">
            <Button
              variant="outline"
              disabled={getTotalItems() === 0 || isExporting}
              loading={isExporting}
            >
              <Icon name="Download" size={16} className="mr-2" />
              Export
            </Button>
            
            <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-elevated opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="p-2">
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-smooth"
                >
                  <Icon name="FileText" size={16} />
                  <span>Export as PDF</span>
                </button>
                <button
                  onClick={() => handleExport('image')}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-smooth"
                >
                  <Icon name="Image" size={16} />
                  <span>Export as Image</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Progress Indicator */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Analysis Progress</span>
          <span className="text-sm text-muted-foreground">{getCompletionPercentage()}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${getCompletionPercentage()}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {['Strengths', 'Weaknesses', 'Opportunities', 'Threats']?.map((quadrant, index) => {
            const key = quadrant?.toLowerCase();
            const hasItems = swotData?.[key]?.length > 0;
            return (
              <div key={quadrant} className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${hasItems ? 'bg-success' : 'bg-muted'}`} />
                <span className="text-xs text-muted-foreground">{quadrant}</span>
              </div>
            );
          })}
        </div>
      </div>
      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-soft z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-modal w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Icon name="Save" size={24} className="text-primary" />
                <h3 className="font-semibold text-lg text-foreground">Save Analysis</h3>
              </div>
              
              <Input
                type="text"
                label="Analysis Title"
                placeholder="Enter a title for your analysis..."
                value={saveTitle}
                onChange={(e) => setSaveTitle(e?.target?.value)}
                required
                className="mb-4"
              />

              {saveError ? (
                <div className="bg-error/10 border border-error/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <Icon name="AlertCircle" size={14} className="text-error flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-error/90">{saveError}</p>
                  </div>
                </div>
              ) : null}
              
              <div className="flex items-center justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleSave}
                  disabled={!saveTitle?.trim() || isSaving}
                  loading={isSaving}
                >
                  Save Analysis
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Load Dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-soft z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-modal w-full max-w-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Icon name="FolderOpen" size={24} className="text-primary" />
                  <h3 className="font-semibold text-lg text-foreground">Load Analysis</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLoadDialog(false)}
                >
                  <Icon name="X" size={20} />
                </Button>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-muted-foreground">
                  {isLoadingSaved ? 'Loading saved analyses…' : `${savedAnalyses?.length || 0} saved analyses`}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => typeof onRefreshSaved === 'function' && onRefreshSaved()}
                  disabled={isLoadingSaved}
                >
                  <Icon name="RefreshCw" size={14} className="mr-1" />
                  Refresh
                </Button>
              </div>

              {loadError ? (
                <div className="bg-error/10 border border-error/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <Icon name="AlertCircle" size={14} className="text-error flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-error/90">{loadError}</p>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(savedAnalyses || [])?.map((analysis) => (
                  <div
                    key={analysis?._id || analysis?.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-smooth"
                    onClick={() => {
                      onLoadAnalysis(analysis);
                      setShowLoadDialog(false);
                    }}
                  >
                    <div className="flex-1">
                      {renamingId === (analysis?._id || analysis?.id) ? (
                        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="text"
                            value={renameTitle}
                            onChange={(e) => setRenameTitle(e?.target?.value)}
                            placeholder="New title"
                            className="h-9"
                          />
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => submitRename(analysis, e)}
                            disabled={!renameTitle?.trim() || isRenaming}
                            loading={isRenaming}
                          >
                            Save
                          </Button>
                          <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); cancelRename(); }}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <h4 className="font-medium text-foreground">{analysis?.title || 'Untitled'}</h4>
                      )}
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {getTotalItemsForAnalysis(analysis)} items
                        </span>
                        {analysis?.updatedAt ? (
                          <span className="text-sm text-muted-foreground">
                            Updated: {new Date(analysis.updatedAt).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Saved analysis</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => openPreview(analysis, e)}
                        title="Preview"
                        disabled={isLoadingSaved || isDeleting}
                      >
                        <Icon name="Eye" size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => startRename(analysis, e)}
                        title="Rename"
                        disabled={isDeleting || isLoadingSaved}
                      >
                        <Icon name="Pencil" size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteAnalysis(analysis, e)}
                        title="Delete"
                        disabled={isLoadingSaved || (isDeleting && deletingId !== (analysis?._id || analysis?.id))}
                        loading={isDeleting && deletingId === (analysis?._id || analysis?.id)}
                      >
                        <Icon name="Trash2" size={16} className="text-error" />
                      </Button>
                      <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
                    </div>
                  </div>
                ))}

                {!isLoadingSaved && (savedAnalyses || [])?.length === 0 && !loadError ? (
                  <div className="text-center py-10">
                    <Icon name="FolderOpen" size={28} className="text-muted-foreground mb-2 mx-auto" />
                    <p className="text-sm text-muted-foreground">No saved SWOT analyses yet.</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Preview Modal */}
      {isPreviewOpen && previewAnalysis ? (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-soft z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-modal max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon name="BarChart3" size={24} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{previewAnalysis?.title || 'Untitled'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getTotalItemsForAnalysis(previewAnalysis)} items
                      {previewAnalysis?.updatedAt ? ` • Updated: ${new Date(previewAnalysis.updatedAt).toLocaleString()}` : ''}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={closePreview}>
                  <Icon name="X" size={20} />
                </Button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {previewError ? (
                <div className="bg-error/10 border border-error/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <Icon name="AlertCircle" size={14} className="text-error flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-error/90">{previewError}</p>
                  </div>
                </div>
              ) : null}

              {isPreviewLoading ? (
                <div className="text-sm text-muted-foreground mb-4">Loading full analysis preview…</div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(getSwotDataFromAnalysis(previewAnalysis))?.map(([quadrant, items]) => (
                  <div key={quadrant} className="space-y-3">
                    <h4 className="font-medium text-foreground capitalize flex items-center">
                      <Icon
                        name={
                          quadrant === 'strengths'
                            ? 'TrendingUp'
                            : quadrant === 'weaknesses'
                              ? 'TrendingDown'
                              : quadrant === 'opportunities'
                                ? 'Target'
                                : 'AlertTriangle'
                        }
                        size={16}
                        className="mr-2"
                      />
                      {quadrant} ({Array.isArray(items) ? items.length : 0} items)
                    </h4>
                    <div className="space-y-2">
                      {(Array.isArray(items) ? items : [])?.slice(0, 6)?.map((item, idx) => (
                        <div key={item?.id ?? `${quadrant}-${idx}`} className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm text-foreground">{item?.text || String(item || '')}</p>
                          {item?.category ? (
                            <span className="inline-block mt-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                              {item?.category}
                            </span>
                          ) : null}
                        </div>
                      ))}
                      {(Array.isArray(items) ? items.length : 0) > 6 ? (
                        <div className="text-xs text-muted-foreground">+ {(items.length - 6)} more…</div>
                      ) : null}
                      {(Array.isArray(items) ? items.length : 0) === 0 ? (
                        <div className="text-xs text-muted-foreground">No items</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-border flex items-center justify-end space-x-3">
              <Button variant="outline" onClick={closePreview}>Cancel</Button>
              <Button
                variant="default"
                onClick={() => {
                  onLoadAnalysis(previewAnalysis);
                  setResumeLoadAfterPreview(false);
                  closePreview();
                }}
              >
                <Icon name="FolderOpen" size={16} className="mr-2" />
                Load Analysis
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AnalysisActions;