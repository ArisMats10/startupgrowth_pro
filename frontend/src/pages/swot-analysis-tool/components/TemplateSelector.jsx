import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const TemplateSelector = ({ selectedTemplate, onTemplateChange, onApplyTemplate }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const industryTemplates = [
    {
      id: 'custom',
      name: 'Custom Analysis',
      industry: 'General',
      description: 'Start with a blank SWOT matrix',
      icon: 'Edit3',
      color: 'bg-muted'
    },
    {
      id: 'saas',
      name: 'SaaS Startup',
      industry: 'Technology',
      description: 'Software as a Service business model',
      icon: 'Cloud',
      color: 'bg-primary/10',
      template: {
        strengths: [
          { id: 1, text: 'Scalable business model with recurring revenue', category: 'Business Model' },
          { id: 2, text: 'Low marginal cost per additional customer', category: 'Economics' },
          { id: 3, text: 'Strong technical team and development capabilities', category: 'Team' },
          { id: 4, text: 'Cloud-based infrastructure for global reach', category: 'Technology' }
        ],
        weaknesses: [
          { id: 1, text: 'High customer acquisition costs', category: 'Marketing' },
          { id: 2, text: 'Limited brand recognition in competitive market', category: 'Brand' },
          { id: 3, text: 'Dependency on third-party integrations', category: 'Technology' },
          { id: 4, text: 'Cash flow challenges during growth phase', category: 'Finance' }
        ],
        opportunities: [
          { id: 1, text: 'Growing demand for digital transformation', category: 'Market' },
          { id: 2, text: 'Expansion into international markets', category: 'Growth' },
          { id: 3, text: 'AI and automation integration possibilities', category: 'Technology' },
          { id: 4, text: 'Strategic partnerships with larger enterprises', category: 'Partnerships' }
        ],
        threats: [
          { id: 1, text: 'Intense competition from established players', category: 'Competition' },
          { id: 2, text: 'Economic downturn affecting B2B spending', category: 'Economic' },
          { id: 3, text: 'Data privacy regulations and compliance costs', category: 'Regulatory' },
          { id: 4, text: 'Rapid technology changes requiring constant updates', category: 'Technology' }
        ]
      }
    },
    {
      id: 'ecommerce',
      name: 'E-commerce Business',
      industry: 'Retail',
      description: 'Online retail and marketplace business',
      icon: 'ShoppingCart',
      color: 'bg-success/10',
      template: {
        strengths: [
          { id: 1, text: '24/7 availability and global market reach', category: 'Operations' },
          { id: 2, text: 'Lower overhead costs than physical stores', category: 'Economics' },
          { id: 3, text: 'Data-driven customer insights and analytics', category: 'Analytics' },
          { id: 4, text: 'Flexible inventory management systems', category: 'Operations' }
        ],
        weaknesses: [
          { id: 1, text: 'High shipping and logistics costs', category: 'Operations' },
          { id: 2, text: 'Customer service challenges at scale', category: 'Service' },
          { id: 3, text: 'Difficulty in building customer trust online', category: 'Trust' },
          { id: 4, text: 'Dependency on digital marketing channels', category: 'Marketing' }
        ],
        opportunities: [
          { id: 1, text: 'Mobile commerce growth and app development', category: 'Technology' },
          { id: 2, text: 'Social commerce and influencer partnerships', category: 'Marketing' },
          { id: 3, text: 'Subscription and membership models', category: 'Business Model' },
          { id: 4, text: 'International expansion opportunities', category: 'Growth' }
        ],
        threats: [
          { id: 1, text: 'Intense price competition and margin pressure', category: 'Competition' },
          { id: 2, text: 'Platform dependency risks (Amazon, Google)', category: 'Platform' },
          { id: 3, text: 'Cybersecurity threats and data breaches', category: 'Security' },
          { id: 4, text: 'Supply chain disruptions and delays', category: 'Supply Chain' }
        ]
      }
    },
    {
      id: 'fintech',
      name: 'FinTech Startup',
      industry: 'Financial Services',
      description: 'Financial technology and services',
      icon: 'CreditCard',
      color: 'bg-accent/10',
      template: {
        strengths: [
          { id: 1, text: 'Innovative technology and user experience', category: 'Technology' },
          { id: 2, text: 'Lower operational costs than traditional banks', category: 'Economics' },
          { id: 3, text: 'Agile development and faster time-to-market', category: 'Operations' },
          { id: 4, text: 'Strong data analytics and AI capabilities', category: 'Technology' }
        ],
        weaknesses: [
          { id: 1, text: 'Limited financial resources for compliance', category: 'Finance' },
          { id: 2, text: 'Lack of established customer trust', category: 'Trust' },
          { id: 3, text: 'Regulatory uncertainty and compliance costs', category: 'Regulatory' },
          { id: 4, text: 'Difficulty in customer acquisition', category: 'Marketing' }
        ],
        opportunities: [
          { id: 1, text: 'Underserved market segments and demographics', category: 'Market' },
          { id: 2, text: 'Open banking and API integration opportunities', category: 'Technology' },
          { id: 3, text: 'Cryptocurrency and blockchain adoption', category: 'Technology' },
          { id: 4, text: 'Partnership opportunities with traditional banks', category: 'Partnerships' }
        ],
        threats: [
          { id: 1, text: 'Regulatory changes and compliance requirements', category: 'Regulatory' },
          { id: 2, text: 'Competition from big tech companies', category: 'Competition' },
          { id: 3, text: 'Economic instability affecting financial markets', category: 'Economic' },
          { id: 4, text: 'Cybersecurity risks and fraud concerns', category: 'Security' }
        ]
      }
    },
    {
      id: 'healthtech',
      name: 'HealthTech Startup',
      industry: 'Healthcare',
      description: 'Digital health and medical technology',
      icon: 'Heart',
      color: 'bg-error/10',
      template: {
        strengths: [
          { id: 1, text: 'Addressing critical healthcare needs', category: 'Market Need' },
          { id: 2, text: 'Strong clinical and technical expertise', category: 'Team' },
          { id: 3, text: 'Potential for significant social impact', category: 'Impact' },
          { id: 4, text: 'Growing digital health market demand', category: 'Market' }
        ],
        weaknesses: [
          { id: 1, text: 'Complex regulatory approval processes', category: 'Regulatory' },
          { id: 2, text: 'Long sales cycles with healthcare institutions', category: 'Sales' },
          { id: 3, text: 'High development and validation costs', category: 'Finance' },
          { id: 4, text: 'Limited healthcare industry connections', category: 'Network' }
        ],
        opportunities: [
          { id: 1, text: 'Telemedicine and remote care growth', category: 'Technology' },
          { id: 2, text: 'AI and machine learning in diagnostics', category: 'Technology' },
          { id: 3, text: 'Government healthcare digitization initiatives', category: 'Policy' },
          { id: 4, text: 'Aging population increasing healthcare needs', category: 'Demographics' }
        ],
        threats: [
          { id: 1, text: 'Strict healthcare regulations and compliance', category: 'Regulatory' },
          { id: 2, text: 'Data privacy and security requirements', category: 'Security' },
          { id: 3, text: 'Resistance to change in healthcare industry', category: 'Adoption' },
          { id: 4, text: 'Competition from established healthcare companies', category: 'Competition' }
        ]
      }
    }
  ];

  const templateOptions = industryTemplates?.map(template => ({
    value: template?.id,
    label: template?.name,
    description: template?.industry
  }));

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleApplyTemplate = (template) => {
    onApplyTemplate(template);
    setIsPreviewOpen(false);
  };

  const selectedTemplateData = industryTemplates?.find(t => t?.id === selectedTemplate);

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Select
            label="Industry Template"
            description="Choose a pre-built template or start custom"
            options={templateOptions}
            value={selectedTemplate}
            onChange={onTemplateChange}
            searchable
          />
        </div>
        {selectedTemplate !== 'custom' && selectedTemplateData && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreview(selectedTemplateData)}
            >
              <Icon name="Eye" size={14} className="mr-1" />
              Preview
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => handleApplyTemplate(selectedTemplateData)}
            >
              <Icon name="Download" size={14} className="mr-1" />
              Apply Template
            </Button>
          </div>
        )}
      </div>
      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {industryTemplates?.slice(1)?.map((template) => (
          <div
            key={template?.id}
            className={`${template?.color} border border-border rounded-lg p-4 cursor-pointer hover:shadow-soft transition-smooth ${
              selectedTemplate === template?.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onTemplateChange(template?.id)}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center">
                <Icon name={template?.icon} size={20} className="text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground text-sm">{template?.name}</h4>
                <p className="text-xs text-muted-foreground">{template?.industry}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{template?.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {template?.template ? Object.values(template?.template)?.flat()?.length : 0} items
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e?.stopPropagation();
                  handlePreview(template);
                }}
                className="text-xs"
              >
                Preview
              </Button>
            </div>
          </div>
        ))}
      </div>
      {/* Template Preview Modal */}
      {isPreviewOpen && previewTemplate && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-soft z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-modal max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon name={previewTemplate?.icon} size={24} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{previewTemplate?.name}</h3>
                    <p className="text-sm text-muted-foreground">{previewTemplate?.description}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  <Icon name="X" size={20} />
                </Button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {previewTemplate?.template && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(previewTemplate?.template)?.map(([quadrant, items]) => (
                    <div key={quadrant} className="space-y-3">
                      <h4 className="font-medium text-foreground capitalize flex items-center">
                        <Icon 
                          name={
                            quadrant === 'strengths' ? 'TrendingUp' :
                            quadrant === 'weaknesses' ? 'TrendingDown' :
                            quadrant === 'opportunities' ? 'Target' : 'AlertTriangle'
                          } 
                          size={16} 
                          className="mr-2" 
                        />
                        {quadrant} ({items?.length} items)
                      </h4>
                      <div className="space-y-2">
                        {items?.map((item) => (
                          <div key={item?.id} className="bg-muted/50 rounded-lg p-3">
                            <p className="text-sm text-foreground">{item?.text}</p>
                            {item?.category && (
                              <span className="inline-block mt-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                                {item?.category}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex items-center justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsPreviewOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={() => handleApplyTemplate(previewTemplate)}
              >
                <Icon name="Download" size={16} className="mr-2" />
                Apply Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;