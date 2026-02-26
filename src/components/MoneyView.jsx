import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTransactions } from '@/contexts/TransactionsContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { useRecurring } from '@/hooks/useRecurring';
import { useInvoices } from '@/hooks/useInvoices';
import { usePeople } from '@/contexts/PeopleContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { formatCurrency, formatDate } from '@/lib/utils';

export function MoneyView({ onNavigate, onOpenExpense, onOpenIncome }) {
  const [activeTab, setActiveTab] = useState('transactions'); // transactions, recurring, invoices
  const [filter, setFilter] = useState('all'); // all, income, expense
  const {
    transactions,
    transactionsByMonth,
    cashPosition,
    totalIncome,
    totalExpenses,
    taxReserve,
    totalPendingExpenses,
    spendableCash,
    loading,
    deleteTransaction,
    updateTransaction,
    addTransaction,
  } = useTransactions();
  const { projects, getProjectById } = useProjects();
  const recurring = useRecurring();
  const invoices = useInvoices();
  const { people } = usePeople();

  // Auto-generate due recurring transactions on mount
  const [generated, setGenerated] = useState(false);
  useEffect(() => {
    if (!generated && !recurring.loading && recurring.dueTemplates.length > 0) {
      recurring.generateDueTransactions(addTransaction).then(() => setGenerated(true));
    }
  }, [generated, recurring.loading, recurring.dueTemplates.length]);

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

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    await updateTransaction(id, { status: newStatus });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-on">Finance</h1>
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
      <div className="space-y-3">
        <Card className="p-5 text-center bg-surface-container-lowest text-white">
          <p className="text-xs text-surface-on-variant uppercase tracking-wide">Spendable Cash</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(spendableCash)}</p>
          <p className="text-xs text-surface-on-variant mt-1">
            After {formatCurrency(taxReserve)} tax reserve & {formatCurrency(totalPendingExpenses)} pending bills
          </p>
        </Card>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 text-center">
            <p className="text-xs text-surface-on-variant uppercase tracking-wide">Cash Position</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(cashPosition)}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-surface-on-variant uppercase tracking-wide">Tax Reserve (25%)</p>
            <p className="text-lg font-bold text-amber-600 mt-1">{formatCurrency(taxReserve)}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-surface-on-variant uppercase tracking-wide">Total In</p>
            <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(totalIncome)}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-surface-on-variant uppercase tracking-wide">Total Out</p>
            <p className="text-lg font-bold text-red-600 mt-1">{formatCurrency(totalExpenses)}</p>
          </Card>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 border-b border-outline-variant pb-0">
        {[
          { id: 'transactions', label: 'Transactions' },
          { id: 'recurring', label: `Recurring${recurring.activeTemplates.length ? ` (${recurring.activeTemplates.length})` : ''}` },
          { id: 'invoices', label: `Invoices${invoices.outstandingInvoices.length ? ` (${invoices.outstandingInvoices.length})` : ''}` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-surface-on text-surface-on'
                : 'border-transparent text-outline hover:text-surface-on-variant'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'transactions' && (
        <>
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
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filter === f.id
                    ? 'bg-surface-on text-surface'
                    : 'bg-surface-container-high text-surface-on-variant hover:bg-surface-container-highest'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Transactions List */}
          {sortedMonths.length === 0 ? (
            <Card className="p-8 text-center text-outline">
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

                const monthIncome = monthTransactions
                  .filter(t => t.type === 'income')
                  .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
                const monthExpenses = monthTransactions
                  .filter(t => t.type === 'expense')
                  .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

                return (
                  <div key={month}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-surface-on">{monthLabel}</h3>
                      <div className="text-sm text-surface-on-variant">
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
                            onToggleStatus={() => handleToggleStatus(transaction.id, transaction.status)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'recurring' && (
        <RecurringTab
          recurring={recurring}
          projects={projects}
          getProjectById={getProjectById}
        />
      )}

      {activeTab === 'invoices' && (
        <InvoicesTab
          invoices={invoices}
          projects={projects}
          people={people}
          getProjectById={getProjectById}
          addTransaction={addTransaction}
        />
      )}
    </div>
  );
}

function TransactionCard({ transaction, projectName, onDelete, onToggleStatus }) {
  const [showActions, setShowActions] = useState(false);
  const isExpense = transaction.type === 'expense';
  const isPending = transaction.status === 'pending';

  return (
    <Card
      className={`p-3 hover:shadow-glow-primary transition-shadow cursor-pointer ${isPending ? 'bg-amber-950/40 border border-amber-800/20' : ''}`}
      onClick={() => setShowActions(!showActions)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isExpense ? 'bg-red-500' : 'bg-green-500'}`} />
            <p className={`font-medium truncate ${isPending ? 'text-surface-on-variant' : 'text-surface-on'}`}>
              {transaction.description}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-surface-on-variant">
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
            {isPending && (
              <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded text-xs font-medium">
                Expected
              </span>
            )}
          </div>
        </div>
        <p className={`font-bold text-lg ${isPending ? 'opacity-60' : ''} ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
          {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
        </p>
      </div>

      {showActions && (
        <div className="mt-3 pt-3 border-t border-outline-variant flex justify-between">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
            className={`text-sm font-medium ${
              isPending
                ? 'text-green-600 hover:text-green-400'
                : 'text-amber-600 hover:text-amber-400'
            }`}
          >
            {isPending ? 'Mark as Paid' : 'Mark as Pending'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-sm text-red-600 hover:text-red-400 font-medium"
          >
            Delete
          </button>
        </div>
      )}
    </Card>
  );
}

// ==========================================
// RECURRING TAB
// ==========================================

const FREQUENCY_LABELS = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };

function RecurringTab({ recurring, projects, getProjectById }) {
  const [showNew, setShowNew] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    description: '', amount: '', type: 'expense', project_id: '',
    category: '', frequency: 'monthly', next_occurrence: '', end_date: '', notes: '',
  });

  const resetForm = () => {
    setFormData({
      description: '', amount: '', type: 'expense', project_id: '',
      category: '', frequency: 'monthly', next_occurrence: '', end_date: '', notes: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.amount) return;

    const data = {
      description: formData.description.trim(),
      amount: parseFloat(formData.amount),
      type: formData.type,
      project_id: formData.project_id || null,
      category: formData.category || null,
      frequency: formData.frequency,
      next_occurrence: formData.next_occurrence,
      end_date: formData.end_date || null,
      notes: formData.notes || null,
    };

    if (editingId) {
      await recurring.updateTemplate(editingId, data);
    } else {
      await recurring.addTemplate(data);
    }
    resetForm();
    setShowNew(false);
  };

  const handleEdit = (template) => {
    setFormData({
      description: template.description,
      amount: template.amount,
      type: template.type,
      project_id: template.project_id || '',
      category: template.category || '',
      frequency: template.frequency,
      next_occurrence: template.next_occurrence,
      end_date: template.end_date || '',
      notes: template.notes || '',
    });
    setEditingId(template.id);
    setShowNew(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this recurring template?')) {
      await recurring.deleteTemplate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-surface-on-variant">{recurring.activeTemplates.length} active templates</p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPaste(true)}
            className="px-3 py-2 bg-surface-container-high text-surface-on-variant rounded-md text-sm font-medium hover:bg-surface-container-highest"
            title="Paste from spreadsheet"
          >
            Paste
          </button>
          <button
            onClick={() => { resetForm(); setShowNew(true); }}
            className="px-4 py-2 bg-primary text-primary-on rounded-md text-sm font-medium hover:bg-primary-600"
          >
            + New Recurring
          </button>
        </div>
      </div>

      {recurring.templates.length === 0 ? (
        <Card className="p-8 text-center text-outline">
          No recurring transactions set up
        </Card>
      ) : (
        <div className="space-y-2">
          {recurring.templates.map(template => {
            const project = template.project_id ? getProjectById(template.project_id) : null;
            const isExpense = template.type === 'expense';
            return (
              <Card
                key={template.id}
                className={`p-3 cursor-pointer hover:shadow-elevation-1 transition-shadow ${!template.is_active ? 'opacity-50' : ''}`}
                onClick={() => handleEdit(template)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isExpense ? 'bg-red-500' : 'bg-green-500'}`} />
                      <p className="font-medium text-surface-on truncate">{template.description}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-surface-on-variant">
                      <span className="capitalize">{FREQUENCY_LABELS[template.frequency]}</span>
                      <span>•</span>
                      <span>Next: {formatDate(template.next_occurrence)}</span>
                      {project && (
                        <>
                          <span>•</span>
                          <span className="truncate">{project.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`font-bold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(template.amount)}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); recurring.toggleActive(template.id, template.is_active); }}
                      className={`w-8 h-5 rounded-full transition-colors ${template.is_active ? 'bg-green-500' : 'bg-outline'}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-surface-container transition-transform ${template.is_active ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Paste from Spreadsheet */}
      <PasteParser
        isOpen={showPaste}
        onClose={() => setShowPaste(false)}
        columns={[
          { key: 'description', label: 'Description', aliases: ['description', 'desc', 'name', 'item', 'service'], required: true },
          { key: 'amount', label: 'Amount', aliases: ['amount', 'cost', 'price', 'total', 'value'], required: true },
          { key: 'frequency', label: 'Frequency', aliases: ['frequency', 'freq', 'cycle', 'period', 'recurrence'] },
          { key: 'type', label: 'Type', aliases: ['type', 'kind'] },
          { key: 'category', label: 'Category', aliases: ['category', 'cat'] },
        ]}
        onImport={async (rows) => {
          const today = new Date().toISOString().split('T')[0];
          for (const row of rows) {
            const freq = (row.frequency || 'monthly').toLowerCase();
            const validFreq = ['weekly', 'monthly', 'quarterly', 'yearly'].includes(freq) ? freq : 'monthly';
            const type = (row.type || 'expense').toLowerCase();
            const validType = ['income', 'expense'].includes(type) ? type : 'expense';
            await recurring.addTemplate({
              description: row.description,
              amount: parseFloat(row.amount) || 0,
              type: validType,
              frequency: validFreq,
              next_occurrence: today,
              category: row.category || null,
              is_active: true,
            });
          }
          setShowPaste(false);
        }}
      />

      {/* New/Edit Recurring Sheet */}
      <Sheet isOpen={showNew} onClose={() => { setShowNew(false); resetForm(); }} title={editingId ? 'Edit Recurring' : 'New Recurring'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-on mb-1">Description *</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary"
              placeholder="e.g., Adobe Creative Cloud"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-on mb-1">Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-on mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-on mb-1">Frequency *</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData(p => ({ ...p, frequency: e.target.value }))}
                className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-on mb-1">Next Date *</label>
              <input
                type="date"
                value={formData.next_occurrence}
                onChange={(e) => setFormData(p => ({ ...p, next_occurrence: e.target.value }))}
                className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-on mb-1">Project</label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData(p => ({ ...p, project_id: e.target.value }))}
              className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary"
            >
              <option value="">None</option>
              {projects?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-on mb-1">End Date (optional)</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData(p => ({ ...p, end_date: e.target.value }))}
              className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={!formData.description.trim() || !formData.amount || !formData.next_occurrence}
            className="w-full py-2 bg-primary text-primary-on rounded-md font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingId ? 'Update' : 'Create'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { handleDelete(editingId); setShowNew(false); resetForm(); }}
              className="w-full py-2 text-red-600 hover:bg-red-500/15 rounded-md text-sm font-medium"
            >
              Delete Template
            </button>
          )}
        </form>
      </Sheet>
    </div>
  );
}

// ==========================================
// INVOICES TAB
// ==========================================

const INVOICE_STATUS_STYLES = {
  draft: 'bg-surface-container-high text-surface-on-variant',
  sent: 'bg-blue-500/15 text-blue-400',
  paid: 'bg-green-500/15 text-green-400',
  overdue: 'bg-red-500/15 text-red-400',
};

function InvoicesTab({ invoices, projects, people, getProjectById, addTransaction }) {
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({
    project_id: '', contact_id: '', invoice_number: '', amount: '',
    description: '', due_date: '', notes: '',
  });

  const filteredInvoices = useMemo(() => {
    if (invoiceFilter === 'all') return invoices.invoices;
    if (invoiceFilter === 'outstanding') return invoices.outstandingInvoices;
    return invoices.invoices.filter(i => i.status === invoiceFilter);
  }, [invoices.invoices, invoices.outstandingInvoices, invoiceFilter]);

  // Sort by issue_date descending
  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => new Date(b.issue_date || b.created_at) - new Date(a.issue_date || a.created_at));
  }, [filteredInvoices]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.amount) return;
    await invoices.addInvoice({
      project_id: formData.project_id || null,
      contact_id: formData.contact_id || null,
      invoice_number: formData.invoice_number || null,
      amount: parseFloat(formData.amount),
      description: formData.description || null,
      status: 'draft',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: formData.due_date || null,
      notes: formData.notes || null,
    });
    setFormData({ project_id: '', contact_id: '', invoice_number: '', amount: '', description: '', due_date: '', notes: '' });
    setShowNew(false);
  };

  const handleMarkSent = async (id) => {
    await invoices.markSent(id);
    setSelectedInvoice(prev => prev ? { ...prev, status: 'sent', date_sent: new Date().toISOString().split('T')[0] } : null);
  };

  const handleMarkPaid = async (invoice) => {
    await invoices.markPaid(invoice.id);
    // Create linked income transaction
    await addTransaction({
      type: 'income',
      amount: invoice.amount,
      description: `Invoice ${invoice.invoice_number || '#' + invoice.id.slice(0, 6)} - ${invoice.description || 'Payment received'}`,
      project_id: invoice.project_id,
      date: new Date().toISOString().split('T')[0],
      status: 'paid',
      invoice_id: invoice.id,
    });
    setSelectedInvoice(prev => prev ? { ...prev, status: 'paid', paid_date: new Date().toISOString().split('T')[0] } : null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this invoice?')) {
      await invoices.deleteInvoice(id);
      setSelectedInvoice(null);
    }
  };

  const getDaysOutstanding = (invoice) => {
    if (invoice.status === 'paid') return null;
    const issued = new Date(invoice.issue_date || invoice.created_at);
    const today = new Date();
    return Math.floor((today - issued) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      {invoices.totalOutstanding > 0 && (
        <Card className="p-4 border-l-4 border-l-amber-400">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-surface-on-variant">Outstanding</p>
              <p className="text-xl font-bold text-surface-on">{formatCurrency(invoices.totalOutstanding)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-surface-on-variant">{invoices.outstandingInvoices.length} invoice{invoices.outstandingInvoices.length !== 1 ? 's' : ''}</p>
              {invoices.overdueInvoices.length > 0 && (
                <p className="text-sm text-red-600 font-medium">{invoices.overdueInvoices.length} overdue</p>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'draft', label: 'Draft' },
            { id: 'sent', label: 'Sent' },
            { id: 'paid', label: 'Paid' },
            { id: 'outstanding', label: 'Outstanding' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setInvoiceFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                invoiceFilter === f.id ? 'bg-surface-on text-surface' : 'bg-surface-container-high text-surface-on-variant hover:bg-surface-container-highest'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowPaste(true)}
            className="px-3 py-2 bg-surface-container-high text-surface-on-variant rounded-md text-sm font-medium hover:bg-surface-container-highest"
            title="Paste from spreadsheet"
          >
            Paste
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2 bg-primary text-primary-on rounded-md text-sm font-medium hover:bg-primary-600"
          >
            + Invoice
          </button>
        </div>
      </div>

      {/* Invoice List */}
      {sortedInvoices.length === 0 ? (
        <Card className="p-8 text-center text-outline">
          No invoices
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedInvoices.map(invoice => {
            const project = invoice.project_id ? getProjectById(invoice.project_id) : null;
            const days = getDaysOutstanding(invoice);
            const isOverdue = invoice.status === 'sent' && invoice.due_date && new Date(invoice.due_date) < new Date();
            return (
              <Card
                key={invoice.id}
                className={`p-3 cursor-pointer hover:shadow-elevation-1 transition-shadow ${isOverdue ? 'border-l-4 border-l-red-400' : ''}`}
                onClick={() => setSelectedInvoice(invoice)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-surface-on truncate">
                        {invoice.invoice_number || `INV-${invoice.id.slice(0, 6)}`}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_STYLES[isOverdue ? 'overdue' : invoice.status]}`}>
                        {isOverdue ? 'Overdue' : invoice.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-surface-on-variant">
                      {project && <span>{project.name}</span>}
                      {invoice.description && (
                        <>
                          {project && <span>•</span>}
                          <span className="truncate">{invoice.description}</span>
                        </>
                      )}
                      {days !== null && days > 0 && (
                        <>
                          <span>•</span>
                          <span className={isOverdue ? 'text-red-500 font-medium' : ''}>{days}d</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-surface-on">{formatCurrency(invoice.amount)}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Invoice Detail Sheet */}
      <Sheet isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title={selectedInvoice?.invoice_number || 'Invoice'}>
        {selectedInvoice && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-surface-on">{formatCurrency(selectedInvoice.amount)}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${INVOICE_STATUS_STYLES[selectedInvoice.status]}`}>
                {selectedInvoice.status}
              </span>
            </div>

            {selectedInvoice.description && (
              <div>
                <p className="text-xs text-outline uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-surface-on">{selectedInvoice.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-outline uppercase tracking-wider mb-1">Issued</p>
                <p className="text-surface-on">{formatDate(selectedInvoice.issue_date)}</p>
              </div>
              {selectedInvoice.due_date && (
                <div>
                  <p className="text-xs text-outline uppercase tracking-wider mb-1">Due</p>
                  <p className="text-surface-on">{formatDate(selectedInvoice.due_date)}</p>
                </div>
              )}
              {selectedInvoice.date_sent && (
                <div>
                  <p className="text-xs text-outline uppercase tracking-wider mb-1">Sent</p>
                  <p className="text-surface-on">{formatDate(selectedInvoice.date_sent)}</p>
                </div>
              )}
              {selectedInvoice.paid_date && (
                <div>
                  <p className="text-xs text-outline uppercase tracking-wider mb-1">Paid</p>
                  <p className="text-surface-on">{formatDate(selectedInvoice.paid_date)}</p>
                </div>
              )}
            </div>

            {selectedInvoice.notes && (
              <div>
                <p className="text-xs text-outline uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-surface-on-variant whitespace-pre-wrap">{selectedInvoice.notes}</p>
              </div>
            )}

            {/* Status Progression */}
            <div className="space-y-2 pt-3 border-t border-outline-variant">
              {selectedInvoice.status === 'draft' && (
                <button
                  onClick={() => handleMarkSent(selectedInvoice.id)}
                  className="w-full py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600"
                >
                  Mark as Sent
                </button>
              )}
              {(selectedInvoice.status === 'sent' || selectedInvoice.status === 'overdue') && (
                <button
                  onClick={() => handleMarkPaid(selectedInvoice)}
                  className="w-full py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600"
                >
                  Mark as Paid (creates income transaction)
                </button>
              )}
            </div>

            <button
              onClick={() => handleDelete(selectedInvoice.id)}
              className="text-sm text-red-600 hover:text-red-400 font-medium"
            >
              Delete Invoice
            </button>
          </div>
        )}
      </Sheet>

      {/* Paste from Spreadsheet */}
      <PasteParser
        isOpen={showPaste}
        onClose={() => setShowPaste(false)}
        columns={[
          { key: 'invoice_number', label: 'Number', aliases: ['number', 'inv', 'invoice', '#', 'no'] },
          { key: 'amount', label: 'Amount', aliases: ['amount', 'total', 'value', 'price'], required: true },
          { key: 'description', label: 'Description', aliases: ['description', 'desc', 'for', 'item', 'service'] },
          { key: 'due_date', label: 'Due Date', aliases: ['due', 'due_date', 'due date', 'date'] },
          { key: 'project', label: 'Project', aliases: ['project', 'scope'] },
        ]}
        onImport={async (rows) => {
          for (const row of rows) {
            const matchedProject = row.project
              ? projects.find(p => p.name.toLowerCase().includes(row.project.toLowerCase()))
              : null;
            await invoices.addInvoice({
              invoice_number: row.invoice_number || null,
              amount: parseFloat(row.amount) || 0,
              description: row.description || null,
              status: 'draft',
              issue_date: new Date().toISOString().split('T')[0],
              due_date: row.due_date || null,
              project_id: matchedProject?.id || null,
              notes: null,
            });
          }
          setShowPaste(false);
        }}
      />

      {/* New Invoice Sheet */}
      <Sheet isOpen={showNew} onClose={() => setShowNew(false)} title="New Invoice">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-on mb-1">Invoice Number</label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData(p => ({ ...p, invoice_number: e.target.value }))}
              className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary"
              placeholder="e.g., INV-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-on mb-1">Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
              className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary"
              placeholder="0.00"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-on mb-1">Project</label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData(p => ({ ...p, project_id: e.target.value }))}
              className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary"
            >
              <option value="">None</option>
              {projects?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-on mb-1">Contact</label>
            <select
              value={formData.contact_id}
              onChange={(e) => setFormData(p => ({ ...p, contact_id: e.target.value }))}
              className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary"
            >
              <option value="">None</option>
              {people?.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.company ? ` (${p.company})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-on mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary"
              placeholder="What is this invoice for?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-on mb-1">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(p => ({ ...p, due_date: e.target.value }))}
              className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={!formData.amount}
            className="w-full py-2 bg-primary text-primary-on rounded-md font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Invoice
          </button>
        </form>
      </Sheet>
    </div>
  );
}

// ==========================================
// PASTE PARSER (shared by Recurring & Invoices)
// ==========================================

function PasteParser({ isOpen, onClose, columns, onImport }) {
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState([]);
  const [importing, setImporting] = useState(false);

  // Parse pasted text (TSV or CSV)
  const handleParse = useCallback((text) => {
    setRawText(text);
    if (!text.trim()) { setParsed([]); return; }

    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { setParsed([]); return; }

    // Detect delimiter: tab or comma
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const rows = lines.map(l => l.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, '')));

    // Try to match first row as headers
    const firstRow = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    let columnMap = {};
    let dataStartIdx = 0;

    // Check if first row looks like headers
    const headerMatches = columns.filter(col => {
      const idx = firstRow.findIndex(h =>
        col.aliases.some(a => a.replace(/[^a-z0-9]/g, '') === h) || h === col.key
      );
      if (idx !== -1) { columnMap[col.key] = idx; return true; }
      return false;
    });

    if (headerMatches.length >= 1) {
      dataStartIdx = 1;
    } else {
      columns.forEach((col, i) => {
        if (i < rows[0].length) columnMap[col.key] = i;
      });
    }

    const result = rows.slice(dataStartIdx).map(row => {
      const obj = {};
      columns.forEach(col => {
        if (columnMap[col.key] !== undefined && row[columnMap[col.key]]) {
          obj[col.key] = row[columnMap[col.key]];
        }
      });
      return obj;
    }).filter(obj => {
      return columns.some(col => col.required && obj[col.key]);
    });

    setParsed(result);
  }, [columns]);

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    try {
      await onImport(parsed);
      setRawText('');
      setParsed([]);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={() => { onClose(); setRawText(''); setParsed([]); }} title="Paste from Spreadsheet">
      <div className="space-y-4">
        <p className="text-sm text-surface-on-variant">
          Copy rows from a spreadsheet and paste below. Columns: {columns.map(c => c.label).join(', ')}
        </p>

        <textarea
          value={rawText}
          onChange={(e) => handleParse(e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text');
            handleParse(text);
          }}
          rows={6}
          className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary font-mono text-sm"
          placeholder="Paste spreadsheet data here (tab or comma separated)..."
          autoFocus
        />

        {parsed.length > 0 && (
          <div>
            <p className="text-sm font-medium text-surface-on mb-2">
              Preview ({parsed.length} row{parsed.length !== 1 ? 's' : ''})
            </p>
            <div className="max-h-64 overflow-y-auto border border-outline-variant rounded-md">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface border-b border-outline-variant">
                    {columns.map(col => (
                      <th key={col.key} className="px-2 py-1.5 text-left font-medium text-surface-on-variant">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((row, i) => (
                    <tr key={i} className="border-b border-outline-variant">
                      {columns.map(col => (
                        <td key={col.key} className="px-2 py-1.5 text-surface-on truncate max-w-[120px]">
                          {row[col.key] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={parsed.length === 0 || importing}
          className="w-full py-2 bg-primary text-primary-on rounded-md font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? 'Importing...' : `Import ${parsed.length} row${parsed.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </Sheet>
  );
}
