import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { exportBusinessPlanAsPDF } from '../../../services/jspdf';

const ExportModal = ({ isOpen, onClose, outlineSections = [], businessPlanData = {} }) => {
  const allSectionIds = useMemo(
    () => (outlineSections || []).map((s) => s?.id).filter(Boolean),
    [outlineSections]
  );

  const allSubsectionIds = useMemo(() => {
    const ids = [];
    for (const section of outlineSections || []) {
      for (const sub of section?.subsections || []) {
        if (sub?.id) ids.push(sub.id);
      }
    }
    return ids;
  }, [outlineSections]);

  const [selectedSectionIds, setSelectedSectionIds] = useState(() => new Set(allSectionIds));
  const [selectedSubsectionIds, setSelectedSubsectionIds] = useState(() => new Set(allSubsectionIds));
  const [isExporting, setIsExporting] = useState(false);

  const displaySections = useMemo(() => {
    return (outlineSections || []).map((s) => ({
      id: s?.id,
      title: s?.title,
      subsections: Array.isArray(s?.subsections) ? s.subsections : [],
    }));
  }, [outlineSections]);

  useEffect(() => {
    if (!isOpen) return;
    // On open, ensure defaults include any new/changed outline.
    setSelectedSectionIds(new Set(allSectionIds));
    setSelectedSubsectionIds(new Set(allSubsectionIds));
  }, [isOpen, allSectionIds, allSubsectionIds]);

  const hasAnySelection = selectedSectionIds.size > 0 || selectedSubsectionIds.size > 0;

  const getSubsectionIdsForSection = (sectionId) => {
    const section = (outlineSections || []).find((s) => s?.id === sectionId);
    return (section?.subsections || []).map((sub) => sub?.id).filter(Boolean);
  };

  const handleSectionToggle = (sectionId) => {
    const nextSections = new Set(selectedSectionIds);
    const nextSubsections = new Set(selectedSubsectionIds);
    const subsectionIds = getSubsectionIdsForSection(sectionId);

    if (nextSections.has(sectionId)) {
      // Turning OFF a section => its subsections cannot be included
      nextSections.delete(sectionId);
      subsectionIds.forEach((id) => nextSubsections.delete(id));
    } else {
      // Turning ON a section => default to selecting all its subsections
      nextSections.add(sectionId);
      subsectionIds.forEach((id) => nextSubsections.add(id));
    }

    setSelectedSectionIds(nextSections);
    setSelectedSubsectionIds(nextSubsections);
  };

  const handleSubsectionToggle = (subsectionId) => {
    const next = new Set(selectedSubsectionIds);
    if (next.has(subsectionId)) next.delete(subsectionId);
    else next.add(subsectionId);
    setSelectedSubsectionIds(next);
  };

  const handleSelectAll = () => {
    const everythingSelected =
      selectedSectionIds.size === displaySections.length &&
      selectedSubsectionIds.size === allSubsectionIds.length;

    if (everythingSelected) {
      setSelectedSectionIds(new Set());
      setSelectedSubsectionIds(new Set());
      return;
    }

    setSelectedSectionIds(new Set(allSectionIds));
    setSelectedSubsectionIds(new Set(allSubsectionIds));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const sectionsToExport = (outlineSections || [])
        .map((section) => {
          const includeContent = selectedSectionIds.has(section?.id);
          if (!includeContent) return null;
          const selectedSubs = (section?.subsections || []).filter((sub) => selectedSubsectionIds.has(sub?.id));
          return {
            ...section,
            includeContent,
            subsections: selectedSubs,
          };
        })
        .filter(Boolean);

      exportBusinessPlanAsPDF(sectionsToExport, businessPlanData, 'BusinessPlan.pdf');

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getSelectedSectionsCount = () => displaySections?.filter((s) => selectedSectionIds?.has(s?.id)).length || 0;
  const getSelectedSubsectionsCount = () => selectedSubsectionIds.size;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-soft z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-modal w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Export Business Plan</h2>
              <p className="text-muted-foreground mt-1">Export as PDF</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <Icon name="X" size={20} />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Section Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">Sections to Include</h3>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedSectionIds?.size === displaySections?.length && selectedSubsectionIds?.size === allSubsectionIds.length
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {displaySections?.map((section) => (
                  <div
                    key={section?.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedSectionIds?.has(section?.id)}
                        onChange={() => handleSectionToggle(section?.id)}
                      />
                      <div>
                        <span className="text-sm font-medium text-foreground">{section?.title}</span>
                        <p className="text-xs text-muted-foreground">
                          {(section?.subsections || []).length
                            ? `${(section.subsections || []).filter((sub) => selectedSubsectionIds.has(sub?.id)).length} of ${(section.subsections || []).length} subsections selected`
                            : 'No subsections'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {displaySections
                  ?.filter((s) => (s?.subsections || []).length > 0)
                  ?.map((section) => (
                    <div key={`${section?.id}-subs`} className="border border-border rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-muted/40">
                        <span className="text-sm font-medium text-foreground">{section?.title} — Subsections</span>
                      </div>
                      <div
                        className={`p-3 space-y-2 ${
                          selectedSectionIds.has(section?.id)
                            ? ''
                            : 'opacity-50 pointer-events-none select-none'
                        }`}
                      >
                        {(section?.subsections || []).map((sub) => (
                          <div key={sub?.id} className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedSubsectionIds?.has(sub?.id)}
                              onChange={() => handleSubsectionToggle(sub?.id)}
                            />
                            <span className="text-sm text-foreground">{sub?.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
              
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total sections selected:</span>
                  <span className="font-medium text-foreground">{getSelectedSectionsCount()}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Total subsections selected:</span>
                  <span className="font-medium text-foreground">{getSelectedSubsectionsCount()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Export will be available for download once completed
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                loading={isExporting}
                disabled={!hasAnySelection}
              >
                <Icon name="Download" size={16} className="mr-2" />
                Export Business Plan
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;