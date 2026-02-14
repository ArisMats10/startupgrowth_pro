import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import SWOTMatrix from './components/SWOTMatrix';
import AIInsightsSidebar from './components/AIInsightsSidebar';
import TemplateSelector from './components/TemplateSelector';
import AnalysisActions from './components/AnalysisActions';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  getSavedAnalysisById,
  listSavedAnalyses,
  saveAnalysisRecord,
  loadSwotItemsDraft,
  saveSwotItemsDraft,
  updateSavedAnalysisById,
} from '../../services/aiAnalysisService';
import { useAuth } from '../../context/authContext.jsx';

const SWOTAnalysisTool = () => {
  const { user } = useAuth();
  const draftLoadedRef = useRef(false);
  const saveTimerRef = useRef(null);
  const [swotData, setSWOTData] = useState({
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: []
  });
  
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [analysisTitle, setAnalysisTitle] = useState('');
  const [loadedAnalysisId, setLoadedAnalysisId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileActiveQuadrant, setMobileActiveQuadrant] = useState('strengths');

  const [savedAnalyses, setSavedAnalyses] = useState([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState('');

  const [aiResult, setAiResult] = useState(null);
  const [aiPersistError, setAiPersistError] = useState('');
  const [loadedAnalysisOutput, setLoadedAnalysisOutput] = useState({});

  const normalizeSwotItem = (item) => {
    if (typeof item === 'string') {
      const text = item.trim();
      return text
        ? { id: generateId(), text, category: 'General', createdAt: new Date().toISOString() }
        : null;
    }
    if (item && typeof item === 'object') {
      const text = (item.text ?? item.content ?? '').toString().trim();
      if (!text) return null;
      const category = (typeof item.category === 'string' ? item.category.trim() : '') || 'General';
      return {
        ...item,
        id: item.id ?? item._id ?? generateId(),
        text,
        category,
        createdAt: item.createdAt ?? new Date().toISOString(),
      };
    }
    return null;
  };

  const normalizeSwotQuadrants = (raw) => {
    const safe = raw && typeof raw === 'object' ? raw : {};
    const normalizeArr = (arr) => (Array.isArray(arr) ? arr.map(normalizeSwotItem).filter(Boolean) : []);
    return {
      strengths: normalizeArr(safe.strengths),
      weaknesses: normalizeArr(safe.weaknesses),
      opportunities: normalizeArr(safe.opportunities),
      threats: normalizeArr(safe.threats),
    };
  };

  // Load user's latest draft SWOT items (auto-resume)
  useEffect(() => {
    const loadDraft = async () => {
      if (!user) return;
      try {
        const res = await loadSwotItemsDraft();
        const doc = res?.analysis;
        const nextSwot = doc?.swotData || doc?.input?.swotData;
        if (nextSwot && typeof nextSwot === 'object') {
          setSWOTData(normalizeSwotQuadrants(nextSwot));
          if (doc?.title) setAnalysisTitle(doc.title);
        }
      } catch (e) {
        // Silent failure: users can still work offline / without backend.
        console.warn('Failed to load SWOT draft:', e);
      } finally {
        draftLoadedRef.current = true;
      }
    };

    loadDraft();
  }, [user]);

  // Auto-save draft whenever SWOT items change (debounced)
  useEffect(() => {
    if (!user) return;
    if (!draftLoadedRef.current) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveSwotItemsDraft({
          swotData,
          title: analysisTitle || 'SWOT Draft',
        });
      } catch (e) {
        console.warn('Failed to auto-save SWOT draft:', e);
      }
    }, 600);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [swotData, analysisTitle, user]);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate unique ID for new items
  const generateId = () => Date.now() + Math.random();

  const normalizeQuadrantKey = (value) => {
    if (typeof value !== 'string') return null;
    const v = value.trim().toLowerCase();
    if (!v) return null;

    // Accept common variations from AI / UI
    if (v === 'strength' || v === 'strengths') return 'strengths';
    if (v === 'weakness' || v === 'weaknesses') return 'weaknesses';
    if (v === 'opportunity' || v === 'opportunities') return 'opportunities';
    if (v === 'threat' || v === 'threats') return 'threats';

    return null;
  };

  const handleAddItem = (quadrant, text, category = 'General') => {
    const normalizedQuadrant = normalizeQuadrantKey(quadrant);
    if (!normalizedQuadrant) {
      console.warn('Invalid SWOT quadrant for addItem:', quadrant);
      return;
    }

    const safeText = (typeof text === 'string' ? text.trim() : String(text ?? '').trim());
    if (!safeText) return;
    const safeCategory = (typeof category === 'string' ? category.trim() : String(category ?? '').trim()) || 'General';

    const newItem = {
      id: generateId(),
      text: safeText,
      category: safeCategory,
      createdAt: new Date()?.toISOString()
    };
    
    setSWOTData(prev => ({
      ...prev,
      [normalizedQuadrant]: [...(Array.isArray(prev?.[normalizedQuadrant]) ? prev[normalizedQuadrant] : []), newItem]
    }));
  };

  const handleRemoveItem = (quadrant, index) => {
    setSWOTData(prev => ({
      ...prev,
      [quadrant]: prev?.[quadrant]?.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateSWOT = (quadrant, items) => {
    setSWOTData(prev => ({
      ...prev,
      [quadrant]: items
    }));
  };

  const handleReorderItems = (sourceQuadrant, sourceIndex, targetQuadrant, targetIndex) => {
    const sourceItems = [...swotData?.[sourceQuadrant]];
    const targetItems = sourceQuadrant === targetQuadrant ? sourceItems : [...swotData?.[targetQuadrant]];
    
    const [movedItem] = sourceItems?.splice(sourceIndex, 1);
    
    if (sourceQuadrant === targetQuadrant) {
      sourceItems?.splice(targetIndex, 0, movedItem);
      setSWOTData(prev => ({
        ...prev,
        [sourceQuadrant]: sourceItems
      }));
    } else {
      targetItems?.splice(targetIndex, 0, movedItem);
      setSWOTData(prev => ({
        ...prev,
        [sourceQuadrant]: sourceItems,
        [targetQuadrant]: targetItems
      }));
    }
  };

  const handleApplyTemplate = (template) => {
    if (template?.template) {
      setSWOTData(template?.template);
      setAnalysisTitle(template?.name + ' Analysis');
    }
  };

  const handleApplySuggestion = (suggestion) => {
    const quadrant = normalizeQuadrantKey(suggestion?.category || suggestion?.quadrant);
    const itemCategory =
      suggestion?.itemCategory ??
      suggestion?.swotItemCategory ??
      suggestion?.categoryLabel ??
      '';
    const content =
      suggestion?.content ??
      suggestion?.suggestion ??
      suggestion?.text ??
      suggestion?.area ??
      '';

    const trimmed = typeof content === 'string' ? content.trim() : String(content || '').trim();
    if (!quadrant || !trimmed) {
      console.warn('Invalid AI suggestion payload (cannot apply):', suggestion);
      return;
    }

    handleAddItem(quadrant, trimmed, itemCategory);
  };

  const refreshSavedAnalyses = async () => {
    setIsLoadingSaved(true);
    setLoadError('');
    try {
      const res = await listSavedAnalyses({ type: 'swot', subtype: 'swot_analysis' });
      const list = Array.isArray(res?.analyses) ? res.analyses : [];
      // Safety net: never show draft auto-saves in the "Load Analysis" list.
      setSavedAnalyses(list.filter((a) => a?.input?.subtype !== 'swot_items'));
    } catch (e) {
      const status = e?.response?.status;
      setLoadError(
        status === 401
          ? 'Please log in to load saved analyses.'
          : e?.response?.data?.error || e?.message || 'Failed to load saved analyses.'
      );
      setSavedAnalyses([]);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleSaveAnalysis = async (title) => {
    const trimmed = typeof title === 'string' ? title.trim() : '';
    if (!trimmed) {
      setSaveError('Please enter a title before saving.');
      return false;
    }

    setSaveError('');
    try {
      const createdByName = user?.fullname || '';
      const nextAi = aiResult && typeof aiResult === 'object'
        ? { ...aiResult, generatedAt: new Date().toISOString() }
        : null;
      const res = await saveAnalysisRecord({
        type: 'swot',
        title: trimmed,
        input: {
          subtype: 'swot_analysis',
          createdByName,
          swotData,
        },
        // Store AI results (if any) alongside the saved analysis.
        output: nextAi ? { swotAi: nextAi } : {},
        upsert: false,
      });
      if (res?.savedId) setLoadedAnalysisId(res.savedId);
      await refreshSavedAnalyses();
      return true;
    } catch (e) {
      const status = e?.response?.status;
      setSaveError(
        status === 401
          ? 'Please log in to save analyses.'
          : e?.response?.data?.error || e?.message || 'Failed to save analysis.'
      );
      return false;
    }
  };

  const handleUpdateLoadedAnalysis = async () => {
    if (!loadedAnalysisId) return false;
    const trimmed = typeof analysisTitle === 'string' ? analysisTitle.trim() : '';
    if (!trimmed) {
      setSaveError('Please enter a title before updating.');
      return false;
    }

    setSaveError('');
    try {
      const createdByName = user?.fullname || '';
      const nextOutput = {
        ...(loadedAnalysisOutput && typeof loadedAnalysisOutput === 'object' ? loadedAnalysisOutput : {}),
      };
      if (aiResult && typeof aiResult === 'object') {
        nextOutput.swotAi = { ...aiResult, generatedAt: new Date().toISOString() };
      }
      await updateSavedAnalysisById({
        id: loadedAnalysisId,
        title: trimmed,
        input: {
          subtype: 'swot_analysis',
          createdByName,
          swotData,
        },
        output: nextOutput,
      });
      setLoadedAnalysisOutput(nextOutput);
      await refreshSavedAnalyses();
      return true;
    } catch (e) {
      const status = e?.response?.status;
      setSaveError(
        status === 401
          ? 'Please log in to update analyses.'
          : e?.response?.data?.error || e?.message || 'Failed to update analysis.'
      );
      return false;
    }
  };

  const handleExportAnalysis = (format) => {
    const safeTitle = (typeof analysisTitle === 'string' ? analysisTitle.trim() : '') || 'SWOT Analysis';

    const getItemText = (item) => {
      if (typeof item === 'string') return item.trim();
      const t = item?.text;
      return typeof t === 'string' ? t.trim() : '';
    };

    const normalizeItems = (value) => {
      if (!Array.isArray(value)) return [];
      return value.map(getItemText).filter(Boolean);
    };

    const safeFileBase = (name) => {
      const raw = (typeof name === 'string' ? name : 'SWOT Analysis').trim() || 'SWOT Analysis';
      return raw
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_\-]+/g, '')
        .slice(0, 80) || 'SWOT_Analysis';
    };

    const downloadBlob = (blob, filename) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    };

    const exportSwotAsPdf = () => {
      const doc = new jsPDF('p', 'pt', 'a4');
      const pageWidth = 595;
      const pageHeight = 842;
      const marginX = 40;
      const maxWidth = pageWidth - marginX * 2;
      const bottomY = pageHeight - 40;

      const ensureSpace = (y, extra = 0) => {
        if (y + extra > bottomY) {
          doc.addPage();
          return 40;
        }
        return y;
      };

      const writeLines = (text, y, { fontSize = 11, style = 'normal', indent = 0, lineGap = 14 } = {}) => {
        const content = String(text ?? '').replace(/<[^>]+>/g, '').trim();
        if (!content) return y;
        doc.setFont('helvetica', style);
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(content, maxWidth - indent);
        for (const line of lines) {
          y = ensureSpace(y, lineGap);
          doc.text(line, marginX + indent, y);
          y += lineGap;
        }
        return y;
      };

      let y = 40;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('SWOT Analysis', marginX, y);
      y += 22;

      y = writeLines(`Title: ${safeTitle}`, y, { fontSize: 12, style: 'normal' });
      if (user?.fullname) {
        y = writeLines(`Created by: ${user.fullname}`, y, { fontSize: 11, style: 'normal' });
      }
      y = writeLines(`Exported: ${new Date().toLocaleString()}`, y, { fontSize: 10, style: 'normal', lineGap: 12 });
      y += 10;

      const sections = [
        { key: 'strengths', title: 'Strengths' },
        { key: 'weaknesses', title: 'Weaknesses' },
        { key: 'opportunities', title: 'Opportunities' },
        { key: 'threats', title: 'Threats' },
      ];

      sections.forEach((s) => {
        y = ensureSpace(y, 24);
        y = writeLines(s.title, y, { fontSize: 14, style: 'bold', lineGap: 18 });

        const items = normalizeItems(swotData?.[s.key]);
        if (!items.length) {
          y = writeLines('—', y, { fontSize: 11, style: 'normal', indent: 12, lineGap: 14 });
          y += 4;
          return;
        }

        items.forEach((t) => {
          y = writeLines(`• ${t}`, y, { fontSize: 11, style: 'normal', indent: 12, lineGap: 14 });
        });
        y += 6;
      });

      doc.save(`${safeFileBase(safeTitle)}.pdf`);
    };

    const exportSwotAsPng = async () => {
      const strengths = normalizeItems(swotData?.strengths);
      const weaknesses = normalizeItems(swotData?.weaknesses);
      const opportunities = normalizeItems(swotData?.opportunities);
      const threats = normalizeItems(swotData?.threats);

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.width = '1100px';
      container.style.padding = '24px';
      container.style.background = '#ffffff';
      container.style.color = '#111827';
      container.style.fontFamily = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';

      const titleEl = document.createElement('div');
      titleEl.innerHTML = `
        <div style="font-size:22px;font-weight:700;margin-bottom:6px;">SWOT Analysis</div>
        <div style="font-size:14px;opacity:0.8;margin-bottom:14px;">${safeTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      `;
      container.appendChild(titleEl);

      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = '1fr 1fr';
      grid.style.gap = '16px';

      const makeCard = (heading, items, accent) => {
        const card = document.createElement('div');
        card.style.border = '1px solid #e5e7eb';
        card.style.borderRadius = '12px';
        card.style.overflow = 'hidden';

        const header = document.createElement('div');
        header.style.background = accent;
        header.style.color = '#ffffff';
        header.style.padding = '10px 12px';
        header.style.fontWeight = '700';
        header.style.fontSize = '14px';
        header.textContent = heading;

        const body = document.createElement('div');
        body.style.padding = '12px';
        body.style.minHeight = '180px';
        body.style.fontSize = '13px';

        if (!items.length) {
          const empty = document.createElement('div');
          empty.style.opacity = '0.6';
          empty.textContent = '—';
          body.appendChild(empty);
        } else {
          const ul = document.createElement('ul');
          ul.style.margin = '0';
          ul.style.paddingLeft = '18px';
          ul.style.display = 'flex';
          ul.style.flexDirection = 'column';
          ul.style.gap = '6px';
          items.forEach((t) => {
            const li = document.createElement('li');
            li.textContent = t;
            ul.appendChild(li);
          });
          body.appendChild(ul);
        }

        card.appendChild(header);
        card.appendChild(body);
        return card;
      };

      grid.appendChild(makeCard('Strengths', strengths, '#16a34a'));
      grid.appendChild(makeCard('Weaknesses', weaknesses, '#f59e0b'));
      grid.appendChild(makeCard('Opportunities', opportunities, '#2563eb'));
      grid.appendChild(makeCard('Threats', threats, '#dc2626'));

      container.appendChild(grid);
      document.body.appendChild(container);

      try {
        const canvas = await html2canvas(container, {
          backgroundColor: '#ffffff',
          scale: 2,
        });

        const blob = await new Promise((resolve) => {
          if (canvas.toBlob) {
            canvas.toBlob((b) => resolve(b), 'image/png');
          } else {
            const dataUrl = canvas.toDataURL('image/png');
            const byteString = atob(dataUrl.split(',')[1]);
            const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            resolve(new Blob([ab], { type: mimeString }));
          }
        });

        if (!blob) throw new Error('Failed to generate image.');
        downloadBlob(blob, `${safeFileBase(safeTitle)}.png`);
      } finally {
        container.remove();
      }
    };

    if (format === 'pdf') {
      exportSwotAsPdf();
      return;
    }
    if (format === 'image') {
      return exportSwotAsPng();
    }

    // Excel was removed from the UI; keep this for safety if anything still calls it.
    throw new Error('Unsupported export format.');
  };

  const handleLoadAnalysis = async (analysis) => {
    setLoadError('');
    try {
      const id = analysis?._id || analysis?.id;
      if (!id) return;
      const res = await getSavedAnalysisById({ id });
      const doc = res?.analysis;
      const nextTitle = doc?.title || '';
      const nextSwot = doc?.input?.swotData;
      if (nextSwot && typeof nextSwot === 'object') {
        setSWOTData(normalizeSwotQuadrants(nextSwot));
      }
      setAnalysisTitle(nextTitle);
      setLoadedAnalysisId(doc?._id || id);

      const output = doc?.output && typeof doc.output === 'object' ? doc.output : {};
      setLoadedAnalysisOutput(output);

      const savedAi = output?.swotAi && typeof output.swotAi === 'object'
        ? output.swotAi
        : null;
      if (savedAi) {
        setAiResult({
          insights: Array.isArray(savedAi?.insights) ? savedAi.insights : [],
          connections: Array.isArray(savedAi?.connections) ? savedAi.connections : [],
          blindSpots: Array.isArray(savedAi?.blindSpots) ? savedAi.blindSpots : [],
        });
      } else {
        setAiResult(null);
      }
      setAiPersistError('');
    } catch (e) {
      const status = e?.response?.status;
      setLoadError(
        status === 401
          ? 'Please log in to load analyses.'
          : e?.response?.data?.error || e?.message || 'Failed to load analysis.'
      );
    }
  };

  const handleAiResultUpdated = async (result, options = {}) => {
    setAiResult(result);
    setAiPersistError('');

    if (options?.alreadyPersisted) {
      // Backend already saved it; keep local state in sync only.
      return;
    }

    // Persist AI results only when a saved analysis is loaded.
    if (!loadedAnalysisId) {
      setAiPersistError('Load an analysis to save AI results.');
      return;
    }

    try {
      const nextOutput = {
        ...(loadedAnalysisOutput && typeof loadedAnalysisOutput === 'object' ? loadedAnalysisOutput : {}),
        swotAi: { ...(result && typeof result === 'object' ? result : {}), generatedAt: new Date().toISOString() },
      };

      await updateSavedAnalysisById({
        id: loadedAnalysisId,
        output: nextOutput,
      });

      setLoadedAnalysisOutput(nextOutput);
    } catch (e) {
      const status = e?.response?.status;
      setAiPersistError(
        status === 401
          ? 'Please log in to save AI results.'
          : e?.response?.data?.error || e?.message || 'Failed to save AI results.'
      );
    }
  };



  const quadrantTabs = [
    { key: 'strengths', label: 'Strengths', icon: 'TrendingUp', color: 'text-success' },
    { key: 'weaknesses', label: 'Weaknesses', icon: 'TrendingDown', color: 'text-warning' },
    { key: 'opportunities', label: 'Opportunities', icon: 'Target', color: 'text-primary' },
    { key: 'threats', label: 'Threats', icon: 'AlertTriangle', color: 'text-error' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        {/* Breadcrumb */}
        <div className="bg-muted/30 border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <nav className="flex items-center space-x-2 text-sm">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-smooth">
                Home
              </Link>
              <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
              <span className="text-foreground font-medium">SWOT Analysis Tool</span>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">SWOT Analysis Tool</h1>
                <p className="text-muted-foreground">
                  Conduct comprehensive strategic assessments with AI-powered insights and recommendations
                </p>
              </div>           
            </div>

            {/* Template Selector */}
            <TemplateSelector
              selectedTemplate={selectedTemplate}
              onTemplateChange={setSelectedTemplate}
              onApplyTemplate={handleApplyTemplate}
            />
          </div>

          {/* Analysis Actions */}
          <div className="mb-6">
            <AnalysisActions
              swotData={swotData}
              analysisTitle={analysisTitle}
              onTitleChange={setAnalysisTitle}
              onSaveAnalysis={handleSaveAnalysis}
              onExportAnalysis={handleExportAnalysis}
              onLoadAnalysis={handleLoadAnalysis}
              savedAnalyses={savedAnalyses}
              isLoadingSaved={isLoadingSaved}
              saveError={saveError}
              loadError={loadError}
                onRefreshSaved={refreshSavedAnalyses}
                onUpdateLoadedAnalysis={handleUpdateLoadedAnalysis}
                loadedAnalysisId={loadedAnalysisId}
            />
          </div>


          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
            {/* Desktop Layout */}
            {!isMobile ? (
              <>
                {/* Main Analysis Area */}
                 <div className="min-h-0 lg:col-span-3">  
                      <SWOTMatrix
                        swotData={swotData}
                        onUpdateSWOT={handleUpdateSWOT}
                        onAddItem={handleAddItem}
                        onRemoveItem={handleRemoveItem}
                        onReorderItems={handleReorderItems}
                      />
                </div>
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <AIInsightsSidebar
                      swotData={swotData}
                      selectedTemplate={selectedTemplate}
                      onApplySuggestion={handleApplySuggestion}
                      initialAiResult={aiResult}
                      onAiResultUpdated={handleAiResultUpdated}
                      loadedAnalysisId={loadedAnalysisId}
                      persistError={aiPersistError}
                    />
                </div>
              </>
            ) : (
              /* Mobile Layout */
              (<div className="lg:col-span-4">
                  <div className="space-y-6">
                    {/* Mobile Quadrant Tabs */}
                    <div className="flex flex-wrap gap-2 bg-muted p-2 rounded-lg">
                      {quadrantTabs?.map((tab) => (
                        <button
                          key={tab?.key}
                          onClick={() => setMobileActiveQuadrant(tab?.key)}
                          className={`className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-smooth" ${
                            mobileActiveQuadrant === tab?.key
                              ? 'bg-card text-foreground shadow-soft'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Icon name={tab?.icon} size={16} className={tab?.color} />
                          <span>{tab?.label}</span>
                          <span className="ml-1 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                            {swotData?.[tab?.key]?.length || 0}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Mobile Single Quadrant View */}
                    <div className="bg-card border border-border rounded-lg p-6 min-h-[400px]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground capitalize">
                          {mobileActiveQuadrant}
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const text = prompt(`Add new ${mobileActiveQuadrant?.slice(0, -1)}:`);
                            if (!text) return;
                            const category = prompt('Category (e.g., Technology):', 'General');
                            handleAddItem(mobileActiveQuadrant, text, category || 'General');
                          }}
                        >
                          <Icon name="Plus" size={16} className="mr-1" />
                          Add Item
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {swotData?.[mobileActiveQuadrant]?.length > 0 ? (
                          swotData?.[mobileActiveQuadrant]?.map((item, index) => (
                            <div key={item?.id} className="bg-muted/50 rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <p className="text-sm text-foreground flex-1">{item?.text}</p>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveItem(mobileActiveQuadrant, index)}
                                  className="h-8 w-8 text-error hover:text-error"
                                >
                                  <Icon name="Trash2" size={14} />
                                </Button>
                              </div>
                              <span className="inline-block mt-2 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                                {(typeof item?.category === 'string' && item.category.trim()) ? item.category.trim() : 'General'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <Icon name="Plus" size={32} className="text-muted-foreground mb-3 mx-auto" />
                            <p className="text-sm text-muted-foreground">
                              No {mobileActiveQuadrant} added yet
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <AIInsightsSidebar
                          swotData={swotData}
                          selectedTemplate={selectedTemplate}
                          onApplySuggestion={handleApplySuggestion}
                          initialAiResult={aiResult}
                          onAiResultUpdated={handleAiResultUpdated}
                          loadedAnalysisId={loadedAnalysisId}
                          persistError={aiPersistError}
                        />
                  </div>

              </div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SWOTAnalysisTool;