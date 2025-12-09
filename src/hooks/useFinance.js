import { useMockData } from '@/contexts/MockDataContext';

export function useFinance() {
  const { 
    invoices, 
    expenses, 
    addInvoice, 
    updateInvoiceStatus, 
    addExpense 
  } = useMockData();
  const loading = false;

  const getInvoiceItems = (invoiceId) => []; // Not implemented in mock yet
  const getExpensesByProject = (projectId) => 
    expenses?.filter(e => e.project_id === projectId) || [];

  const getTotalRevenue = () => 
    invoices
      ?.filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) || 0;

  const getTotalExpenses = () => 
    expenses?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;

  return {
    invoices,
    expenses,
    loading,
    addInvoice,
    updateInvoiceStatus,
    addExpense,
    getInvoiceItems,
    getExpensesByProject,
    getTotalRevenue,
    getTotalExpenses
  };
}
