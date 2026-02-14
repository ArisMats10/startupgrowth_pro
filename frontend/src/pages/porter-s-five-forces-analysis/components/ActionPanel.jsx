import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const ActionPanel = ({ 
  onSave, 
  onExport, 
  onShare, 
  onLoadTemplate,
  analysisData,
  isSaving = false 
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [analysisName, setAnalysisName] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  const exportFormats = [
    { value: 'pdf', label: 'PDF Report', icon: 'FileText' },
    { value: 'excel', label: 'Excel Spreadsheet', icon: 'FileSpreadsheet' },
    { value: 'powerpoint', label: 'PowerPoint Presentation', icon: 'Presentation' },
    { value: 'json', label: 'JSON Data', icon: 'Code' }
  ];

  const templates = [
    { value: 'startup-tech', label: 'Tech Startup Template' },
    { value: 'retail-business', label: 'Retail Business Template' },
    { value: 'saas-company', label: 'SaaS Company Template' },
    { value: 'manufacturing', label: 'Manufacturing Template' },
    { value: 'consulting', label: 'Consulting Services Template' }
  ];

  const handleSave = () => {
    if (analysisName?.trim()) {
      onSave(analysisName);
      setShowSaveDialog(false);
      setAnalysisName('');
    }
  };

  const handleShare = () => {
    if (shareEmail?.trim()) {
      onShare({ email: shareEmail, message: shareMessage });
      setShowShareDialog(false);
      setShareEmail('');
      setShareMessage('');
    }
  };

  const handleExport = (format) => {
    onExport(format);
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon name="Zap" size={16} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button
            variant="default"
            onClick={() => setShowSaveDialog(true)}
            iconName="Save"
            iconPosition="left"
            loading={isSaving}
            fullWidth
          >
            Save Analysis
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowShareDialog(true)}
            iconName="Share"
            iconPosition="left"
            fullWidth
          >
            Share with Team
          </Button>

          <Button
            variant="outline"
            onClick={() => handleExport('pdf')}
            iconName="Download"
            iconPosition="left"
            fullWidth
          >
            Export Report
          </Button>
        </div>
      </div>
      {/* Export Options */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <Icon name="Download" size={16} className="text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Export Options</h3>
        </div>

        <div className="space-y-3">
          {exportFormats?.map((format) => (
            <button
              key={format?.value}
              onClick={() => handleExport(format?.value)}
              className="w-full flex items-center space-x-3 p-3 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors group"
            >
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Icon name={format?.icon} size={16} className="text-muted-foreground group-hover:text-primary" />
              </div>
              <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                {format?.label}
              </span>
              <Icon name="ArrowRight" size={16} className="ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </div>
      {/* Load Template */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon name="FileTemplate" size={16} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Load Template</h3>
        </div>

        <Select
          options={templates}
          placeholder="Choose a template..."
          onChange={(value) => onLoadTemplate(value)}
          className="mb-3"
        />

        <p className="text-sm text-muted-foreground">
          Templates provide pre-filled industry-specific factors and benchmarks to accelerate your analysis.
        </p>
      </div>
      {/* Analysis Progress */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Icon name="TrendingUp" size={16} className="text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-purple-900">Analysis Progress</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-purple-800">Completion Status</span>
            <span className="text-sm text-purple-700">
              {analysisData ? Math.round((analysisData?.completedForces / 5) * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ 
                width: `${analysisData ? (analysisData?.completedForces / 5) * 100 : 0}%` 
              }}
            />
          </div>
          <div className="text-xs text-purple-700">
            {analysisData ? analysisData?.completedForces : 0} of 5 forces analyzed
          </div>
        </div>
      </div>
      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="Save" size={16} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Save Analysis</h3>
            </div>

            <div className="space-y-4">
              <Input
                label="Analysis Name"
                type="text"
                placeholder="Enter a name for this analysis..."
                value={analysisName}
                onChange={(e) => setAnalysisName(e?.target?.value)}
                required
              />

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleSave}
                  disabled={!analysisName?.trim()}
                  fullWidth
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="Share" size={16} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Share Analysis</h3>
            </div>

            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="colleague@company.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e?.target?.value)}
                required
              />

              <Input
                label="Message (Optional)"
                type="textarea"
                placeholder="Add a personal message..."
                value={shareMessage}
                onChange={(e) => setShareMessage(e?.target?.value)}
                rows={3}
              />

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowShareDialog(false)}
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleShare}
                  disabled={!shareEmail?.trim()}
                  fullWidth
                >
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionPanel;