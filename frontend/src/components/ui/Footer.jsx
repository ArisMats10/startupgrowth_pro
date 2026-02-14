import React from 'react';
import Icon from '../AppIcon';

const Footer = () => {
  return (
    <footer className="mt-12 pt-8 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Icon name="TrendingUp" size={14} color="white" />
              </div>
              <span className="font-semibold text-foreground">StartupGrowth Pro</span>
            </div>
            <span className="text-sm text-muted-foreground">© {new Date()?.getFullYear()} All rights reserved</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
