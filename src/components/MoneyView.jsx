import { useState, useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useProjects } from '@/hooks/useProjects';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';

export function MoneyView({ onNavigate, onOpenExpense, onOpenIncome }) {
  const [filter, setFilter] = useState('all'); // all, income, expense
  const { 
    transactions,
    transactionsByMonth,
    cashPosition,
    totalIncome,
    totalExpenses,
    loading,
    deleteTransaction,
  } = useTransactions();
  const { projects, getProjectById } = useProjects();

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter(t => t.type === filter);
  }, [transactions, filter]);

  // Group filtered transactions by month
  const groupedTransactions = useMemo(() => {
    const grouped = {};
    filteredTransactions.forEach(t => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(t);
    });
    // Sort each month's transactions by date descending
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    return grouped;
  }, [filteredTransactions]);

  // Get sorted month keys
  const sortedMonths = useMemo(() => {
    return Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));
  }, [groupedTransactions]);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this transaction?')) {
      await deleteTransaction(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Money</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onOpenExpense}>
            + Expense
          </Button>
          <Button onClick={onOpenIncome}>
            + Income
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Cash Position</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(cashPosition)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total In</p>
          <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totalIncome)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Out</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totalExpenses)}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'income', label: 'Income' },
          { id: 'expense', label: 'Expenses' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === f.id 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      {sortedMonths.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">
          No transactions recorded
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedMonths.map(month => {
            const monthTransactions = groupedTransactions[month];
            const [year, monthNum] = month.split('-');
            const monthLabel = new Date(year, parseInt(monthNum) - 1).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            });
            
            // Calculate month totals
            const monthIncome = monthTransactions
              .filter(t => t.type === 'income')
              .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            const monthExpenses = monthTransactions
              .filter(t => t.type === 'expense')
              .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            
            return (
              <div key={month}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">{monthLabel}</h3>
                  <div className="text-sm text-gray-500">
                    <span className="text-green-600">+{formatCurrency(monthIncome)}</span>
                    {' / '}
                    <span className="text-red-600">-{formatCurrency(monthExpenses)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {monthTransactions.map(transaction => {
                    const project = transaction.project_id 
                      ? getProjectById(transaction.project_id) 
                      : null;
                    
                    return (
                      <TransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        projectName={project?.name}
                        onDelete={() => handleDelete(transaction.id)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TransactionCard({ transaction, projectName, onDelete }) {
  const [showActions, setShowActions] = useState(false);
  const isExpense = transaction.type === 'expense';
  
  return (
    <Card 
      className="p-3 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => setShowActions(!showActions)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isExpense ? 'bg-red-500' : 'bg-green-500'}`} />
            <p className="font-medium text-gray-900 truncate">{transaction.description}</p>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span>{formatDate(transaction.date)}</span>
            {transaction.category && (
              <>
                <span>•</span>
                <span className="capitalize">{transaction.category}</span>
              </>
            )}
            {projectName && (
              <>
                <span>•</span>
                <span className="truncate">{projectName}</span>
              </>
            )}
            {transaction.status === 'pending' && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                Pending
              </span>
            )}
          </div>
        </div>
        <p className={`font-bold text-lg ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
          {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
        </p>
      </div>
      
      {showActions && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Delete
          </button>
        </div>
      )}
    </Card>
  );
}
