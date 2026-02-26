import { useState, useEffect, useMemo } from 'react';
import { useTransactions } from '@/contexts/TransactionsContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

// Category suggestions based on keywords
const CATEGORY_KEYWORDS = {
  hardware: ['dell', 'server', 'led', 'computer', 'laptop', 'monitor', 'cable', 'equipment', 'device', 'fixture'],
  software: ['touchdesigner', 'adobe', 'license', 'subscription', 'app', 'software', 'saas'],
  travel: ['flight', 'hotel', 'airbnb', 'uber', 'lyft', 'gas', 'parking', 'rental', 'airfare', 'train'],
  subcontractor: ['andrew', 'stephen', 'contractor', 'freelance', 'consultant', 'labor'],
  meals: ['lunch', 'dinner', 'coffee', 'food', 'restaurant', 'meal'],
  office: ['office', 'supplies', 'paper', 'printer', 'desk'],
  marketing: ['ads', 'advertising', 'marketing', 'promotion', 'campaign'],
};

const CATEGORIES = ['hardware', 'software', 'travel', 'subcontractor', 'meals', 'office', 'marketing', 'other'];

// Common amounts for quick selection
const QUICK_AMOUNTS = [500, 1000, 1500, 2000, 5000];

// LocalStorage key for last project
const LAST_PROJECT_KEY = 'toditox_last_expense_project';

function suggestCategory(description) {
  if (!description) return '';
  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        return category;
      }
    }
  }
  return '';
}

export function AddExpenseSheet({ isOpen, onClose, preselectedProjectId }) {
  const { addExpense, cashPosition } = useTransactions();
  const { projects, activeProjects } = useProjects();

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    project_id: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    status: 'paid',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedAmount, setSavedAmount] = useState(0);

  // Load last used project from localStorage
  useEffect(() => {
    if (isOpen) {
      const lastProject = localStorage.getItem(LAST_PROJECT_KEY);
      setFormData(prev => ({
        ...prev,
        project_id: preselectedProjectId || lastProject || '',
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        status: 'paid',
      }));
      setSuccess(false);
    }
  }, [isOpen, preselectedProjectId]);

  // Auto-suggest category based on description
  useEffect(() => {
    if (formData.description && !formData.category) {
      const suggested = suggestCategory(formData.description);
      if (suggested) {
        setFormData(prev => ({ ...prev, category: suggested }));
      }
    }
  }, [formData.description]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.amount) return;

    setSaving(true);
    try {
      const amount = parseFloat(formData.amount);
      await addExpense({
        description: formData.description.trim(),
        amount,
        project_id: formData.project_id || null,
        category: formData.category || 'other',
        date: formData.date,
        status: formData.status,
      });

      // Save last project to localStorage
      if (formData.project_id) {
        localStorage.setItem(LAST_PROJECT_KEY, formData.project_id);
      }

      setSavedAmount(amount);
      setSuccess(true);
    } catch (err) {
      console.error('Failed to add expense:', err);
      alert('Failed to add expense');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnother = () => {
    setFormData(prev => ({
      ...prev,
      description: '',
      amount: '',
      category: '',
    }));
    setSuccess(false);
  };

  const handleClose = () => {
    setSuccess(false);
    onClose();
  };

  const newCashPosition = cashPosition - savedAmount;

  // Success state
  if (success) {
    return (
      <Sheet isOpen={isOpen} onClose={handleClose} title="Expense Saved">
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <p className="text-lg font-semibold text-surface-on">Saved!</p>
            <p className="text-sm text-surface-on-variant mt-1">
              Cash: {formatCurrency(cashPosition)} → {formatCurrency(newCashPosition)}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={handleAddAnother} className="flex-1">
              Add Another
            </Button>
            <Button onClick={handleClose} className="flex-1">
              Done
            </Button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet isOpen={isOpen} onClose={handleClose} title="New Expense">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-surface-on-variant mb-1">
            What did you buy? *
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-3 border border-outline rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-lg"
            placeholder="Dell media server"
            autoFocus
            required
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-surface-on-variant mb-1">
            How much? *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">$</span>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full pl-8 pr-3 py-3 border border-outline rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-lg"
              placeholder="1500"
              step="0.01"
              min="0"
              required
            />
          </div>

          {/* Quick amounts */}
          <div className="flex flex-wrap gap-2 mt-2">
            {QUICK_AMOUNTS.map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => setFormData({ ...formData, amount: amount.toString() })}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  formData.amount === amount.toString()
                    ? 'bg-surface-on text-surface border-surface-on'
                    : 'border-outline text-surface-on-variant hover:border-outline'
                }`}
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>

        {/* Project */}
        <div>
          <label className="block text-sm font-medium text-surface-on-variant mb-1">
            Which project?
          </label>
          <select
            value={formData.project_id}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            className="w-full px-3 py-3 border border-outline rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">Personal / No project</option>
            {activeProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-surface-on-variant mb-1">
            Category
            {formData.category && suggestCategory(formData.description) === formData.category && (
              <span className="text-xs text-outline ml-2">(auto-suggested)</span>
            )}
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-3 border border-outline rounded-md focus:ring-2 focus:ring-primary focus:border-primary capitalize"
          >
            <option value="">Select category</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat} className="capitalize">{cat}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-surface-on-variant mb-1">
            Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-3 border border-outline rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Status toggle */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-surface-on-variant">Status:</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'paid' })}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                formData.status === 'paid'
                  ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                  : 'bg-surface-container-high text-surface-on-variant'
              }`}
            >
              Paid
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'pending' })}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                formData.status === 'pending'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-surface-container-high text-surface-on-variant'
              }`}
            >
              Pending
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={saving || !formData.description.trim() || !formData.amount}
          className="w-full py-3 text-lg"
        >
          {saving ? 'Saving...' : 'Save Expense'}
        </Button>
      </form>
    </Sheet>
  );
}
