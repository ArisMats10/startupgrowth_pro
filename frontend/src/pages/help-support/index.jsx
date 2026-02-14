import React from 'react';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const HelpSupport = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Help & Support</h1>
            <p className="text-sm text-muted-foreground mt-1">Quick ways to get help.</p>
          </div>

          <div className="bg-card border border-border rounded-lg shadow-soft p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Icon name="LifeBuoy" size={18} className="text-accent" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">Contact Support</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Email us and include a short description of the issue.
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <Button asChild>
                    <a href="mailto:support@startupgrowthpro.com?subject=Support%20Request">Email support</a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="mailto:support@startupgrowthpro.com?subject=Bug%20Report">Report a bug</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg shadow-soft p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="Info" size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">Tip</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  If something looks wrong, try logging out and logging back in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HelpSupport;
