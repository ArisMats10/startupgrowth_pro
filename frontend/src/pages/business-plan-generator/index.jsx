import React, { useMemo, useState, useEffect, useRef} from 'react';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import OutlineNavigation from './components/OutlineNavigation';
import ContentEditor from './components/ContentEditor';
import AIAssistantPanel from './components/AIAssistantPanel';
import TemplateSelector from './components/TemplateSelector';
import PlanManager from './components/PlanManager';
import ExportModal from './components/ExportModal';
import CompareModal from './components/CompareModal';
import { buildBusinessPlanTemplateData } from './utils/templatePlaceholders';
import { updateBusinessPlan } from 'services/businessPlanPlansService';



const BusinessPlanGenerator = () => {
  const [activeSection, setActiveSection] = useState('executive-summary');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [plansModalTab, setPlansModalTab] = useState('load');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [currentPlanTitle, setCurrentPlanTitle] = useState('');
  const [businessPlanData, setBusinessPlanData] = useState({});
  const [completionStatus, setCompletionStatus] = useState({});
  const [lastSaved, setLastSaved] = useState(null);
  const autosaveTimerRef = useRef(null);
  const skipNextAutosaveRef = useRef(false);

  const lastSavedLabel = useMemo(() => {
    if (!lastSaved) return 'Not saved yet';
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(lastSaved);
    } catch {
      return String(lastSaved);
    }
  }, [lastSaved]);

  const aiInsightsBySection = useMemo(() => {
    const map = {};
    const data = businessPlanData && typeof businessPlanData === 'object' ? businessPlanData : {};
    for (const [sectionId, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && value.aiInsights !== undefined) {
        map[sectionId] = value.aiInsights;
      }
    }
    return map;
  }, [businessPlanData]);

  const aiDraftsBySection = useMemo(() => {
    const map = {};
    const data = businessPlanData && typeof businessPlanData === 'object' ? businessPlanData : {};
    for (const [sectionId, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && value.aiDraft !== undefined) {
        map[sectionId] = value.aiDraft;
      }
    }
    return map;
  }, [businessPlanData]);
  const sections = [
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      description: 'A concise overview of your business concept, market opportunity, and financial highlights',
      subsections: [
        { id: 'business-concept', title: 'Business Concept' },
        { id: 'market-opportunity', title: 'Market Opportunity' },
        { id: 'competitive-advantage', title: 'Competitive Advantage' },
        { id: 'financial-summary', title: 'Financial Summary' }
      ]
    },
    {
      id: 'company-description',
      title: 'Company Description',
      description: 'Detailed information about your company, mission, vision, and core values',
      subsections: [
        { id: 'company-overview', title: 'Company Overview' },
        { id: 'mission-vision', title: 'Mission & Vision' },
        { id: 'company-history', title: 'Company History' },
        { id: 'legal-structure', title: 'Legal Structure' }
      ]
    },
    {
      id: 'market-analysis',
      title: 'Market Analysis',
      description: 'Comprehensive analysis of your target market, industry trends, and customer segments',
      subsections: [
        { id: 'industry-overview', title: 'Industry Overview' },
        { id: 'target-market', title: 'Target Market' },
        { id: 'market-size', title: 'Market Size & Growth' },
        { id: 'competitive-analysis', title: 'Competitive Analysis' }
      ]
    },
    {
      id: 'organization',
      title: 'Organization & Management',
      description: 'Your organizational structure, management team, and key personnel',
      subsections: [
        { id: 'organizational-structure', title: 'Organizational Structure' },
        { id: 'management-team', title: 'Management Team' },
        { id: 'advisory-board', title: 'Advisory Board' },
        { id: 'personnel-plan', title: 'Personnel Plan' }
      ]
    },
    {
      id: 'products-services',
      title: 'Products & Services',
      description: 'Detailed description of your products or services and their unique value proposition',
      subsections: [
        { id: 'product-overview', title: 'Product Overview' },
        { id: 'features-benefits', title: 'Features & Benefits' },
        { id: 'development-roadmap', title: 'Development Roadmap' },
        { id: 'intellectual-property', title: 'Intellectual Property' }
      ]
    },
    {
      id: 'marketing-sales-strategy',
      title: 'Marketing & Sales Strategy',
      description: 'Your go-to-market strategy, pricing model, and customer acquisition plan',
      subsections: [
        { id: 'marketing-strategy', title: 'Marketing Strategy' },
        { id: 'sales-strategy', title: 'Sales Strategy' },
        { id: 'pricing-model', title: 'Pricing Model' },
        { id: 'customer-acquisition', title: 'Customer Acquisition' }
      ]
    },
    {
      id: 'financial-projections',
      title: 'Financial Projections',
      description: 'Detailed financial forecasts, revenue models, and key financial metrics',
      subsections: [
        { id: 'revenue-model', title: 'Revenue Model' },
        { id: 'financial-forecasts', title: 'Financial Forecasts' },
        { id: 'break-even-analysis', title: 'Break-even Analysis' },
        { id: 'key-metrics', title: 'Key Financial Metrics' }
      ]
    },
    {
      id: 'funding-requirements',
      title: 'Funding Requirements',
      description: 'Your funding needs, use of funds, and potential return on investment',
      subsections: [
        { id: 'funding-needs', title: 'Funding Needs' },
        { id: 'use-of-funds', title: 'Use of Funds' },
        { id: 'exit-strategy', title: 'Exit Strategy' },
        { id: 'roi-projections', title: 'ROI Projections' }
      ]
    }
  ];

    const mockPdfFiles = [
    new File(['Sample PDF Content A'], 'PlanA.pdf', { type: 'application/pdf' }),
    new File(['Sample PDF Content B'], 'PlanB.pdf', { type: 'application/pdf' }),
];

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
  };

  const handleContentChange = (sectionId, content) => {
    setBusinessPlanData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev?.[sectionId],
        content
      }
    }));

    const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
    const minWordCount = 200;



    let newStatus;
    if (wordCount === 0) {
      newStatus = 'not-completed';
    } else if (wordCount >= minWordCount) {
      newStatus = 'completed';
    } else {
      newStatus = 'in-progress';
    }

    setCompletionStatus(prev => {
      const updated = { ...prev, [sectionId]: newStatus };

      // If this is a subsection, check if the parent section should be updated
      const parentSection = sections.find(s =>
        s.subsections?.some(sub => sub.id === sectionId)
      );
      if (parentSection) {
        // Check parent section's own content
        const parentContent = businessPlanData?.[parentSection.id]?.content || '';
        const parentWordCount = parentContent.trim().split(/\s+/).filter(Boolean).length;
        const parentCompleted = parentWordCount >= minWordCount;
        const allSubsCompleted = parentSection.subsections.every(
          sub => (sub.id === sectionId ? newStatus : updated[sub.id]) === 'completed'
        );
       const anySubInProgressOrCompleted = parentSection.subsections.some(
          sub => {
            const status = (sub.id === sectionId ? newStatus : updated[sub.id]);
            return status === 'in-progress' || status === 'completed';
          }
        );
        updated[parentSection.id] =
          parentCompleted && allSubsCompleted
            ? 'completed'
            : anySubInProgressOrCompleted
              ? 'in-progress'
              : parentWordCount === 0
                ? 'not-completed'
                : 'in-progress';
      }

      // If this is a main section, check if all subsections are completed or in progress
      const mainSection = sections.find(s => s.id === sectionId);
      if (mainSection?.subsections) {
        const mainCompleted = wordCount >= 10;
        const allSubsCompleted = mainSection.subsections.every(
          sub => updated[sub.id] === 'completed'
        );
        const anySubInProgressOrCompleted = mainSection.subsections.some(
          sub => updated[sub.id] === 'in-progress' || updated[sub.id] === 'completed'
        );
        updated[sectionId] =
          mainCompleted && allSubsCompleted
            ? 'completed'
            : anySubInProgressOrCompleted
              ? 'in-progress'
              : wordCount === 0
                ? 'not-completed'
                : 'in-progress';
      }

      return updated;
    });

  };

      useEffect(() => {
      if (!currentPlanId) return;

      // skip autosave right after loading/applying a plan/template
      if (skipNextAutosaveRef.current) {
        skipNextAutosaveRef.current = false;
        return;
      }

      // debounce: reset timer on every keystroke/change
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = setTimeout(async () => {
        try {
          const updated = await updateBusinessPlan(currentPlanId, {
            businessPlanData,
            completionStatus,
          });
          setLastSaved(updated?.updatedAt ? new Date(updated.updatedAt) : new Date());
        } catch (e) {
          console.warn(
            'Autosave failed:',
            e?.response?.data?.error || e?.message || e
          );
        }
      }, 800);

      return () => {
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      };
    }, [businessPlanData, completionStatus, currentPlanId]);



  const handleAIAssist = async (type, sectionId) => {
    // Simulate AI assistance
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const suggestions = {
      expand: "Consider adding more detailed examples and case studies to strengthen this section.",
      improve: "The writing could be enhanced with more active voice and specific metrics.",
      data: "Industry data shows that 73% of businesses in this sector experience similar challenges.",
      examples: "For example, companies like Slack and Asana have successfully implemented similar strategies."
    };

    setBusinessPlanData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev?.[sectionId],
        aiSuggestions: [suggestions?.[type] || "AI suggestion generated successfully."]
      }
    }));
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setCurrentPlanId(null);
    setCurrentPlanTitle('');
    const { businessPlanData: seededData, completionStatus: seededStatus } = buildBusinessPlanTemplateData(template, sections);
    setBusinessPlanData(seededData);
    setCompletionStatus(seededStatus);
    setActiveSection(sections?.[0]?.id || 'executive-summary');
    setLastSaved(null);
    setIsTemplateModalOpen(false);
    skipNextAutosaveRef.current = true; // Skip autosave on next content change since we're seeding new data
  };

  const handleApplySavedPlan = (plan) => {
    setSelectedTemplate(plan?.template || null);
    setBusinessPlanData(plan?.businessPlanData || {});
    setCompletionStatus(plan?.completionStatus || {});
    setCurrentPlanId(plan?._id || null);
    setCurrentPlanTitle(plan?.title || '');
    setActiveSection(sections?.[0]?.id || 'executive-summary');
    setLastSaved(plan?.updatedAt ? new Date(plan.updatedAt) : new Date());
    skipNextAutosaveRef.current = true; // Skip autosave on next content change since we're applying saved data
  };

  const handlePlanSaved = (planMeta) => {
    if (!planMeta) return;
    setCurrentPlanId(planMeta?._id || currentPlanId);
    setCurrentPlanTitle(planMeta?.title || currentPlanTitle);
    setLastSaved(planMeta?.updatedAt ? new Date(planMeta.updatedAt) : new Date());
  };
  
  const getCurrentSectionData = () => {
    const section = sections?.find(s => s?.id === activeSection) || 
                   sections?.find(s => s?.subsections?.some(sub => sub?.id === activeSection));
    
    if (section && section?.subsections) {
      const subsection = section?.subsections?.find(sub => sub?.id === activeSection);
      if (subsection) {
        return {
          title: subsection?.title,
          description: section?.description,
          content: businessPlanData?.[activeSection]?.content || '',
          aiSuggestions: businessPlanData?.[activeSection]?.aiSuggestions || []
        };
      }
    }

    return {
      title: section?.title || 'Section',
      description: section?.description || '',
      content: businessPlanData?.[activeSection]?.content || '',
      aiSuggestions: businessPlanData?.[activeSection]?.aiSuggestions || []
    };
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-28 md:pt-16 h-screen flex flex-col md:flex-row ">
        {/* Left Sidebar - Outline Navigation */}
        <div className="w-full md:w-72 lg:w-80 flex-shrink-0 border-b md:border-b-0 md:border-r border-border overflow-hidden pt-14 md:pt-0">
          <OutlineNavigation
            sections={sections}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            completionStatus={completionStatus}
            onExportPDF={() => setIsExportModalOpen(true)}
            onOpenPlans={() => {
              setPlansModalTab('load');
              setIsPlansModalOpen(true);
            }}
            onSavePlan={() => {
              setPlansModalTab('save');
              setIsPlansModalOpen(true);
            }}
          />
        </div>
      

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 flex pt-14 justify-center lg:justify-start">
          <div className="w-full max-w-6xl mx-auto px-3 md:px-4 lg:px-6">
            <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-8rem)]">
              <div className="flex-1 min-w-0">
                <ContentEditor
                  selectedSection={activeSection}
                  sectionTitle={getCurrentSectionData()?.title}
                  content={getCurrentSectionData()?.content}
                  onContentChange={handleContentChange}
                />
              </div>

              <div className="w-full lg:w-[26rem] flex-shrink-0 min-h-0">
                <AIAssistantPanel
                  selectedSection={activeSection}
                  sectionTitle={getCurrentSectionData()?.title}
                  sectionDescription={getCurrentSectionData()?.description}
                  content={getCurrentSectionData()?.content}
                  onContentChange={handleContentChange}
                  businessPlanData={businessPlanData}
                  initialAiInsights={businessPlanData?.[activeSection]?.aiInsights || null}
                  onAiInsightsChange={(insights) => {
                    setBusinessPlanData((prev) => ({
                      ...prev,
                      [activeSection]: {
                        ...(prev?.[activeSection] || {}),
                        aiInsights: insights,
                      },
                    }));
                  }}
                  aiDraft={businessPlanData?.[activeSection]?.aiDraft || ''}
                  onAiDraftChange={(draft) => {
                    setBusinessPlanData((prev) => ({
                      ...prev,
                      [activeSection]: {
                        ...(prev?.[activeSection] || {}),
                        aiDraft: draft,
                      },
                    }));
                  }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>
      {/* Top Action Bar */}
      <div className="fixed top-16 left-0 md:left-72 lg:left-80 right-0 bg-card border-b border-border px-4 lg:px-6 py-3 z-30">
        <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
          {/* Left side - Save and Collaborators info */}
          <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Icon name="Save" size={14} />
              <span className="whitespace-nowrap overflow-hidden text-ellipsis" title={lastSaved ? lastSaved.toLocaleString() : 'Not saved yet'}>
                Last saved: {lastSavedLabel}
              </span>
            </div>
          </div>

          {/* Right side - Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTemplateModalOpen(true)}
              className="flex-1 md:flex-none"
            >
              <Icon name="FileTemplate" size={16} className="mr-2" />
              <span className="hidden md:inline">Templates</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportModalOpen(true)}
              className="flex-1 md:flex-none"
            >
              <Icon name="Download" size={16} className="mr-2" />
              <span className="hidden md:inline">Export</span>
            </Button>


             <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCompareModalOpen(true)}
              className="flex-1 md:flex-none"
            >
              <Icon name="BarChart2" size={16} className="mr-2" />
              <span className="hidden md:inline">Compare Plans</span>
            </Button>

          </div>
        </div>
      </div>


      {/* Modals */}
      <PlanManager
        isOpen={isPlansModalOpen}
        onClose={() => setIsPlansModalOpen(false)}
        initialTab={plansModalTab}
        currentBusinessPlanData={businessPlanData}
        currentCompletionStatus={completionStatus}
        currentTemplate={selectedTemplate}
        currentPlanId={currentPlanId}
        currentPlanTitle={currentPlanTitle}
        currentAiInsightsBySection={aiInsightsBySection}
        currentAiDraftsBySection={aiDraftsBySection}
        onPlanSaved={handlePlanSaved}
        onApplyPlan={handleApplySavedPlan}
      />
      <TemplateSelector
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        outlineSections={sections}
        businessPlanData={businessPlanData}
      />
      <CompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        pdfFiles={mockPdfFiles}
      />
    </div>
  );
};

export default BusinessPlanGenerator;