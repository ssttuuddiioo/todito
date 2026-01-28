import { useState, useEffect, useRef } from 'react';
import { AddExpenseSheet } from './AddExpenseSheet';
import { AddIncomeSheet } from './AddIncomeSheet';
import { AddTaskSheet } from './AddTaskSheet';

export function QuickActionFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null); // 'expense' | 'income' | 'task'
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleAction = (action) => {
    setIsOpen(false);
    setActiveSheet(action);
  };

  const actions = [
    { id: 'expense', label: 'Add Expense', icon: '💳', color: 'bg-red-500' },
    { id: 'income', label: 'Add Income', icon: '💰', color: 'bg-green-500' },
    { id: 'task', label: 'Add Task', icon: '📋', color: 'bg-blue-500' },
  ];

  return (
    <>
      {/* FAB and Menu Container */}
      <div className="fixed bottom-24 right-4 z-50 md:bottom-8 md:right-8" ref={menuRef}>
        {/* Action Menu */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[160px]">
              {actions.map((action, index) => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    index !== actions.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <span className="text-xl">{action.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
            isOpen 
              ? 'bg-gray-900 rotate-45' 
              : 'bg-primary-500 hover:bg-primary-600 hover:scale-105'
          }`}
          aria-label={isOpen ? 'Close menu' : 'Quick actions'}
        >
          <svg 
            className="w-6 h-6 text-white transition-transform duration-200" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Backdrop when menu is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sheets */}
      <AddExpenseSheet 
        isOpen={activeSheet === 'expense'}
        onClose={() => setActiveSheet(null)}
      />
      <AddIncomeSheet 
        isOpen={activeSheet === 'income'}
        onClose={() => setActiveSheet(null)}
      />
      <AddTaskSheet 
        isOpen={activeSheet === 'task'}
        onClose={() => setActiveSheet(null)}
      />
    </>
  );
}
