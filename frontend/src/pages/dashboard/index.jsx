import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import QuickAccessTools from './components/QuickAccessTools';
import AIBusinessAdvisor from './components/AIBusinessAdvisor';
import { useAuth } from '../../context/authContext.jsx';

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName] = useState('John Doe');
  const [userType] = useState('founder'); // founder or mentor
  const { user } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date?.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date?.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGreeting = () => {
    const hour = currentTime?.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                {user && ( <h1 className="text-3xl font-bold text-foreground">
                  {getGreeting()}, {user.fullname}!
                </h1>)}     
                {!user && ( <h1 className="text-3xl font-bold text-foreground">
                  {getGreeting()}!
                </h1>)}  
                <p className="text-lg text-muted-foreground mt-1">
                  {formatDate(currentTime)} • {formatTime(currentTime)}
                </p>
              </div>
            </div>
          
          </div>


          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Charts and Recommendations */}
            <div className="lg:col-span-2 space-y-8">
              <AIBusinessAdvisor />
            </div>

            {/* Right Column - Tools and Mentoring */}
            <div className="space-y-8">
              <QuickAccessTools />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;