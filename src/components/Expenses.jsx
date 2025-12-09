import { useState } from 'react';
import { useFinance } from '@/hooks/useFinance';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { formatDate } from '@/lib/utils';

export function Expenses() {
  const { expenses, loading, addExpense, getTotalExpenses } = useFinance();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [formData, setFormData] = useState({ category: 'software', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });

  const totalExpenses = getTotalExpenses();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addExpense(formData);
    setIsSheetOpen(false);
    setFormData({ category: 'software', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading expenses...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Expenses</h2>
        <Button onClick={() => setIsSheetOpen(true)}>+ Log Expense</Button>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-red-50 to-white border-red-100">
        <div className="flex items-center space-x-3 mb-2">
          <span className="bg-red-100 p-2 rounded-lg text-red-700">📉</span>
          <h3 className="text-sm font-medium text-red-900">Total Spending</h3>
        </div>
        <p className="text-3xl font-bold text-red-900 tracking-tight">${totalExpenses.toLocaleString()}</p>
      </Card>

      {/* Expenses List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-semibold text-gray-900">Expense Log</h3>
        </div>
        <div className="divide-y divide-gray-100">
           {expenses?.length === 0 ? (
             <div className="p-12 text-center text-gray-500">No expenses logged.</div>
          ) : (
            expenses?.map(expense => (
              <div key={expense.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-2xl w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                    {getCategoryIcon(expense.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 capitalize">{expense.category}</h3>
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {formatDate(expense.date)} {expense.notes && `• ${expense.notes}`}
                    </div>
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  -${Number(expense.amount).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <Sheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} title="Log Expense">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="label">Category</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {['software', 'travel', 'meals', 'office', 'contractors', 'marketing'].map(cat => (
                   <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({...formData, category: cat})}
                    className={`p-3 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      formData.category === cat 
                        ? 'border-primary-500 bg-primary-50 text-primary-900 ring-1 ring-primary-500' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{getCategoryIcon(cat)}</span>
                    <span className="capitalize text-sm font-medium">{cat}</span>
                  </button>
                ))}
              </div>
            </div>
            <div><label className="label">Amount ($)</label><input required type="number" className="input" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
            <div><label className="label">Date</label><input required type="date" className="input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
            <div><label className="label">Notes</label><textarea className="input min-h-[100px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="What was this for?" /></div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Log Expense</Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

function getCategoryIcon(category) {
  const icons = {
    software: '💻',
    travel: '✈️',
    meals: '🍽️',
    office: '🏢',
    contractors: '👷',
    marketing: '📢',
  };
  return icons[category] || '🧾';
}
