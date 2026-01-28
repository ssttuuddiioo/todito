import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Login } from '@/components/Login';
import { DashboardV2 } from '@/components/DashboardV2';
import { ProjectsV2 } from '@/components/ProjectsV2';
import { MoneyView } from '@/components/MoneyView';
import { PeopleView } from '@/components/PeopleView';
import { AINotes } from '@/components/ai-notes';
import { IgnoredTasks } from '@/components/IgnoredTasks';
import { TaskArchive } from '@/components/TaskArchive';
import { Navigation } from '@/components/Navigation';
import { QuickActionFAB } from '@/components/QuickActionFAB';
import { AddExpenseSheet } from '@/components/AddExpenseSheet';
import { AddIncomeSheet } from '@/components/AddIncomeSheet';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showExpenseSheet, setShowExpenseSheet] = useState(false);
  const [showIncomeSheet, setShowIncomeSheet] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured');
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg shadow-primary-500/30 mb-4 animate-pulse">
            <span className="text-3xl font-bold text-white">T</span>
          </div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user && isSupabaseConfigured()) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Not configured - show setup message
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg shadow-primary-500/30 mb-6">
            <span className="text-3xl font-bold text-white">T</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Toditox</h1>
          <p className="text-slate-400 mb-6">
            Supabase is not configured. Please add your Supabase credentials to the environment variables.
          </p>
          <div className="bg-slate-800 rounded-lg p-4 text-left text-sm">
            <p className="text-slate-300 font-mono mb-2">Required variables:</p>
            <code className="text-primary-400">
              VITE_SUPABASE_URL<br />
              VITE_SUPABASE_ANON_KEY
            </code>
          </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardV2 onNavigate={setCurrentView} />;
      case 'projects':
        return <ProjectsV2 onNavigate={setCurrentView} />;
      case 'money':
        return (
          <MoneyView 
            onNavigate={setCurrentView}
            onOpenExpense={() => setShowExpenseSheet(true)}
            onOpenIncome={() => setShowIncomeSheet(true)}
          />
        );
      case 'people':
        return <PeopleView onNavigate={setCurrentView} />;
      case 'ai-notes':
        return <AINotes onNavigate={setCurrentView} />;
      case 'ignored-tasks':
        return <IgnoredTasks onNavigate={setCurrentView} />;
      case 'task-archive':
        return <TaskArchive onNavigate={setCurrentView} />;
      default:
        return <DashboardV2 onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        currentView={currentView} 
        onNavigate={setCurrentView}
        onLogout={handleLogout}
        user={user}
      />
      
      {/* Main content area */}
      <div className="md:pl-64 transition-all duration-200" id="main-content">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-8">
          {renderView()}
        </main>
      </div>

      {/* Quick Action FAB */}
      <QuickActionFAB />

      {/* Sheets triggered from MoneyView */}
      <AddExpenseSheet 
        isOpen={showExpenseSheet}
        onClose={() => setShowExpenseSheet(false)}
      />
      <AddIncomeSheet 
        isOpen={showIncomeSheet}
        onClose={() => setShowIncomeSheet(false)}
      />
    </div>
  );
}
