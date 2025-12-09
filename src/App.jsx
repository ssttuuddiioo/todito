import { useState, useEffect } from 'react';
import { MockDataProvider } from '@/contexts/MockDataContext';
import { Login, isLoggedIn, logout } from '@/components/Login';
import { Dashboard } from '@/components/Dashboard';
import { CRM } from '@/components/CRM';
import { Projects } from '@/components/Projects';
import { Tasks } from '@/components/Tasks';
import { Timeline } from '@/components/Timeline';
import { Revenue } from '@/components/Revenue';
import { Expenses } from '@/components/Expenses';
import { AINotes } from '@/components/ai-notes';
import { IgnoredTasks } from '@/components/IgnoredTasks';
import { Navigation } from '@/components/Navigation';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    // Check for existing session
    setIsAuthenticated(isLoggedIn());
    setLoading(false);
  }, []);

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg shadow-primary-500/30 mb-4 animate-pulse">
            <span className="text-3xl">🍅</span>
          </div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} />;
      case 'crm':
        return <CRM />;
      case 'projects':
        return <Projects />;
      case 'tasks':
        return <Tasks />;
      case 'timeline':
        return <Timeline />;
      case 'ai-notes':
        return <AINotes onNavigate={setCurrentView} />;
      case 'ignored-tasks':
        return <IgnoredTasks onNavigate={setCurrentView} />;
      case 'revenue':
        return <Revenue />;
      case 'expenses':
        return <Expenses />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        currentView={currentView} 
        onNavigate={setCurrentView}
        onLogout={handleLogout}
      />
      
      <div className="md:pl-64 transition-all duration-200" id="main-content">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-8">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <MockDataProvider>
      <AppContent />
    </MockDataProvider>
  );
}
