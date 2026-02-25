import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Hook for managing recurring transaction templates
 * Table: recurring_templates
 * Columns: project_id, type (income/expense), amount, description, category,
 *          frequency (weekly/monthly/quarterly/yearly), next_occurrence, end_date, is_active, notes
 */
export function useRecurring() {
  const {
    data: templates,
    loading,
    error,
    create,
    update,
    remove,
    refresh,
  } = useSupabaseTable('recurring_templates');

  const addTemplate = useCallback(async (template) => {
    return create(template);
  }, [create]);

  const updateTemplate = useCallback(async (id, updates) => {
    return update(id, updates);
  }, [update]);

  const deleteTemplate = useCallback(async (id) => {
    return remove(id);
  }, [remove]);

  const toggleActive = useCallback(async (id, currentState) => {
    return update(id, { is_active: !currentState });
  }, [update]);

  // Active templates
  const activeTemplates = useMemo(() => {
    return templates.filter(t => t.is_active);
  }, [templates]);

  // Templates that are due (next_occurrence <= today and still active)
  const dueTemplates = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return templates.filter(t =>
      t.is_active && t.next_occurrence <= today &&
      (!t.end_date || t.end_date >= today)
    );
  }, [templates]);

  // Advance a date by frequency
  const advanceDate = useCallback((dateStr, frequency) => {
    const d = new Date(dateStr + 'T12:00:00'); // noon to avoid timezone issues
    switch (frequency) {
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'quarterly': d.setMonth(d.getMonth() + 3); break;
      case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    }
    return d.toISOString().split('T')[0];
  }, []);

  // Generate pending transactions for all due templates
  // Pass addTransaction from useTransactions as parameter
  const generateDueTransactions = useCallback(async (addTransaction) => {
    const generated = [];
    for (const template of dueTemplates) {
      const { data } = await addTransaction({
        project_id: template.project_id,
        type: template.type,
        amount: template.amount,
        description: template.description,
        category: template.category,
        date: template.next_occurrence,
        status: 'pending',
        recurring_template_id: template.id,
        notes: template.notes || `Recurring: ${template.description}`,
      });
      if (data) {
        const nextDate = advanceDate(template.next_occurrence, template.frequency);
        const shouldDeactivate = template.end_date && nextDate > template.end_date;
        await update(template.id, {
          next_occurrence: nextDate,
          is_active: !shouldDeactivate,
        });
        generated.push(data);
      }
    }
    return generated;
  }, [dueTemplates, update, advanceDate]);

  return {
    templates,
    loading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    toggleActive,
    refresh,
    activeTemplates,
    dueTemplates,
    generateDueTransactions,
  };
}
