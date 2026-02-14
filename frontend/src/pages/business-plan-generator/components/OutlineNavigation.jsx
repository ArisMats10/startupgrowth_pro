import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';

const OutlineNavigation = ({ sections, activeSection, onSectionChange, completionStatus, onExportPDF, onOpenPlans, onSavePlan }) => {
  const [expandedSections, setExpandedSections] = useState(new Set(['executive-summary']));
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSection = (sectionId) => {
    const next = new Set(expandedSections);
    next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
    setExpandedSections(next);
  };

  const getCompletionIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Icon name="CheckCircle" size={16} className="text-success" />;
      case 'in-progress':
        return <Icon name="Clock" size={16} className="text-warning" />;
      default:
        return <Icon name="Circle" size={16} className="text-muted-foreground" />;
    }
  };

  const getProgressPercentage = () => {
    const allIds = sections.flatMap(s => [s.id, ...(s.subsections ? s.subsections.map(sub => sub.id) : [])]);
    const total = allIds.length;
    const completed = allIds.filter(id => completionStatus?.[id] === 'completed').length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return Math.min(percent, 100);
  };

  return (
    <div className="w-full md:w-72 lg:w-80 bg-card border-b md:border-b-0 md:border-r border-border flex flex-col h-auto md:h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-semibold text-foreground">Business Plan Outline</h2>
          {/* Mobile toggle */}
          <button
            type="button"
            className="md:hidden inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setIsMobileOpen(v => !v)}
            aria-expanded={isMobileOpen}
            aria-controls="outline-sections"
          >
            <span>Outline</span>
            <Icon
              name="ChevronDown"
              size={16}
              className={`transition-transform ${isMobileOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 md:mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs md:text-sm text-muted-foreground">Overall Progress</span>
            <span className="text-xs md:text-sm font-medium text-foreground">{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 md:h-2">
            <div
              className="bg-primary h-1.5 md:h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div
        id="outline-sections"
        className={`${isMobileOpen ? 'block' : 'hidden'} md:block`}
      >
        <div className="max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="p-3 md:p-4 space-y-2">
            {sections?.map((section) => (
              <div key={section?.id} className="space-y-1">
                <div
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-smooth ${
                    activeSection === section?.id
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-muted text-foreground'
                  }`}
                  onClick={() => onSectionChange(section?.id)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    {getCompletionIcon(completionStatus?.[section?.id])}
                    <span className="text-sm font-medium truncate">{section?.title}</span>
                  </div>

                  {section?.subsections && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(section?.id);
                      }}
                      className="p-1 hover:bg-background rounded"
                    >
                      <Icon
                        name={expandedSections?.has(section?.id) ? 'ChevronDown' : 'ChevronRight'}
                        size={14}
                      />
                    </button>
                  )}
                </div>

                {/* Subsections */}
                {section?.subsections && expandedSections?.has(section?.id) && (
                  <div className="ml-4 md:ml-6 space-y-1">
                    {section?.subsections?.map((subsection) => (
                      <div
                        key={subsection?.id}
                        className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-smooth ${
                          activeSection === subsection?.id
                            ? 'bg-primary/5 text-primary'
                            : 'hover:bg-muted/50 text-muted-foreground'
                        }`}
                        onClick={() => onSectionChange(subsection?.id)}
                      >
                        {getCompletionIcon(completionStatus?.[subsection?.id])}
                        <span className="text-sm truncate">{subsection?.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-3 md:p-4 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
            <button
              className="w-full flex items-center justify-start space-x-2 p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-smooth"
              onClick={onExportPDF}
            >
              <Icon name="Download" size={16} />
              <span>Export as PDF</span>
            </button>
            <button
              className="w-full flex items-center justify-start space-x-2 p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-smooth"
              onClick={onOpenPlans}
            >
              <Icon name="LayoutTemplate" size={16} />
              <span>Load Plan</span>
            </button>
            <button
              className="w-full flex items-center justify-start space-x-2 p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-smooth"
              onClick={onSavePlan}
            >
              <Icon name="Save" size={16} />
              <span>Create Plan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutlineNavigation;