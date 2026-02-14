import React from 'react';
import Icon from '../../../components/AppIcon';
import Select from '../../../components/ui/Select';

const IndustrySelector = ({ selectedIndustry, onIndustryChange, onTemplateLoad }) => {
  const industries = [
    { 
      value: 'saas', 
      label: 'Software as a Service (SaaS)',
      description: 'Cloud-based software solutions'
    },
    { 
      value: 'ecommerce', 
      label: 'E-commerce & Retail',
      description: 'Online and offline retail businesses'
    },
    { 
      value: 'fintech', 
      label: 'Financial Technology',
      description: 'Digital financial services and solutions'
    },
    { 
      value: 'healthcare', 
      label: 'Healthcare & MedTech',
      description: 'Medical technology and healthcare services'
    },
    { 
      value: 'manufacturing', 
      label: 'Manufacturing',
      description: 'Production and industrial businesses'
    },
    { 
      value: 'consulting', 
      label: 'Professional Services',
      description: 'Consulting and professional services'
    },
    { 
      value: 'food', 
      label: 'Food & Beverage',
      description: 'Restaurant and food industry'
    },
    { 
      value: 'education', 
      label: 'Education & EdTech',
      description: 'Educational technology and services'
    },
    { 
      value: 'real-estate', 
      label: 'Real Estate & PropTech',
      description: 'Property and real estate technology'
    },
    { 
      value: 'custom', 
      label: 'Custom Industry',
      description: 'Define your own industry parameters'
    }
  ];


  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon name="Building" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Industry Selection</h2>
          <p className="text-sm text-muted-foreground">Choose your industry for customized analysis</p>
        </div>
      </div>
      <div className="space-y-6">
        {/* Industry Selection */}
        <div>
          <Select
            label="Select Industry"
            description="Choose the industry that best matches your business"
            options={industries}
            value={selectedIndustry}
            onChange={onIndustryChange}
            searchable
            placeholder="Search or select an industry..."
          />
        </div>

        {/* Industry Insights */}
        {selectedIndustry && selectedIndustry !== 'custom' && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="Lightbulb" size={16} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-2">Industry Insights</h4>
                <p className="text-sm text-blue-800 mb-3">
                  {selectedIndustry === 'saas' && 
                    "SaaS businesses typically face high competitive rivalry due to low switching costs and rapid innovation cycles. Focus on customer retention and differentiation through features and integrations."
                  }
                  {selectedIndustry === 'ecommerce' && 
                    "E-commerce markets often have low barriers to entry but high buyer power due to price transparency. Consider logistics, brand building, and customer experience as key differentiators."
                  }
                  {selectedIndustry === 'fintech' && 
                    "Financial technology faces significant regulatory barriers and high customer acquisition costs. Trust, security, and compliance are critical success factors."
                  }
                  {selectedIndustry === 'healthcare' && 
                    "Healthcare markets have high barriers to entry due to regulations but also high switching costs. Focus on compliance, efficacy, and integration with existing systems."
                  }
                  {selectedIndustry === 'manufacturing' && 
                    "Manufacturing industries often have high supplier power due to specialized materials and equipment. Consider vertical integration and supplier relationship management."
                  }
                  {selectedIndustry === 'consulting' && 
                    "Professional services face low barriers to entry but high differentiation through expertise and relationships. Personal branding and thought leadership are crucial."
                  }
                  {selectedIndustry === 'food' && 
                    "Food & beverage markets have moderate barriers to entry but high competitive rivalry. Location, quality, and brand positioning are key competitive factors."
                  }
                  {selectedIndustry === 'education' && 
                    "Education markets are increasingly digital with growing competitive rivalry. Focus on learning outcomes, user experience, and institutional partnerships."
                  }
                  {selectedIndustry === 'real-estate' && 
                    "Real estate markets have high barriers to entry due to capital requirements but also high potential returns. Technology adoption and market knowledge are differentiators."
                  }
                </p>
                <div className="flex items-center space-x-2 text-xs text-blue-700">
                  <Icon name="Info" size={12} />
                  <span>These insights will be incorporated into your analysis</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndustrySelector;