import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

import {
  createBusinessPlan,
  deleteBusinessPlan,
  getBusinessPlan,
  listBusinessPlans,
  updateBusinessPlan,
} from '../../../services/businessPlanPlansService';

const PlanManager = ({
  isOpen,
  onClose,
  initialTab = 'load',
  currentBusinessPlanData,
  currentCompletionStatus,
  currentTemplate,
  currentPlanId,
  currentPlanTitle,
  currentAiInsightsBySection,
  currentAiDraftsBySection,
  onPlanSaved,
  onApplyPlan,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    if (currentPlanTitle && typeof currentPlanTitle === 'string') {
      setSaveTitle(currentPlanTitle);
    }
  }, [isOpen, currentPlanTitle]);


    const buildBusinessPlanDataWithAi = () => {
      const base = currentBusinessPlanData && typeof currentBusinessPlanData === 'object'
        ? currentBusinessPlanData
        : {};

      const next = { ...base };

      const drafts = currentAiDraftsBySection && typeof currentAiDraftsBySection === 'object'
        ? currentAiDraftsBySection
        : {};

      const insights = currentAiInsightsBySection && typeof currentAiInsightsBySection === 'object'
        ? currentAiInsightsBySection
        : {};

      const sectionIds = new Set([
        ...Object.keys(base),
        ...Object.keys(drafts),
        ...Object.keys(insights),
      ]);

      for (const sectionId of sectionIds) {
        const prevSection = next[sectionId] && typeof next[sectionId] === 'object' ? next[sectionId] : {};
        next[sectionId] = {
          ...prevSection,
          ...(drafts[sectionId] !== undefined ? { aiDraft: drafts[sectionId] } : {}),
          ...(insights[sectionId] !== undefined ? { aiInsights: insights[sectionId] } : {}),
        };
      }

      return next;
    };


  const refreshPlans = async () => {
    setIsLoading(true);
    try {
      const list = await listBusinessPlans();
      setPlans(Array.isArray(list) ? list : []);
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshPlans();
  }, [isOpen]);

  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return plans;
    return (plans || []).filter((p) => {
      const title = (p?.title || '').toLowerCase();
      const excerpt = (p?.excerpt || '').toLowerCase();
      return title.includes(q) || excerpt.includes(q);
    });
  }, [plans, searchQuery]);

  const handleSave = async () => {
    const title = saveTitle.trim();
    if (!title) {
      alert('Please enter a plan title');
      return;
    }

    if (!currentBusinessPlanData || typeof currentBusinessPlanData !== 'object') {
      alert('Nothing to save yet. Add some content first.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await createBusinessPlan({
        title,
        template: currentTemplate || null,
        businessPlanData: buildBusinessPlanDataWithAi(),
        completionStatus: currentCompletionStatus || {},
      });

      setSaveTitle('');
      await refreshPlans();
      setActiveTab('load');
      setSelectedPlanId(saved?._id || null);
      onPlanSaved?.(saved);
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Failed to save plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!currentPlanId) {
      alert('No plan is currently loaded. Load a plan first, or create a new one.');
      return;
    }
    const title = saveTitle.trim() || (currentPlanTitle || '').trim();
    if (!title) {
      alert('Please enter a plan title');
      return;
    }
    if (!currentBusinessPlanData || typeof currentBusinessPlanData !== 'object') {
      alert('Nothing to save yet. Add some content first.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateBusinessPlan(currentPlanId, {
        title,
        template: currentTemplate || null,
        businessPlanData: buildBusinessPlanDataWithAi(),
        completionStatus: currentCompletionStatus || {},
      });

      await refreshPlans();
      setActiveTab('load');
      setSelectedPlanId(updated?._id || currentPlanId);
      onPlanSaved?.(updated);
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Failed to update plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async (id) => {
    if (!id) return;
    try {
      const plan = await getBusinessPlan(id);
      if (!plan) return;
      onApplyPlan?.(plan);
      onClose?.();
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Failed to load plan');
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    const ok = confirm('Delete this plan?');
    if (!ok) return;

    try {
      await deleteBusinessPlan(id);
      if (selectedPlanId === id) setSelectedPlanId(null);
      await refreshPlans();
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Failed to delete plan');
    }
  };

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-soft z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-modal w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Plans</h2>
              <p className="text-muted-foreground mt-1">Save your work and load it later</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <Icon name="X" size={20} />
            </Button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Tabs */}
            <div className="inline-flex bg-muted/30 border border-border rounded-lg p-1">
              <button
                className={`px-3 py-1.5 text-sm rounded-md transition-smooth ${
                  activeTab === 'load' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('load')}
              >
                Saved Plans
              </button>
              <button
                className={`px-3 py-1.5 text-sm rounded-md transition-smooth ${
                  activeTab === 'save' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('save')}
              >
                Create
              </button>
            </div>

            {/* Search */}
            {activeTab === 'load' && (
              <div className="relative w-full md:w-96">
                <Icon
                  name="Search"
                  size={16}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Search plans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e?.target?.value)}
                  className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'save' ? (
            <div className="p-6 overflow-y-auto h-full">
              <div className="max-w-2xl">
                <h3 className="text-lg font-medium text-foreground mb-2">Create Plan</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This saves all sections and their text to the backend.
                </p>

                <label className="block text-sm text-muted-foreground mb-2">Plan title</label>
                <input
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g., TechFlow - Investor Version"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                />

                <div className="mt-4 flex gap-2">
                  <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
                    <Icon name="Plus" size={16} className="mr-2" />
                    Create Plan
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleUpdate}
                    disabled={isSaving || !currentPlanId}
                  >
                    <Icon name="Save" size={16} className="mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('load')}
                    disabled={isSaving}
                  >
                    View Saved Plans
                  </Button>
                </div>

                {currentPlanId && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Saving changes updates the currently loaded plan.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 overflow-y-auto h-full">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  Loading plans...
                </div>
              ) : filteredPlans?.length === 0 ? (
                <div className="text-center py-12">
                  <Icon name="FolderOpen" size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No saved plans</h3>
                  <p className="text-muted-foreground">Save your first plan to see it here.</p>
                  <div className="mt-4">
                    <Button onClick={() => setActiveTab('save')}>
                      <Icon name="Plus" size={16} className="mr-2" />
                      Create Plan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPlans.map((p) => (
                    <div
                      key={p?._id}
                      className={`bg-card border rounded-lg overflow-hidden transition-smooth ${
                        selectedPlanId === p?._id ? 'border-primary shadow-elevated' : 'border-border hover:shadow-elevated'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{p?.title}</h3>
                            <p className="text-xs text-muted-foreground">Updated: {formatDate(p?.updatedAt)}</p>
                          </div>
                          <Icon name="FileText" size={18} className="text-muted-foreground" />
                        </div>

                        {p?.excerpt && (
                          <p className="text-sm text-muted-foreground mt-3 line-clamp-4 whitespace-pre-wrap">
                            {p.excerpt}
                          </p>
                        )}

                        <div className="mt-4 flex gap-2">
                          <Button size="sm" className="flex-1" onClick={() => handleLoad(p?._id)}>
                            <Icon name="Upload" size={14} className="mr-2" />
                            Load
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(p?._id)}>
                            <Icon name="Trash2" size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <div className="flex items-center justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanManager;
