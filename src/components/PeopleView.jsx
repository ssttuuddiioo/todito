import { useState, useMemo } from 'react';
import { usePeople } from '@/hooks/usePeople';
import { useOpportunities } from '@/hooks/useOpportunities';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { formatDate } from '@/lib/utils';

export function PeopleView({ onNavigate }) {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showNewPerson, setShowNewPerson] = useState(false);
  const [showLogContact, setShowLogContact] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);

  const {
    peopleWithLastContact,
    loading,
    addPerson,
    editPerson,
    deletePerson,
    logInteraction,
    getInteractionsForPerson,
  } = usePeople();
  const { addOpportunity } = useOpportunities();

  // Board columns
  const COLUMNS = [
    { id: 'lead', label: 'Leads', color: 'border-orange-400', bgHeader: 'bg-orange-50 text-orange-700', roles: ['lead'] },
    { id: 'prospect', label: 'Prospects', color: 'border-yellow-400', bgHeader: 'bg-yellow-50 text-yellow-700', roles: ['prospect'] },
    { id: 'client', label: 'Clients & Partners', color: 'border-blue-400', bgHeader: 'bg-blue-50 text-blue-700', roles: ['client', 'partner'] },
  ];

  // Sort helper: last contact (most recent first), then name
  const sortPeople = (list) => {
    return [...list].sort((a, b) => {
      if (a.lastInteraction && b.lastInteraction) {
        return new Date(b.lastInteraction.date) - new Date(a.lastInteraction.date);
      }
      if (a.lastInteraction) return -1;
      if (b.lastInteraction) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  // Group people into columns
  const columnData = useMemo(() => {
    return COLUMNS.map(col => ({
      ...col,
      people: sortPeople(
        peopleWithLastContact.filter(p => col.roles.includes(p.role || p.status || 'lead'))
      ),
    }));
  }, [peopleWithLastContact]);

  // Uncategorized (inactive, etc.)
  const allKnownRoles = COLUMNS.flatMap(c => c.roles);
  const uncategorized = useMemo(() => {
    return sortPeople(
      peopleWithLastContact.filter(p => !allKnownRoles.includes(p.role || p.status || 'lead'))
    );
  }, [peopleWithLastContact]);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this contact? Their interaction history will also be deleted.')) {
      await deletePerson(id);
      setSelectedPerson(null);
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
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <Button onClick={() => setShowNewPerson(true)}>
          + Add Contact
        </Button>
      </div>

      {/* 3-Column Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columnData.map(col => (
          <div key={col.id} className={`border-t-2 ${col.color} bg-gray-50/50 rounded-lg`}>
            {/* Column Header */}
            <div className={`px-3 py-2 rounded-t-lg ${col.bgHeader} flex items-center justify-between`}>
              <span className="text-sm font-semibold">{col.label}</span>
              <span className="text-xs font-medium opacity-70">{col.people.length}</span>
            </div>

            {/* Column Cards */}
            <div className="p-2 space-y-2 min-h-[120px]">
              {col.people.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No {col.label.toLowerCase()}</p>
              ) : (
                col.people.map(person => (
                  <ContactCard
                    key={person.id}
                    person={person}
                    onClick={() => setSelectedPerson(person)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Uncategorized / Inactive */}
      {uncategorized.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Other</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {uncategorized.map(person => (
              <ContactCard
                key={person.id}
                person={person}
                onClick={() => setSelectedPerson(person)}
              />
            ))}
          </div>
        </div>
      )}

      {/* New Person Sheet */}
      <NewPersonSheet 
        isOpen={showNewPerson}
        onClose={() => setShowNewPerson(false)}
        onSave={addPerson}
      />

      {/* Person Detail Sheet */}
      {selectedPerson && (
        <PersonDetailSheet
          isOpen={!!selectedPerson}
          onClose={() => setSelectedPerson(null)}
          person={selectedPerson}
          interactions={getInteractionsForPerson(selectedPerson.id)}
          onEdit={editPerson}
          onDelete={() => handleDelete(selectedPerson.id)}
          onLogContact={() => setShowLogContact(true)}
          onCreateDeal={() => setShowCreateDeal(true)}
        />
      )}

      {/* Log Contact Sheet */}
      {selectedPerson && (
        <LogContactSheet
          isOpen={showLogContact}
          onClose={() => setShowLogContact(false)}
          person={selectedPerson}
          onSave={logInteraction}
        />
      )}

      {/* Create Deal from Person Sheet */}
      {selectedPerson && (
        <CreateDealFromPersonSheet
          isOpen={showCreateDeal}
          onClose={() => setShowCreateDeal(false)}
          person={selectedPerson}
          onSave={addOpportunity}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

function ContactCard({ person, onClick }) {
  return (
    <Card
      className="p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <p className="font-medium text-gray-900 text-sm leading-snug">{person.name}</p>
      {person.company && (
        <p className="text-xs text-gray-500 mt-0.5">{person.company}</p>
      )}
      {person.email && (
        <p className="text-xs text-gray-400 mt-0.5 truncate">{person.email}</p>
      )}
      {person.lastInteraction && (
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-400">
          <span className="capitalize">{person.lastInteraction.type}</span>
          <span>·</span>
          <span>{formatDate(person.lastInteraction.date)}</span>
        </div>
      )}
    </Card>
  );
}

function RoleBadge({ role }) {
  const styles = {
    client: 'bg-blue-100 text-blue-700',
    prospect: 'bg-yellow-100 text-yellow-700',
    lead: 'bg-orange-100 text-orange-700',
    partner: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
  };
  
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${styles[role] || styles.lead}`}>
      {role}
    </span>
  );
}

function NewPersonSheet({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'client',
    company: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setSaving(true);
    try {
      const result = await onSave({
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        role: formData.role,
        company: formData.company.trim() || null,
        notes: formData.notes.trim() || null,
      });
      
      if (result.error) {
        throw result.error;
      }
      
      setFormData({ name: '', email: '', phone: '', role: 'client', company: '', notes: '' });
      onClose();
    } catch (err) {
      console.error('Failed to add person:', err);
      alert('Failed to add person: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Add Person">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., Mark DiNatale"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="client">Client</option>
            <option value="prospect">Prospect</option>
            <option value="lead">Lead</option>
            <option value="partner">Partner</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
          <input
            type="text"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Company name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="email@example.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="555-555-5555"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Additional notes..."
          />
        </div>
        
        <Button type="submit" disabled={saving || !formData.name.trim()} className="w-full">
          {saving ? 'Adding...' : 'Add Person'}
        </Button>
      </form>
    </Sheet>
  );
}

function PersonDetailSheet({ isOpen, onClose, person, interactions, onEdit, onDelete, onLogContact, onCreateDeal }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const handleSave = async () => {
    await onEdit(person.id, editData);
    setEditing(false);
    setEditData({});
  };

  if (editing) {
    return (
      <Sheet isOpen={isOpen} onClose={() => { setEditing(false); onClose(); }} title="Edit Person">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={editData.name ?? person.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={editData.role ?? person.role ?? person.status}
              onChange={(e) => setEditData({ ...editData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="client">Client</option>
              <option value="prospect">Prospect</option>
              <option value="lead">Lead</option>
              <option value="partner">Partner</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={editData.email ?? person.email ?? ''}
              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={editData.phone ?? person.phone ?? ''}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={editData.notes ?? person.notes ?? ''}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setEditing(false); setEditData({}); }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={person.name}>
      <div className="space-y-6">
        {/* Contact Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <RoleBadge role={person.role || person.status} />
            <button 
              onClick={() => setEditing(true)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Edit
            </button>
          </div>
          
          {person.company && (
            <p className="text-sm text-gray-500">Company: {person.company}</p>
          )}
          
          {person.email && (
            <a 
              href={`mailto:${person.email}`}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <span>📧</span>
              {person.email}
            </a>
          )}
          
          {person.phone && (
            <a 
              href={`tel:${person.phone}`}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <span>📞</span>
              {person.phone}
            </a>
          )}
          
          {person.notes && (
            <p className="text-sm text-gray-600">{person.notes}</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          {person.email && (
            <a 
              href={`mailto:${person.email}`}
              className="flex-1 px-4 py-2 text-center text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              📧 Email
            </a>
          )}
          {person.phone && (
            <a 
              href={`tel:${person.phone}`}
              className="flex-1 px-4 py-2 text-center text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              📞 Call
            </a>
          )}
          <button
            onClick={onLogContact}
            className="flex-1 px-4 py-2 text-center text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            + Log Contact
          </button>
          {(person.status === 'lead' || person.status === 'prospect' ||
            person.role === 'lead' || person.role === 'prospect') && (
            <button
              onClick={onCreateDeal}
              className="flex-1 px-4 py-2 text-center text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              + Deal
            </button>
          )}
        </div>

        {/* Interaction History */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Contact History</h3>
          
          {interactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No interactions logged yet
            </p>
          ) : (
            <div className="space-y-3">
              {interactions.map(interaction => (
                <div key={interaction.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500 capitalize">
                      {interaction.type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(interaction.date)}
                    </span>
                  </div>
                  {interaction.note && (
                    <p className="text-sm text-gray-700">{interaction.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={onDelete}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Delete Person
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function LogContactSheet({ isOpen, onClose, person, onSave }) {
  const [formData, setFormData] = useState({
    type: 'email',
    date: new Date().toISOString().split('T')[0],
    note: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSaving(true);
    try {
      await onSave({
        person_id: person.id,
        type: formData.type,
        date: formData.date,
        note: formData.note.trim() || null,
      });
      setFormData({ type: 'email', date: new Date().toISOString().split('T')[0], note: '' });
      onClose();
    } catch (err) {
      console.error('Failed to log contact:', err);
      alert('Failed to log contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={`Log Contact - ${person.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="email">Email</option>
            <option value="call">Call</option>
            <option value="meeting">Meeting</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="What did you discuss?"
          />
        </div>
        
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Sheet>
  );
}

function CreateDealFromPersonSheet({ isOpen, onClose, person, onSave, onNavigate }) {
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    next_action: '',
    expected_close: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      await onSave({
        title: formData.title.trim(),
        contact_id: person.id,
        value: parseFloat(formData.value) || 0,
        stage: 'lead',
        next_action: formData.next_action,
        expected_close: formData.expected_close || null,
        notes: formData.notes,
      });
      setFormData({ title: '', value: '', next_action: '', expected_close: '', notes: '' });
      onClose();
      if (onNavigate) onNavigate('deals');
    } catch (err) {
      console.error('Failed to create deal:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={`New Deal - ${person.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deal Name *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., Website redesign"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Next Action</label>
          <input
            type="text"
            value={formData.next_action}
            onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., Send proposal"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close</label>
          <input
            type="date"
            value={formData.expected_close}
            onChange={(e) => setFormData({ ...formData, expected_close: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Additional context..."
          />
        </div>
        <Button type="submit" disabled={saving || !formData.title.trim()} className="w-full">
          {saving ? 'Creating...' : 'Create Deal'}
        </Button>
      </form>
    </Sheet>
  );
}
