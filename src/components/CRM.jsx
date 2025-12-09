import { useState } from 'react';
import { Opportunities } from './Opportunities';
import { useCRM } from '@/hooks/useCRM';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { formatDate } from '@/lib/utils';

export function CRM() {
  const [activeTab, setActiveTab] = useState('pipeline');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">CRM</h2>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <TabButton 
            active={activeTab === 'pipeline'} 
            onClick={() => setActiveTab('pipeline')} 
            label="Pipeline" 
          />
          <TabButton 
            active={activeTab === 'contacts'} 
            onClick={() => setActiveTab('contacts')} 
            label="Contacts" 
          />
          <TabButton 
            active={activeTab === 'activities'} 
            onClick={() => setActiveTab('activities')} 
            label="Activities" 
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'pipeline' && <Opportunities />}
        {activeTab === 'contacts' && <ContactsView />}
        {activeTab === 'activities' && <ActivitiesView />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
        active 
          ? 'bg-white text-gray-900 shadow-sm' 
          : 'text-gray-500 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );
}

function ContactsView() {
  const { contacts, loading, addContact, deleteContact } = useCRM();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', company: '', email: '', phone: '', notes: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addContact(formData);
    setIsSheetOpen(false);
    setFormData({ name: '', company: '', email: '', phone: '', notes: '' });
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading contacts...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsSheetOpen(true)}>+ Add Contact</Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contacts?.map(contact => (
              <tr key={contact.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs mr-3">
                      {contact.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                      <div className="text-sm text-gray-500">{contact.company}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{contact.email}</div>
                  <div className="text-sm text-gray-500">{contact.phone}</div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-500 line-clamp-2 max-w-xs">{contact.notes}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => window.confirm('Delete contact?') && deleteContact(contact.id)}
                    className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {contacts?.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No contacts found. Add one to get started!
          </div>
        )}
      </div>

      <Sheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} title="New Contact">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input required className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="label">Company</label>
              <input className="input" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="Acme Inc." />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jane@example.com" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 (555) 000-0000" />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input min-h-[100px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Key details about this contact..." />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
            <Button type="submit">Create Contact</Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

function ActivitiesView() {
  const { activities, loading, logActivity } = useCRM();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [formData, setFormData] = useState({ type: 'call', notes: '', date: new Date().toISOString().split('T')[0] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await logActivity(formData);
    setIsSheetOpen(false);
    setFormData({ type: 'call', notes: '', date: new Date().toISOString().split('T')[0] });
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading activities...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsSheetOpen(true)}>+ Log Activity</Button>
      </div>

      <div className="space-y-4">
        {activities?.map(activity => (
          <div key={activity.id} className="bg-white p-4 rounded-xl border border-gray-200 flex items-start space-x-4 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
              activity.type === 'call' ? 'bg-blue-50 text-blue-600' : 
              activity.type === 'email' ? 'bg-purple-50 text-purple-600' : 
              activity.type === 'meeting' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-600'
            }`}>
              {activity.type === 'call' ? '📞' : activity.type === 'email' ? '📧' : activity.type === 'meeting' ? '👥' : '📝'}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-gray-900 capitalize">{activity.type}</h4>
                  <p className="text-gray-600 text-sm mt-1">{activity.notes}</p>
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{formatDate(activity.date)}</span>
              </div>
            </div>
          </div>
        ))}
         {activities?.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            No activities logged yet.
          </div>
        )}
      </div>

      <Sheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} title="Log Activity">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="label">Type</label>
              <div className="grid grid-cols-2 gap-3">
                {['call', 'email', 'meeting', 'note'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({...formData, type})}
                    className={`p-3 rounded-lg border text-center capitalize transition-all ${
                      formData.type === type 
                        ? 'border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-500' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea required className="input min-h-[120px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="What happened?" />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
            <Button type="submit">Log Activity</Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
