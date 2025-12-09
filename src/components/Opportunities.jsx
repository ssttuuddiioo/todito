import { useState } from 'react';
import { useOpportunities } from '@/hooks/useOpportunities';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils';

const STAGES = [
  { id: 'lead', label: 'Lead', icon: '💡', color: 'gray' },
  { id: 'proposal', label: 'Proposal', icon: '📄', color: 'blue' },
  { id: 'negotiation', label: 'Negotiation', icon: '🤝', color: 'purple' },
  { id: 'won', label: 'Won', icon: '✅', color: 'green' },
  { id: 'lost', label: 'Lost', icon: '❌', color: 'red' },
];

export function Opportunities() {
  const { opportunities, loading, addOpportunity, updateOpportunity, deleteOpportunity } = useOpportunities();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [filter, setFilter] = useState('active'); // active, won, lost, all

  const [formData, setFormData] = useState({
    name: '', contact: '', value: '', stage: 'lead',
    next_action: '', due_date: '', notes: '', drive_folder_link: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const oppData = {
      ...formData,
      value: parseFloat(formData.value) || 0,
      due_date: formData.due_date || null,
    };

    if (editingOpp) {
      await updateOpportunity(editingOpp.id, oppData);
    } else {
      await addOpportunity(oppData);
    }
    setIsSheetOpen(false);
    resetForm();
  };

  const handleEdit = (opp) => {
    setEditingOpp(opp);
    setFormData({
      name: opp.name,
      contact: opp.contact || '',
      value: opp.value?.toString() || '',
      stage: opp.stage,
      next_action: opp.next_action || '',
      due_date: opp.due_date || '',
      notes: opp.notes || '',
      drive_folder_link: opp.drive_folder_link || '',
    });
    setIsSheetOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this opportunity?')) {
      await deleteOpportunity(id);
    }
  };

  const handleStageChange = async (opp, newStage) => {
    await updateOpportunity(opp.id, { stage: newStage });
  };

  const resetForm = () => {
    setFormData({
      name: '', contact: '', value: '', stage: 'lead',
      next_action: '', due_date: '', notes: '', drive_folder_link: '',
    });
    setEditingOpp(null);
  };

  const filteredOpportunities = opportunities?.filter(opp => {
    if (filter === 'active') return opp.stage !== 'won' && opp.stage !== 'lost';
    if (filter === 'won') return opp.stage === 'won';
    if (filter === 'lost') return opp.stage === 'lost';
    return true;
  }) || [];

  // Group by stage for active opportunities
  const groupedByStage = STAGES.slice(0, 3).map(stage => ({
    ...stage,
    opportunities: filteredOpportunities.filter(o => o.stage === stage.id),
  }));

  if (loading) return <div className="text-center py-12 text-gray-400">Loading pipeline...</div>;

  const activeCount = opportunities?.filter(o => o.stage !== 'won' && o.stage !== 'lost').length || 0;
  const wonCount = opportunities?.filter(o => o.stage === 'won').length || 0;
  const lostCount = opportunities?.filter(o => o.stage === 'lost').length || 0;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        {/* Title handled by parent CRM component, but kept here for standalone usage */}
        <div className="hidden"></div> 
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'active', label: `Active (${activeCount})` },
            { id: 'won', label: `Won (${wonCount})` },
            { id: 'lost', label: `Lost (${lostCount})` },
            { id: 'all', label: 'All' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                filter === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button onClick={() => setIsSheetOpen(true)}>+ Add Deal</Button>
      </div>

      {/* Pipeline View for Active */}
      {filter === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4">
          {groupedByStage.map(stage => (
            <div key={stage.id} className="flex flex-col h-full bg-gray-50/50 rounded-xl border border-gray-100 p-2">
              <div className="flex items-center justify-between p-3 mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xl opacity-80">{stage.icon}</span>
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">{stage.label}</h3>
                </div>
                <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                  {stage.opportunities.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto min-h-[200px]">
                {stage.opportunities.map(opp => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStageChange={handleStageChange}
                  />
                ))}
                {stage.opportunities.length === 0 && (
                  <div className="h-full flex items-center justify-center text-gray-300 text-sm italic border-2 border-dashed border-gray-100 rounded-lg m-2">
                    Empty Stage
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View for Won/Lost/All */}
      {filter !== 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOpportunities.map(opp => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStageChange={handleStageChange}
            />
          ))}
          {filteredOpportunities.length === 0 && (
             <div className="col-span-full py-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
               No opportunities found.
             </div>
          )}
        </div>
      )}

      <Sheet isOpen={isSheetOpen} onClose={() => { setIsSheetOpen(false); resetForm(); }} title={editingOpp ? 'Edit Opportunity' : 'New Opportunity'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div><label className="label">Deal Name *</label><input required className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><label className="label">Contact Person</label><input className="input" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Value ($)</label><input type="number" step="0.01" className="input" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} /></div>
              <div>
                <label className="label">Stage</label>
                <select className="input" value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                </select>
              </div>
            </div>
            <div><label className="label">Next Action</label><input className="input" value={formData.next_action} onChange={e => setFormData({...formData, next_action: e.target.value})} /></div>
            <div><label className="label">Due Date</label><input type="date" className="input" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} /></div>
            <div><label className="label">Notes</label><textarea className="input min-h-[100px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => { setIsSheetOpen(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" className="flex-1">Save Deal</Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

function OpportunityCard({ opportunity, onEdit, onDelete, onStageChange }) {
  const stage = STAGES.find(s => s.id === opportunity.stage);
  const days = daysUntil(opportunity.due_date);
  const isOverdue = days !== null && days < 0;
  
  return (
    <Card className="hover:shadow-md hover:border-primary-200 transition-all duration-200 cursor-pointer group bg-white">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-gray-900 truncate pr-2">{opportunity.name}</h3>
          <span className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded text-sm">
            {formatCurrency(opportunity.value)}
          </span>
        </div>
        
        {opportunity.contact && (
          <p className="text-sm text-gray-500 truncate flex items-center gap-1">
            👤 {opportunity.contact}
          </p>
        )}

        {opportunity.next_action && (
          <div className="text-sm bg-blue-50 text-blue-800 rounded-md p-2 border border-blue-100">
            <span className="font-bold text-xs uppercase opacity-70 block mb-0.5">Next Step</span>
            {opportunity.next_action}
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
           {opportunity.due_date ? (
             <span className={`text-xs font-medium px-2 py-1 rounded ${isOverdue ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
               📅 {formatDate(opportunity.due_date)}
             </span>
           ) : <span></span>}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
           <button onClick={() => onEdit(opportunity)} className="text-xs font-medium text-gray-600 hover:bg-gray-100 py-1.5 rounded">Edit</button>
           <div className="flex justify-end gap-1">
             {opportunity.stage === 'lead' && <button onClick={() => onStageChange(opportunity, 'proposal')} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100">→ Proposal</button>}
             {opportunity.stage === 'proposal' && <button onClick={() => onStageChange(opportunity, 'negotiation')} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded hover:bg-purple-100">→ Negotation</button>}
             {(opportunity.stage === 'negotiation' || opportunity.stage === 'proposal') && (
               <>
                 <button onClick={() => onStageChange(opportunity, 'won')} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100">Won</button>
                 <button onClick={() => onStageChange(opportunity, 'lost')} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded hover:bg-red-100">Lost</button>
               </>
             )}
           </div>
        </div>
      </div>
    </Card>
  );
}
