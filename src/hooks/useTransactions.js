import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Hook for managing transactions (unified income/expense)
 * Table: toditox_transactions
 */
export function useTransactions() {
  const {
    data: transactions,
    loading,
    error,
    create,
    update,
    remove,
    refresh,
  } = useSupabaseTable('transactions', { orderBy: 'date' });

  // Add a transaction
  const addTransaction = useCallback(async (transaction) => {
    return create(transaction);
  }, [create]);

  // Add an expense (convenience method)
  const addExpense = useCallback(async (expense) => {
    return create({
      ...expense,
      type: 'expense',
      amount: Math.abs(expense.amount), // Ensure positive
    });
  }, [create]);

  // Add income (convenience method)
  const addIncome = useCallback(async (income) => {
    return create({
      ...income,
      type: 'income',
      amount: Math.abs(income.amount), // Ensure positive
    });
  }, [create]);

  // Update a transaction
  const updateTransaction = useCallback(async (id, updates) => {
    return update(id, updates);
  }, [update]);

  // Delete a transaction
  const deleteTransaction = useCallback(async (id) => {
    return remove(id);
  }, [remove]);

  // Get transactions by project
  const getTransactionsByProject = useCallback((projectId) => {
    if (!projectId) return [];
    return transactions.filter(t => t.project_id === projectId);
  }, [transactions]);

  // Get expenses only
  const expenses = useMemo(() => {
    return transactions.filter(t => t.type === 'expense');
  }, [transactions]);

  // Get income only
  const income = useMemo(() => {
    return transactions.filter(t => t.type === 'income');
  }, [transactions]);

  // Get total expenses
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }, [expenses]);

  // Get total income
  const totalIncome = useMemo(() => {
    return income.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }, [income]);

  // Get cash position (income - expenses)
  const cashPosition = useMemo(() => {
    return totalIncome - totalExpenses;
  }, [totalIncome, totalExpenses]);

  // Get expenses by project
  const getExpensesByProject = useCallback((projectId) => {
    return expenses.filter(t => t.project_id === projectId);
  }, [expenses]);

  // Get income by project
  const getIncomeByProject = useCallback((projectId) => {
    return income.filter(t => t.project_id === projectId);
  }, [income]);

  // Get project totals
  const getProjectTotals = useCallback((projectId) => {
    const projectExpenses = getExpensesByProject(projectId);
    const projectIncome = getIncomeByProject(projectId);
    
    const totalExpense = projectExpenses.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalRev = projectIncome.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    return {
      expenses: totalExpense,
      income: totalRev,
      profit: totalRev - totalExpense,
    };
  }, [getExpensesByProject, getIncomeByProject]);

  // Get transactions grouped by month
  const transactionsByMonth = useMemo(() => {
    const grouped = {};
    transactions.forEach(t => {
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
  }, [transactions]);

  // Get pending transactions (upcoming payments)
  const pendingTransactions = useMemo(() => {
    return transactions.filter(t => t.status === 'pending');
  }, [transactions]);

  // Get upcoming income
  const upcomingIncome = useMemo(() => {
    return pendingTransactions
      .filter(t => t.type === 'income')
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [pendingTransactions]);

  // Get upcoming expenses
  const upcomingExpenses = useMemo(() => {
    return pendingTransactions
      .filter(t => t.type === 'expense')
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [pendingTransactions]);

  return {
    transactions,
    expenses,
    income,
    loading,
    error,
    
    // Actions
    addTransaction,
    addExpense,
    addIncome,
    updateTransaction,
    deleteTransaction,
    refresh,
    
    // Queries
    getTransactionsByProject,
    getExpensesByProject,
    getIncomeByProject,
    getProjectTotals,
    
    // Computed values
    totalExpenses,
    totalIncome,
    cashPosition,
    transactionsByMonth,
    pendingTransactions,
    upcomingIncome,
    upcomingExpenses,
  };
}
