import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';

const QuickAccessTools = () => {
  const quickTools = [
    {
      id: 'swot',
      title: 'SWOT Analysis',
      description: 'Analyze strengths, weaknesses, opportunities & threats',
      icon: 'Target',
      route: '/swot-analysis-tool',
    },
    {
      id: 'porter',
      title: "Porter’s Five Forces",
      description: 'Assess competitive forces in your industry',
      icon: 'Layers',
      route: '/porter-s-five-forces-analysis',
    },
    {
      id: 'bp',
      title: 'Business Plan Generator',
      description: 'Create a comprehensive business plan',
      icon: 'FileText',
      route: '/business-plan-generator',
    },
  ];

  return (
    <div className="bg-card border border-border rounded-lg shadow-soft p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Quick Access Tools</h3>
      <div className="space-y-3">
        {quickTools.map((tool) => (
          <Link
            key={tool.id}
            to={tool.route}
            className="block p-4 border border-border rounded-lg hover:bg-muted/50 transition-smooth"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon name={tool.icon} size={18} className="text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{tool.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                </div>
              </div>
              <Icon name="ArrowRight" size={18} className="text-muted-foreground mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickAccessTools;