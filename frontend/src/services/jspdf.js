import jsPDF from 'jspdf';

/**
 * Exports the business plan as a PDF, combining all sections and subsections.
 * @param {Array} sections - The outline sections (with subsections)
 * @param {Object} businessPlanData - The content keyed by section/subsection id
 * @param {string} [filename='BusinessPlan.pdf'] - The filename for the PDF
 */
export function exportBusinessPlanAsPDF(sections, businessPlanData, filename = 'BusinessPlan.pdf') {
  const doc = new jsPDF('p', 'pt', 'a4');
  let y = 40;

  sections.forEach(section => {
    const includeContent = section?.includeContent !== undefined ? Boolean(section.includeContent) : true;
    const subsections = Array.isArray(section?.subsections) ? section.subsections : [];
    const includeAnything = includeContent || subsections.length > 0;
    if (!includeAnything) return;

    // Section Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, 40, y);
    y += 24;

    // Section Content
    if (includeContent) {
      const content = businessPlanData?.[section.id]?.content
        ? businessPlanData[section.id].content.replace(/<[^>]+>/g, '') // Remove HTML tags
        : '';

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const splitContent = doc.splitTextToSize(content, 500);
      splitContent.forEach(line => {
        if (y > 780) { // New page if needed
          doc.addPage();
          y = 40;
        }
        doc.text(line, 40, y);
        y += 18;
      });
    }

    // Subsections
    if (subsections.length) {
      subsections.forEach(sub => {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        if (y > 780) {
          doc.addPage();
          y = 40;
        }
        doc.text(sub.title, 60, y);
        y += 20;

        const subContent = businessPlanData?.[sub.id]?.content
          ? businessPlanData[sub.id].content.replace(/<[^>]+>/g, '')
          : '';
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const splitSubContent = doc.splitTextToSize(subContent, 480);
        splitSubContent.forEach(line => {
          if (y > 780) {
            doc.addPage();
            y = 40;
          }
          doc.text(line, 60, y);
          y += 18;
        });
      });
    }

    y += 24;
  });

  doc.save(filename);
}

/**
 * Exports Porter's Five Forces analysis as a PDF.
 * @param {Object} data
 * @param {string} data.industry
 * @param {Array} data.forces
 * @param {number} data.overallScore
 * @param {Object|null} data.aiIndustryAnalysis
 * @param {string} [filename='Porters_Five_Forces.pdf']
 */
export function exportPortersFiveForcesAsPDF(
  {
    analysisTitle = '',
    industry = '',
    forces = [],
    overallScore = 0,
    aiIndustryAnalysis = null,
    createdBy = '',
  } = {},
  filename = 'Porters_Five_Forces.pdf'
) {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 40;
  const maxWidth = pageWidth - marginX * 2;
  const bottomY = pageHeight - 40;

  const safeText = (value) => String(value ?? '').replace(/<[^>]+>/g, '').trim();

  const ensureSpace = (y, extra = 0) => {
    if (y + extra > bottomY) {
      doc.addPage();
      return 40;
    }
    return y;
  };

  const writeBlock = (text, y, { fontSize = 12, style = 'normal', indent = 0, lineGap = 14 } = {}) => {
    const content = safeText(text);
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

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text("Porter's Five Forces Analysis", marginX, y);
  y += 22;

  // Meta
  if (analysisTitle) {
    y = writeBlock(`Analysis name: ${analysisTitle}`, y, { fontSize: 12, style: 'normal' });
  }
  if (createdBy) {
    y = writeBlock(`Created by: ${createdBy}`, y, { fontSize: 12, style: 'normal' });
  }
  y = writeBlock(`Industry: ${industry || '—'}`, y, { fontSize: 12, style: 'normal' });
  y = writeBlock(`Overall score: ${Number.isFinite(overallScore) ? overallScore.toFixed(2) : '—'} / 5`, y, {
    fontSize: 12,
    style: 'normal',
  });
  y = writeBlock(`Generated: ${new Date().toLocaleString()}`, y, { fontSize: 10, style: 'normal', lineGap: 12 });
  y += 8;

  // Forces
  y = writeBlock('Forces', y, { fontSize: 14, style: 'bold', lineGap: 18 });

  (forces || []).forEach((force) => {
    const name = safeText(force?.name || force?.id || 'Force');
    const score = typeof force?.score === 'number' ? force.score : Number(force?.score);
    const scoreText = Number.isFinite(score) ? `${score}/5` : '—/5';

    y = ensureSpace(y, 22);
    y = writeBlock(`${name} (${scoreText})`, y, { fontSize: 12, style: 'bold', lineGap: 16 });

    const comments = safeText(force?.comments);
    if (comments) {
      y = writeBlock(`Notes: ${comments}`, y, { fontSize: 11, style: 'normal', indent: 12, lineGap: 14 });
    }

    const criteria = Array.isArray(force?.criteria) ? force.criteria : [];
    if (criteria.length) {
      criteria.forEach((c) => {
        const q = safeText(c?.question || 'Criterion');
        const cs = typeof c?.score === 'number' ? c.score : Number(c?.score);
        const csText = Number.isFinite(cs) ? `${cs}/5` : '—/5';
        y = writeBlock(`• ${q}: ${csText}`, y, { fontSize: 10, style: 'normal', indent: 20, lineGap: 12 });
      });
    }

    y += 6;
  });

  // AI Summary (optional)
  if (aiIndustryAnalysis) {
    y = ensureSpace(y, 26);
    y = writeBlock('AI Industry Analysis', y, { fontSize: 14, style: 'bold', lineGap: 18 });

    const oa = aiIndustryAnalysis?.overallAssessment;
    if (oa) {
      y = writeBlock(`Competitive intensity: ${oa?.competitiveIntensity || '—'}`, y, { fontSize: 11, indent: 12 });
      y = writeBlock(`Market attractiveness: ${oa?.marketAttractiveness || '—'}`, y, { fontSize: 11, indent: 12 });
      y = writeBlock(`Strategic position: ${oa?.strategicPosition || '—'}`, y, { fontSize: 11, indent: 12 });

      const takeaways = Array.isArray(oa?.keyTakeaways) ? oa.keyTakeaways : [];
      if (takeaways.length) {
        y += 4;
        y = writeBlock('Key takeaways:', y, { fontSize: 11, style: 'bold', indent: 12, lineGap: 14 });
        takeaways.forEach((t) => {
          y = writeBlock(`• ${t}`, y, { fontSize: 10, indent: 20, lineGap: 12 });
        });
      }
    }

    const recs = Array.isArray(aiIndustryAnalysis?.recommendations)
      ? aiIndustryAnalysis.recommendations
      : [];
    if (recs.length) {
      y += 6;
      y = writeBlock('Recommendations:', y, { fontSize: 11, style: 'bold', indent: 12, lineGap: 14 });
      recs.slice(0, 8).forEach((r) => {
        const title = safeText(r?.title || 'Recommendation');
        const desc = safeText(r?.description);
        y = writeBlock(`• ${title}${desc ? ` — ${desc}` : ''}`, y, { fontSize: 10, indent: 20, lineGap: 12 });
      });
    }
  }

  doc.save(filename);
}

