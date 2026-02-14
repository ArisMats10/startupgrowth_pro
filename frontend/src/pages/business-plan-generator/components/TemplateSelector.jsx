import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';

const TemplateSelector = ({ isOpen, onClose, onSelectTemplate }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'All Templates', count: 12 },
    { id: 'saas', label: 'SaaS & Tech', count: 4 },
    { id: 'ecommerce', label: 'E-commerce', count: 3 },
    { id: 'service', label: 'Service Business', count: 2 },
    { id: 'manufacturing', label: 'Manufacturing', count: 2 },
    { id: 'nonprofit', label: 'Non-profit', count: 1 }
  ];

  const templates = [
    {
      id: 1,
      name: "SaaS Startup Plan",
      category: "saas",
      description: "Comprehensive template for software-as-a-service businesses with subscription models",
      thumbnail: "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?w=300",
      sections: 8,
      estimatedTime: "2-3 hours",
      difficulty: "Intermediate",
      popular: true,
      features: ["Financial modeling", "SaaS metrics", "Investor pitch deck"],
      seed: {
        industry: 'B2B SaaS',
        businessModel: 'Subscription (monthly/annual)'
      }
    },
    {
      id: 2,
      name: "E-commerce Business Plan",
      category: "ecommerce",
      description: "Perfect for online retail businesses and marketplace platforms",
      thumbnail: "https://images.pixabay.com/photo/2016/11/10/16/05/laptop-1814090_1280.jpg?w=300",
      sections: 7,
      estimatedTime: "2-4 hours",
      difficulty: "Beginner",
      popular: false,
      features: ["Market analysis", "Supply chain", "Digital marketing"],
      seed: {
        industry: 'E-commerce',
        businessModel: 'Direct-to-consumer / online retail'
      }
    },
    {
      id: 3,
      name: "Tech Startup Blueprint",
      category: "saas",
      description: "Ideal for technology startups seeking venture capital funding",
      thumbnail: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=300",
      sections: 9,
      estimatedTime: "3-5 hours",
      difficulty: "Advanced",
      popular: true,
      features: ["VC pitch format", "Technical roadmap", "Team scaling"],
      seed: {
        industry: 'Tech startup',
        businessModel: 'VC-backed growth model'
      }
    },
    {
      id: 4,
      name: "Service Business Plan",
      category: "service",
      description: "Tailored for consulting, agency, and professional service businesses",
      thumbnail: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?w=300",
      sections: 6,
      estimatedTime: "1-2 hours",
      difficulty: "Beginner",
      popular: false,
      features: ["Service offerings", "Client acquisition", "Pricing strategy"],
      seed: {
        industry: 'Professional services',
        businessModel: 'Project-based / retainer'
      }
    },
    {
      id: 5,
      name: "Manufacturing Startup",
      category: "manufacturing",
      description: "Comprehensive plan for product manufacturing and distribution",
      thumbnail: "https://images.pixabay.com/photo/2017/08/10/08/47/laptop-2619564_1280.jpg?w=300",
      sections: 8,
      estimatedTime: "3-4 hours",
      difficulty: "Advanced",
      popular: false,
      features: ["Production planning", "Supply chain", "Quality control"],
      seed: {
        industry: 'Manufacturing',
        businessModel: 'Production + distribution'
      }
    },
    {
      id: 6,
      name: "Mobile App Business",
      category: "saas",
      description: "Specialized template for mobile application businesses",
      thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=300",
      sections: 7,
      estimatedTime: "2-3 hours",
      difficulty: "Intermediate",
      popular: true,
      features: ["App monetization", "User acquisition", "Development phases"],
      seed: {
        industry: 'Mobile apps',
        businessModel: 'Freemium / in-app purchases / subscriptions'
      }
    }
  ];

  const filteredTemplates = templates?.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template?.category === selectedCategory;
    const matchesSearch = template?.name?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
                         template?.description?.toLowerCase()?.includes(searchQuery?.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'text-success';
      case 'Intermediate': return 'text-warning';
      case 'Advanced': return 'text-error';
      default: return 'text-muted-foreground';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-soft z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-modal w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Choose a Template</h2>
              <p className="text-muted-foreground mt-1">Start with a professional template tailored to your industry</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <Icon name="X" size={20} />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e?.target?.value)}
              className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Categories Sidebar */}
          <div className="w-64 bg-muted/30 border-r border-border p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Categories</h3>
            <div className="space-y-1">
              {categories?.map((category) => (
                <button
                  key={category?.id}
                  onClick={() => setSelectedCategory(category?.id)}
                  className={`w-full flex items-center justify-between p-2 text-sm rounded-lg transition-smooth ${
                    selectedCategory === category?.id
                      ? 'bg-primary/10 text-primary' :'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{category?.label}</span>
                  <span className="text-xs">{category?.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates?.map((template) => (
                <div key={template?.id} className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-elevated transition-smooth">
                  {/* Template Preview */}
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={template?.thumbnail}
                      alt={template?.name}
                      className="w-full h-full object-cover"
                    />
                    {template?.popular && (
                      <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                        Popular
                      </div>
                    )}
                    <div className={`absolute top-3 right-3 text-xs px-2 py-1 rounded ${getDifficultyColor(template?.difficulty)} bg-card`}>
                      {template?.difficulty}
                    </div>
                  </div>

                  {/* Template Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-2">{template?.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{template?.description}</p>
                    

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => onSelectTemplate(template)}
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredTemplates?.length === 0 && (
              <div className="text-center py-12">
                <Icon name="Search" size={48} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No templates found</h3>
                <p className="text-muted-foreground">Try adjusting your search or category filter</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Can't find what you're looking for?{' '}
              <button className="text-primary hover:underline">Start from scratch</button>
            </div>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;