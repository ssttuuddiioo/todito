import { useState } from 'react';
import { useFinance } from '@/hooks/useFinance';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { formatDate } from '@/lib/utils';

export function Revenue() {
  const { invoices, loading, addInvoice, updateInvoiceStatus, getTotalRevenue } = useFinance();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [formData, setFormData] = useState({ client_name: '', total_amount: '', due_date: '', status: 'draft' });

  const totalRevenue = getTotalRevenue();
  const pendingRevenue = invoices
    ?.filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addInvoice(formData);
    setIsSheetOpen(false);
    setFormData({ client_name: '', total_amount: '', due_date: '', status: 'draft' });
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading revenue data...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Revenue</h2>
        <Button onClick={() => setIsSheetOpen(true)}>+ New Invoice</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <div className="flex items-center space-x-3 mb-2">
            <span className="bg-green-100 p-2 rounded-lg text-green-700">💰</span>
            <h3 className="text-sm font-medium text-green-900">Total Collected</h3>
          </div>
          <p className="text-3xl font-bold text-green-900 tracking-tight">${totalRevenue.toLocaleString()}</p>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <div className="flex items-center space-x-3 mb-2">
            <span className="bg-blue-100 p-2 rounded-lg text-blue-700">⏳</span>
            <h3 className="text-sm font-medium text-blue-900">Pending Invoices</h3>
          </div>
          <p className="text-3xl font-bold text-blue-900 tracking-tight">${pendingRevenue.toLocaleString()}</p>
        </Card>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-semibold text-gray-900">Recent Invoices</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {invoices?.length === 0 ? (
             <div className="p-12 text-center text-gray-500">No invoices found. Create one to get started.</div>
          ) : (
            invoices?.map(invoice => (
              <div key={invoice.id} className="p-4 hover:bg-gray-50 transition-colors group flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                    invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {invoice.client_name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{invoice.client_name}</div>
                    <div className="text-sm text-gray-500">
                      Due {formatDate(invoice.due_date)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                  <StatusBadge status={invoice.status} />
                  <span className="text-lg font-bold text-gray-900 w-24 text-right">
                    ${Number(invoice.total_amount).toLocaleString()}
                  </span>
                  
                  <select 
                    className="text-xs border-gray-200 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-gray-50 py-1 pl-2 pr-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    value={invoice.status}
                    onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Sheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} title="Create Invoice">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div><label className="label">Client Name</label><input required className="input" value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} /></div>
            <div><label className="label">Amount ($)</label><input required type="number" className="input" value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: e.target.value})} /></div>
            <div><label className="label">Due Date</label><input required type="date" className="input" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} /></div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Create Invoice</Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    sent: 'bg-blue-50 text-blue-700 border-blue-100',
    paid: 'bg-green-50 text-green-700 border-green-100',
    overdue: 'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide border ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}
