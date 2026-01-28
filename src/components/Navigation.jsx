import { useState } from 'react';

const NAV_ITEMS = [
  { 
    id: 'dashboard', 
    label: 'Home', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  { 
    id: 'projects', 
    label: 'Projects', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )
  },
  { 
    id: 'money', 
    label: 'Money', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  { 
    id: 'people', 
    label: 'People', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  { 
    id: 'ai-notes', 
    label: 'Parse', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
];

export function Navigation({ currentView, onNavigate, onLogout, user }) {
  const displayUser = user || { email: 'demo@todito.app' };
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-slate-900 text-gray-300 border-r border-slate-800 z-50">
        {/* Brand */}
        <div className="flex items-center h-16 px-6 border-b border-slate-800 bg-slate-950">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white font-bold mr-3">
            T
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Toditox</span>
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  currentView === item.id
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`mr-3 transition-colors ${
                  currentView === item.id ? 'text-primary-200' : 'text-slate-400 group-hover:text-white'
                }`}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-medium text-sm">
              {displayUser?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {displayUser?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-slate-500 truncate">
                Pro Plan
              </p>
            </div>
            <button 
              onClick={() => window.confirm('Sign out?') && onLogout?.()}
              className="text-slate-500 hover:text-white transition-colors"
              title="Sign out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold mr-2">
            T
          </div>
          <span className="text-lg font-bold text-gray-900">Toditox</span>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"
          >
            {displayUser?.email?.[0]?.toUpperCase()}
          </button>
          
          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowUserMenu(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-50 py-1">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {displayUser?.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    if (window.confirm('Sign out?')) onLogout?.();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                currentView === item.id
                  ? 'text-primary-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="transform scale-90">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
