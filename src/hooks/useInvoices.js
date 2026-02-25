import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Hook for managing invoices (lightweight invoice tracking)
 * Table: invoices
 * Columns: project_id, contact_id, invoice_number, amount, description,
 *          status (draft/sent/paid/overdue), issue_date, date_sent, due_date, paid_date, notes
 */
export function useInvoices() {
  const {
    data: invoices,
    loading,
    error,
    create,
    update,
    remove,
    refresh,
  } = useSupabaseTable('invoices');

  const addInvoice = useCallback(async (invoice) => {
    return create(invoice);
  }, [create]);

  const updateInvoice = useCallback(async (id, updates) => {
    return update(id, updates);
  }, [update]);

  const deleteInvoice = useCallback(async (id) => {
    return remove(id);
  }, [remove]);

  // Mark as sent
  const markSent = useCallback(async (id) => {
    return update(id, {
      status: 'sent',
      date_sent: new Date().toISOString().split('T')[0],
    });
  }, [update]);

  // Mark as paid
  const markPaid = useCallback(async (id, datePaid = null) => {
    return update(id, {
      status: 'paid',
      paid_date: datePaid || new Date().toISOString().split('T')[0],
    });
  }, [update]);

  // Filtered views
  const draftInvoices = useMemo(() =>
    invoices.filter(i => i.status === 'draft'), [invoices]);

  const sentInvoices = useMemo(() =>
    invoices.filter(i => i.status === 'sent'), [invoices]);

  const paidInvoices = useMemo(() =>
    invoices.filter(i => i.status === 'paid'), [invoices]);

  const overdueInvoices = useMemo(() =>
    invoices.filter(i =>
      i.status === 'overdue' ||
      (i.status === 'sent' && i.due_date && new Date(i.due_date) < new Date())
    ), [invoices]);

  // Outstanding (sent + overdue) sorted by age (oldest first)
  const outstandingInvoices = useMemo(() => {
    return invoices
      .filter(i => i.status === 'sent' || i.status === 'overdue')
      .sort((a, b) => new Date(a.issue_date) - new Date(b.issue_date));
  }, [invoices]);

  const totalOutstanding = useMemo(() =>
    outstandingInvoices.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0),
    [outstandingInvoices]);

  const getInvoicesByProject = useCallback((projectId) =>
    invoices.filter(i => i.project_id === projectId), [invoices]);

  return {
    invoices,
    loading,
    error,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    markSent,
    markPaid,
    refresh,
    draftInvoices,
    sentInvoices,
    paidInvoices,
    overdueInvoices,
    outstandingInvoices,
    totalOutstanding,
    getInvoicesByProject,
  };
}
