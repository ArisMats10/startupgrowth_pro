import React, { useRef, useEffect, useState } from 'react';
import Icon from '../../../components/AppIcon';

const ContentEditor = ({
  selectedSection,
  content,
  onContentChange,
  sectionTitle,
}) => {
  const [wordCount, setWordCount] = useState(0);
  const textareaRef = useRef(null);

  // Calculate word count
  useEffect(() => {
    const words = content?.trim()?.split(/\s+/)?.filter(word => word?.length > 0)?.length || 0;
    setWordCount(words);
  }, [content]);

  if (!selectedSection) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="text-center">
          <Icon name="FileText" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Business Plan Editor</h3>
          <p className="text-muted-foreground">
            Select a section from the outline to start writing your business plan
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-card rounded-lg border border-border relative">
      {/* Editor Header */}
      <div className="p-3 md:p-4 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              {sectionTitle || selectedSection}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {wordCount} words
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 md:p-4 overflow-y-auto">
        <textarea
          ref={textareaRef}
          value={content || ''}
          onChange={(e) => onContentChange?.(selectedSection, e?.target?.value)}
          placeholder={`Start writing your ${sectionTitle || selectedSection}...

Some key points to consider:
• Be specific and detailed
• Use data to support your claims
• Keep your target audience in mind
• Focus on your unique value proposition`}
          className="w-full border-0 outline-0 bg-transparent text-foreground placeholder:text-muted-foreground text-sm leading-relaxed resize-y min-h-[60vh]"
        />
      </div>

      <div className="p-3 md:p-4 border-t border-border bg-muted/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between text-xs md:text-sm text-muted-foreground gap-2">
          <div className="flex items-center gap-3">
            <span>{wordCount} words</span>
            <span className="hidden md:inline">•</span>
            <span>Auto-saved</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="Sparkles" size={12} />
            <span>AI-powered assistance available</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentEditor;