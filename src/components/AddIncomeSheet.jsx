import { useState, useEffect } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useProjects } from '@/hooks/useProjects';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

// LocalStorage key for last project
const LAST_PROJECT_KEY = 'toditox_last_income_project';

export function AddIncomeSheet({ isOpen, onClose, preselectedProjectId }) {
  const { addIncome, cashPosition } = useTransactions();
  const { activeProjects } = useProjects();
  
  const [formData, setFormData] = useState({
    project_id: '',
    amount: '',
    description: '',
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
      setFormData({
        project_id: preselectedProjectId || lastProject || '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        status: 'paid',
      });
      setSuccess(false);
    }
  }, [isOpen, preselectedProjectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project_id || !formData.amount) return;
    
    setSaving(true);
    try {
      const amount = parseFloat(formData.amount);
      await addIncome({
        project_id: formData.project_id,
        amount,
        description: formData.description.trim() || 'Payment received',
        category: 'revenue',
        date: formData.date,
        status: formData.status,
      });
      
      // Save last project to localStorage
      localStorage.setItem(LAST_PROJECT_KEY, formData.project_id);
      
      setSavedAmount(amount);
      setSuccess(true);
    } catch (err) {
      console.error('Failed to add income:', err);
      alert('Failed to add income');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnother = () => {
    setFormData(prev => ({
      ...prev,
      amount: '',
      description: '',
    }));
    setSuccess(false);
  };

  const handleClose = () => {
    setSuccess(false);
    onClose();
  };

  const newCashPosition = cashPosition + savedAmount;

  // Success state
  if (success) {
    return (
      <Sheet isOpen={isOpen} onClose={handleClose} title="Income Saved">
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-semibold text-gray-900">Saved!</p>
            <p className="text-sm text-gray-500 mt-1">
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
    <Sheet isOpen={isOpen} onClose={handleClose} title="New Income">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project - Required for income */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From which project? *
          </label>
          <select
            value={formData.project_id}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="">Select project</option>
            {activeProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            How much? *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
              placeholder="20000"
              step="0.01"
              min="0"
              autoFocus
              required
            />
          </div>
        </div>

        {/* Note (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note (optional)
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g., 50% deposit"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Status toggle */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'paid' })}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                formData.status === 'paid'
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              Received
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'pending' })}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                formData.status === 'pending'
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              Expected
            </button>
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={saving || !formData.project_id || !formData.amount} 
          className="w-full py-3 text-lg"
        >
          {saving ? 'Saving...' : 'Save Income'}
        </Button>
      </form>
    </Sheet>
  );
}
