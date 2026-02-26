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
import { TasksView } from '@/components/TasksView';
import { DealsView } from '@/components/DealsView';
import { Navigation } from '@/components/Navigation';
import { QuickActionFAB } from '@/components/QuickActionFAB';
import { AddExpenseSheet } from '@/components/AddExpenseSheet';
import { AddIncomeSheet } from '@/components/AddIncomeSheet';
import { TasksProvider } from '@/contexts/TasksContext';
import { ProjectsProvider } from '@/contexts/ProjectsContext';
import { TransactionsProvider } from '@/contexts/TransactionsContext';
import { PeopleProvider } from '@/contexts/PeopleContext';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.slice(1);
    return hash || 'dashboard';
  });
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showExpenseSheet, setShowExpenseSheet] = useState(false);
  const [showIncomeSheet, setShowIncomeSheet] = useState(false);

  // Wrap navigation to clear project filter when leaving tasks
  const handleNavigate = (view) => {
    if (view !== 'tasks') {
      setSelectedProjectId(null);
      setSelectedCategory(null);
    }
    setCurrentView(view);
  };

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
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-container rounded-xl mb-4 animate-pulse">
            <span className="text-3xl font-bold text-primary-on-container">T</span>
          </div>
          <p className="text-surface-on-variant">Loading...</p>
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
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-container rounded-xl mb-6">
            <span className="text-3xl font-bold text-primary-on-container">T</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-on mb-4">Toditox</h1>
          <p className="text-surface-on-variant mb-6">
            Supabase is not configured. Please add your Supabase credentials to the environment variables.
          </p>
          <div className="bg-surface-container-high rounded-md p-4 text-left text-sm">
            <p className="text-surface-on-variant font-mono mb-2">Required variables:</p>
            <code className="text-primary">
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
        return <DashboardV2 onNavigate={handleNavigate} />;
      case 'tasks':
        if (selectedProjectId) {
          return (
            <ProjectsV2
              onNavigate={handleNavigate}
              initialProjectId={selectedProjectId}
              initialTab="tasks"
              onBack={() => setSelectedProjectId(null)}
            />
          );
        }
        return <TasksView onNavigate={handleNavigate} selectedCategory={selectedCategory} onSelectCategory={(category) => { setSelectedCategory(category); setSelectedProjectId(null); }} onSelectProject={(projectId) => { setSelectedProjectId(projectId); setSelectedCategory(null); setCurrentView('tasks'); }} />;
      case 'projects':
        return <ProjectsV2 onNavigate={handleNavigate} />;
      case 'money':
        return (
          <MoneyView
            onNavigate={handleNavigate}
            onOpenExpense={() => setShowExpenseSheet(true)}
            onOpenIncome={() => setShowIncomeSheet(true)}
          />
        );
      case 'deals':
        return <DealsView onNavigate={handleNavigate} />;
      case 'people':
        return <PeopleView onNavigate={handleNavigate} />;
      case 'ai-notes':
        return <AINotes onNavigate={handleNavigate} />;
      case 'ignored-tasks':
        return <IgnoredTasks onNavigate={handleNavigate} />;
      case 'task-archive':
        return <TaskArchive onNavigate={handleNavigate} />;
      default:
        return <DashboardV2 onNavigate={handleNavigate} />;
    }
  };

  return (
    <TasksProvider>
    <ProjectsProvider>
    <TransactionsProvider>
    <PeopleProvider>
      <div className="min-h-screen bg-surface">
        <Navigation
          currentView={currentView}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          user={user}
          selectedProjectId={selectedProjectId}
          selectedCategory={selectedCategory}
          onSelectProject={(projectId) => {
            setSelectedProjectId(projectId);
            setSelectedCategory(null);
            setCurrentView('tasks');
          }}
          onSelectCategory={(category) => {
            setSelectedCategory(category);
            setSelectedProjectId(null);
            setCurrentView('tasks');
          }}
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
    </PeopleProvider>
    </TransactionsProvider>
    </ProjectsProvider>
    </TasksProvider>
  );
}
