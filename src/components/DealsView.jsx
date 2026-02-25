import { useState, useMemo } from 'react';
import { useOpportunities } from '@/hooks/useOpportunities';
import { usePeople } from '@/hooks/usePeople';
import { useProjects } from '@/hooks/useProjects';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils';

const STAGES = [
  { id: 'lead', label: 'Lead', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700' },
  { id: 'proposal', label: 'Proposal', color: 'bg-purple-500', light: 'bg-purple-50 text-purple-700' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700' },
  { id: 'won', label: 'Won', color: 'bg-green-500', light: 'bg-green-50 text-green-700' },
  { id: 'lost', label: 'Lost', color: 'bg-gray-400', light: 'bg-gray-100 text-gray-500' },
];

function getContactName(deal, people) {
  if (deal.contact_id) {
    const contact = people.find(p => p.id === deal.contact_id);
    if (contact) return contact.name;
  }
  return deal.contact || '';
}

export function DealsView({ onNavigate }) {
  const {
    opportunities, loading, addOpportunity, updateOpportunity, deleteOpportunity,
    markAsWon, markAsLost, opportunitiesByStage, pipelineValue,
  } = useOpportunities();
  const { people } = usePeople();
  const { addProject } = useProjects();

  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [showClosed, setShowClosed] = useState(false);

  // New deal form state
  const [newDeal, setNewDeal] = useState({
    title: '', value: '', contact_id: '', stage: 'lead',
    next_action: '', expected_close: '', notes: '',
  });

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!newDeal.title.trim()) return;
    await addOpportunity({
      title: newDeal.title.trim(),
      value: parseFloat(newDeal.value) || 0,
      contact_id: newDeal.contact_id || null,
      stage: newDeal.stage,
      next_action: newDeal.next_action,
      expected_close: newDeal.expected_close || null,
      notes: newDeal.notes,
    });
    setNewDeal({ title: '', value: '', contact_id: '', stage: 'lead', next_action: '', expected_close: '', notes: '' });
    setShowNewDeal(false);
  };

  const handleUpdateDeal = async () => {
    if (!selectedDeal) return;
    await updateOpportunity(selectedDeal.id, editData);
    setSelectedDeal({ ...selectedDeal, ...editData });
    setEditMode(false);
    setEditData({});
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this deal?')) {
      await deleteOpportunity(id);
      setSelectedDeal(null);
    }
  };

  const handleCreateProjectFromDeal = async (deal) => {
    const contact = people.find(p => p.id === deal.contact_id);
    const { data: newProject } = await addProject({
      name: deal.title,
      client: contact?.company || contact?.name || '',
      status: 'active',
      budget: deal.value || null,
    });
    if (newProject) {
      await markAsWon(deal.id, newProject.id);
      setSelectedDeal(prev => ({ ...prev, stage: 'won', project_id: newProject.id }));
    }
  };

  const activeStages = STAGES.filter(s => s.id !== 'won' && s.id !== 'lost');
  const closedStages = STAGES.filter(s => s.id === 'won' || s.id === 'lost');

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pipeline: <span className="font-semibold text-gray-700">{formatCurrency(pipelineValue)}</span>
          </p>
        </div>
        <button
          onClick={() => setShowNewDeal(true)}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          + New Deal
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
        {activeStages.map(stage => {
          const deals = opportunitiesByStage[stage.id] || [];
          const stageTotal = deals.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0);
          return (
            <div key={stage.id} className="flex-shrink-0 w-72">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
                  <span className="text-xs text-gray-400">{deals.length}</span>
                </div>
                {stageTotal > 0 && (
                  <span className="text-xs text-gray-400">{formatCurrency(stageTotal)}</span>
                )}
              </div>
              {/* Cards */}
              <div className="space-y-2">
                {deals.map(deal => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    people={people}
                    onClick={() => { setSelectedDeal(deal); setEditMode(false); }}
                  />
                ))}
                {deals.length === 0 && (
                  <div className="text-center py-8 text-gray-300 text-xs">No deals</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Won/Lost Section */}
      <div>
        <button
          onClick={() => setShowClosed(!showClosed)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${showClosed ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Closed ({(opportunitiesByStage.won?.length || 0) + (opportunitiesByStage.lost?.length || 0)})
        </button>
        {showClosed && (
          <div className="flex gap-4 mt-3">
            {closedStages.map(stage => {
              const deals = opportunitiesByStage[stage.id] || [];
              return (
                <div key={stage.id} className="flex-1">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                    <span className="text-sm font-semibold text-gray-500">{stage.label}</span>
                    <span className="text-xs text-gray-400">{deals.length}</span>
                  </div>
                  <div className="space-y-2">
                    {deals.map(deal => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        people={people}
                        onClick={() => { setSelectedDeal(deal); setEditMode(false); }}
                        muted
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deal Detail Sheet */}
      <Sheet isOpen={!!selectedDeal} onClose={() => setSelectedDeal(null)} title={selectedDeal?.title || 'Deal'}>
        {selectedDeal && (
          <DealDetail
            deal={selectedDeal}
            people={people}
            editMode={editMode}
            editData={editData}
            onEdit={() => { setEditMode(true); setEditData({ ...selectedDeal }); }}
            onEditChange={(field, value) => setEditData(prev => ({ ...prev, [field]: value }))}
            onSave={handleUpdateDeal}
            onCancel={() => { setEditMode(false); setEditData({}); }}
            onDelete={() => handleDelete(selectedDeal.id)}
            onStageChange={async (stage) => {
              await updateOpportunity(selectedDeal.id, { stage });
              setSelectedDeal(prev => ({ ...prev, stage }));
            }}
            onCreateProject={() => handleCreateProjectFromDeal(selectedDeal)}
            onNavigate={onNavigate}
          />
        )}
      </Sheet>

      {/* New Deal Sheet */}
      <Sheet isOpen={showNewDeal} onClose={() => setShowNewDeal(false)} title="New Deal">
        <form onSubmit={handleCreateDeal} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deal Name *</label>
            <input
              type="text"
              value={newDeal.title}
              onChange={(e) => setNewDeal(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Website redesign for Acme"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newDeal.value}
              onChange={(e) => setNewDeal(prev => ({ ...prev, value: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
            <select
              value={newDeal.contact_id}
              onChange={(e) => setNewDeal(prev => ({ ...prev, contact_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">None</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.company ? ` (${p.company})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <select
              value={newDeal.stage}
              onChange={(e) => setNewDeal(prev => ({ ...prev, stage: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {STAGES.filter(s => s.id !== 'won' && s.id !== 'lost').map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Action</label>
            <input
              type="text"
              value={newDeal.next_action}
              onChange={(e) => setNewDeal(prev => ({ ...prev, next_action: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Send proposal by Friday"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close</label>
            <input
              type="date"
              value={newDeal.expected_close}
              onChange={(e) => setNewDeal(prev => ({ ...prev, expected_close: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={newDeal.notes}
              onChange={(e) => setNewDeal(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              placeholder="Additional context..."
            />
          </div>
          <button
            type="submit"
            disabled={!newDeal.title.trim()}
            className="w-full py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Deal
          </button>
        </form>
      </Sheet>
    </div>
  );
}

function DealCard({ deal, people, onClick, muted = false }) {
  const contactName = getContactName(deal, people);
  const closeDate = deal.expected_close;
  const days = closeDate ? daysUntil(closeDate) : null;
  const isOverdue = days !== null && days < 0;

  return (
    <Card
      className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${muted ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-sm font-semibold text-gray-900 leading-tight">{deal.title}</h3>
        {deal.value > 0 && (
          <span className="text-sm font-semibold text-gray-700 ml-2 flex-shrink-0">
            {formatCurrency(deal.value)}
          </span>
        )}
      </div>
      {contactName && (
        <p className="text-xs text-gray-400 mb-1">{contactName}</p>
      )}
      {deal.next_action && (
        <p className="text-xs text-gray-500 mb-1 truncate">{deal.next_action}</p>
      )}
      {closeDate && (
        <p className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
        </p>
      )}
    </Card>
  );
}

function DealDetail({ deal, people, editMode, editData, onEdit, onEditChange, onSave, onCancel, onDelete, onStageChange, onCreateProject, onNavigate }) {
  const contactName = getContactName(deal, people);
  const stageInfo = STAGES.find(s => s.id === deal.stage) ||
    STAGES.find(s => s.id === (deal.stage === 'closed_won' ? 'won' : deal.stage === 'closed_lost' ? 'lost' : deal.stage));

  const isWon = deal.stage === 'won' || deal.stage === 'closed_won';
  const isLost = deal.stage === 'lost' || deal.stage === 'closed_lost';
  const isClosed = isWon || isLost;

  if (editMode) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deal Name</label>
          <input
            type="text"
            value={editData.title || ''}
            onChange={(e) => onEditChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
          <input
            type="number"
            step="0.01"
            value={editData.value || ''}
            onChange={(e) => onEditChange('value', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
          <select
            value={editData.contact_id || ''}
            onChange={(e) => onEditChange('contact_id', e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">None</option>
            {people.map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.company ? ` (${p.company})` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Next Action</label>
          <input
            type="text"
            value={editData.next_action || ''}
            onChange={(e) => onEditChange('next_action', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close</label>
          <input
            type="date"
            value={editData.expected_close || ''}
            onChange={(e) => onEditChange('expected_close', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={editData.notes || ''}
            onChange={(e) => onEditChange('notes', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            rows={3}
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onSave} className="flex-1 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600">Save</button>
          <button onClick={onCancel} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Value + Stage */}
      <div className="flex items-center justify-between">
        {deal.value > 0 && (
          <span className="text-2xl font-bold text-gray-900">{formatCurrency(deal.value)}</span>
        )}
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stageInfo?.light || 'bg-gray-100 text-gray-600'}`}>
          {stageInfo?.label || deal.stage}
        </span>
      </div>

      {/* Contact */}
      {contactName && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Contact</p>
          <p className="text-sm text-gray-700">{contactName}</p>
        </div>
      )}

      {/* Next Action */}
      {deal.next_action && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Next Action</p>
          <p className="text-sm text-gray-700">{deal.next_action}</p>
        </div>
      )}

      {/* Expected Close */}
      {deal.expected_close && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Expected Close</p>
          <p className="text-sm text-gray-700">{formatDate(deal.expected_close)}</p>
        </div>
      )}

      {/* Notes */}
      {deal.notes && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Notes</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{deal.notes}</p>
        </div>
      )}

      {/* Stage Progression */}
      {!isClosed && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Move to</p>
          <div className="flex flex-wrap gap-2">
            {STAGES.filter(s => s.id !== deal.stage).map(s => (
              <button
                key={s.id}
                onClick={() => onStageChange(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                  ${s.id === 'won' ? 'border-green-300 text-green-700 hover:bg-green-50' :
                    s.id === 'lost' ? 'border-gray-300 text-gray-500 hover:bg-gray-50' :
                    'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create Project (for won deals without a linked project) */}
      {isWon && !deal.project_id && (
        <button
          onClick={onCreateProject}
          className="w-full py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
        >
          Create Project from Deal
        </button>
      )}

      {/* Linked project */}
      {deal.project_id && (
        <button
          onClick={() => onNavigate?.('projects')}
          className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          View Linked Project
        </button>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <button onClick={onEdit} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
          Edit
        </button>
        <button onClick={onDelete} className="py-2 px-4 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}
