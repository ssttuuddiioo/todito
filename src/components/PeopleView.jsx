import { useState, useMemo } from 'react';
import { usePeople } from '@/hooks/usePeople';
import { useProjects } from '@/hooks/useProjects';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { formatDate } from '@/lib/utils';

export function PeopleView({ onNavigate }) {
  const [filter, setFilter] = useState('all'); // all, client, vendor, partner
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showNewPerson, setShowNewPerson] = useState(false);
  const [showLogContact, setShowLogContact] = useState(false);
  
  const { 
    peopleWithLastContact, 
    interactions,
    loading, 
    addPerson, 
    editPerson,
    deletePerson,
    logInteraction,
    getInteractionsForPerson,
  } = usePeople();
  const { projects, getProjectById } = useProjects();

  // Filter people
  const filteredPeople = useMemo(() => {
    if (filter === 'all') return peopleWithLastContact;
    return peopleWithLastContact.filter(p => p.role === filter);
  }, [peopleWithLastContact, filter]);

  // Sort by last contact (most recent first), then by name
  const sortedPeople = useMemo(() => {
    return [...filteredPeople].sort((a, b) => {
      if (a.lastInteraction && b.lastInteraction) {
        return new Date(b.lastInteraction.date) - new Date(a.lastInteraction.date);
      }
      if (a.lastInteraction) return -1;
      if (b.lastInteraction) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredPeople]);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this person? Their interaction history will also be deleted.')) {
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
        <h1 className="text-2xl font-bold text-gray-900">People</h1>
        <Button onClick={() => setShowNewPerson(true)}>
          + Add Person
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {[
          { id: 'all', label: 'All' },
          { id: 'client', label: 'Clients' },
          { id: 'vendor', label: 'Vendors' },
          { id: 'partner', label: 'Partners' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              filter === f.id 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* People List */}
      {sortedPeople.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">
          No {filter === 'all' ? 'people' : filter + 's'} added yet
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedPeople.map(person => {
            const project = person.project_id ? getProjectById(person.project_id) : null;
            
            return (
              <Card 
                key={person.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedPerson(person)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{person.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <RoleBadge role={person.role} />
                      {project && (
                        <span className="text-xs text-gray-500">{project.name}</span>
                      )}
                    </div>
                    {person.email && (
                      <p className="text-sm text-gray-500 mt-1">{person.email}</p>
                    )}
                  </div>
                  
                  {person.lastInteraction && (
                    <div className="text-right text-xs text-gray-400">
                      <p>Last: {formatDate(person.lastInteraction.date)}</p>
                      <p className="capitalize">{person.lastInteraction.type}</p>
                    </div>
                  )}
                </div>
                
                {person.lastInteraction?.note && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    "{person.lastInteraction.note}"
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* New Person Sheet */}
      <NewPersonSheet 
        isOpen={showNewPerson}
        onClose={() => setShowNewPerson(false)}
        onSave={addPerson}
        projects={projects}
      />

      {/* Person Detail Sheet */}
      {selectedPerson && (
        <PersonDetailSheet
          isOpen={!!selectedPerson}
          onClose={() => setSelectedPerson(null)}
          person={selectedPerson}
          interactions={getInteractionsForPerson(selectedPerson.id)}
          project={selectedPerson.project_id ? getProjectById(selectedPerson.project_id) : null}
          onEdit={editPerson}
          onDelete={() => handleDelete(selectedPerson.id)}
          onLogContact={() => setShowLogContact(true)}
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
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = {
    client: 'bg-blue-100 text-blue-700',
    vendor: 'bg-purple-100 text-purple-700',
    partner: 'bg-green-100 text-green-700',
  };
  
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${styles[role] || styles.client}`}>
      {role}
    </span>
  );
}

function NewPersonSheet({ isOpen, onClose, onSave, projects }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'client',
    project_id: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setSaving(true);
    try {
      await onSave({
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        role: formData.role,
        project_id: formData.project_id || null,
        notes: formData.notes.trim() || null,
      });
      setFormData({ name: '', email: '', phone: '', role: 'client', project_id: '', notes: '' });
      onClose();
    } catch (err) {
      console.error('Failed to add person:', err);
      alert('Failed to add person');
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
            <option value="vendor">Vendor</option>
            <option value="partner">Partner</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
          <select
            value={formData.project_id}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">No project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
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

function PersonDetailSheet({ isOpen, onClose, person, interactions, project, onEdit, onDelete, onLogContact }) {
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
              value={editData.role ?? person.role}
              onChange={(e) => setEditData({ ...editData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="client">Client</option>
              <option value="vendor">Vendor</option>
              <option value="partner">Partner</option>
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
            <RoleBadge role={person.role} />
            <button 
              onClick={() => setEditing(true)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Edit
            </button>
          </div>
          
          {project && (
            <p className="text-sm text-gray-500">Project: {project.name}</p>
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
        project_id: person.project_id,
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
