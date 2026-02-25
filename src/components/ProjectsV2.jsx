import { useState, useMemo } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useTransactions } from '@/hooks/useTransactions';
import { usePeople } from '@/hooks/usePeople';
import { useTasks } from '@/hooks/useTasks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { AddExpenseSheet } from '@/components/AddExpenseSheet';
import { AddIncomeSheet } from '@/components/AddIncomeSheet';
import { isStructuredFormat, parseStructuredNotes, normalizeWithLLM, parseForNewProject } from '@/lib/note-parser';
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils';

export function ProjectsV2({ onNavigate, initialProjectId, initialTab, onBack: onBackProp }) {
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || null);
  const [filter, setFilter] = useState('active'); // active, complete, all
  const [showNewProject, setShowNewProject] = useState(false);
  
  const { projects, activeProjects, completedProjects, loading, addProject, updateProject, deleteProject } = useProjects();
  const { getExpensesByProject, getIncomeByProject, getProjectTotals } = useTransactions();
  const { getPeopleByProject, getInteractionsForProject } = usePeople();
  const { getTasksByProject } = useTasks();

  const filteredProjects = useMemo(() => {
    switch (filter) {
      case 'active': return activeProjects;
      case 'complete': return completedProjects;
      default: return projects;
    }
  }, [filter, activeProjects, completedProjects, projects]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return null;

    const expenses = getExpensesByProject(project.id);
    const income = getIncomeByProject(project.id);
    const people = getPeopleByProject(project.id);
    const interactions = getInteractionsForProject(project.id);
    const tasks = getTasksByProject(project.id);

    return {
      ...project,
      expensesList: expenses,
      incomeList: income,
      people,
      interactions,
      tasks,
    };
  }, [selectedProjectId, projects, getExpensesByProject, getIncomeByProject, getPeopleByProject, getInteractionsForProject, getTasksByProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Detail View
  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        initialTab={initialTab}
        onBack={onBackProp || (() => setSelectedProjectId(null))}
        onUpdate={updateProject}
        onDelete={deleteProject}
      />
    );
  }

  // List View
  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <Button onClick={() => setShowNewProject(true)}>
          + New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['active', 'complete', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === f 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Project Grid */}
      {filteredProjects.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">
          No {filter === 'all' ? '' : filter} projects
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredProjects.map(project => {
            const totals = getProjectTotals(project.id);
            const margin = totals.income > 0
              ? ((totals.income - totals.expenses) / totals.income) * 100
              : null;
            const marginColor = margin !== null
              ? margin >= 30 ? 'bg-green-100 text-green-700'
              : margin >= 15 ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700'
              : '';
            const budgetPct = project.budget ? (totals.expenses / project.budget) * 100 : null;
            const budgetColor = budgetPct !== null
              ? budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-green-500'
              : '';

            return (
              <Card
                key={project.id}
                className="p-4 cursor-pointer hover:shadow-md transition-all"
                onClick={() => setSelectedProjectId(project.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{project.name}</p>
                    {(project.client || project.client_name) && (
                      <p className="text-sm text-gray-500">{project.client || project.client_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {project.hours_estimate && totals.income > 0 && (() => {
                      const rate = totals.income / project.hours_estimate;
                      const rateColor = rate >= 150 ? 'bg-green-100 text-green-700' :
                                        rate >= 75 ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-700';
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rateColor}`}>
                          {formatCurrency(rate)}/h
                        </span>
                      );
                    })()}
                    {margin !== null && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${marginColor}`}>
                        {Math.round(margin)}% margin
                      </span>
                    )}
                    <StatusBadge status={project.status} />
                  </div>
                </div>

                {project.deadline && (
                  <div className="text-xs text-gray-400">
                    Deadline: {formatDate(project.deadline)}
                  </div>
                )}

                {budgetPct !== null && (
                  <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${budgetColor}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* New Project Sheet */}
      <NewProjectSheet 
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        onSave={addProject}
      />
    </div>
  );
}

function ProjectDetail({ project, initialTab, onBack, onUpdate, onDelete }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showExpenseSheet, setShowExpenseSheet] = useState(false);
  const [showIncomeSheet, setShowIncomeSheet] = useState(false);

  const projIncome = project.incomeList.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const projExpenses = project.expensesList.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const margin = projIncome > 0 ? ((projIncome - projExpenses) / projIncome) * 100 : null;
  const marginColor = margin !== null
    ? margin >= 30 ? 'bg-green-100 text-green-700'
    : margin >= 15 ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700'
    : '';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: `Next Steps (${project.tasks.filter(t => t.status !== 'done').length})` },
    { id: 'expenses', label: `Expenses (${project.expensesList.length})` },
    { id: 'income', label: `Income (${project.incomeList.length})` },
    { id: 'people', label: `People (${project.people.length})` },
    { id: 'parse', label: 'Parse' },
  ];

  const handleSave = async () => {
    await onUpdate(project.id, editData);
    setEditing(false);
    setEditData({});
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this project? This cannot be undone.')) {
      await onDelete(project.id);
      onBack();
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {(project.client || project.client_name) && (
            <p className="text-gray-500">{project.client || project.client_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {margin !== null && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${marginColor}`}>
              {Math.round(margin)}% margin
            </span>
          )}
          <StatusBadge status={project.status} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          project={project}
          editing={editing}
          editData={editData}
          setEditData={setEditData}
          onEdit={() => setEditing(true)}
          onSave={handleSave}
          onCancel={() => { setEditing(false); setEditData({}); }}
          onDelete={handleDelete}
          onUpdate={onUpdate}
        />
      )}
      
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowExpenseSheet(true)}>+ Add Expense</Button>
          </div>
          <TransactionsList transactions={project.expensesList} type="expense" />
        </div>
      )}

      {activeTab === 'income' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowIncomeSheet(true)}>+ Add Income</Button>
          </div>
          <TransactionsList transactions={project.incomeList} type="income" />
        </div>
      )}

      {activeTab === 'people' && (
        <PeopleTab
          people={project.people}
          interactions={project.interactions}
          projectId={project.id}
        />
      )}

      {activeTab === 'tasks' && (
        <TasksTab
          tasks={project.tasks}
          projectId={project.id}
        />
      )}

      {activeTab === 'parse' && (
        <ParseTab
          projectId={project.id}
          projectName={project.name}
          onUpdate={onUpdate}
          project={project}
        />
      )}

      <AddExpenseSheet
        isOpen={showExpenseSheet}
        onClose={() => setShowExpenseSheet(false)}
        preselectedProjectId={project.id}
      />
      <AddIncomeSheet
        isOpen={showIncomeSheet}
        onClose={() => setShowIncomeSheet(false)}
        preselectedProjectId={project.id}
      />
    </div>
  );
}

function TransactionsList({ transactions, type }) {
  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-400">
        No {type === 'expense' ? 'expenses' : 'income'} recorded
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map(t => (
        <Card key={t.id} className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{t.description}</p>
              <p className="text-xs text-gray-500">
                {formatDate(t.date)}
                {t.category && ` • ${t.category}`}
              </p>
            </div>
            <p className={`font-bold ${type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
              {type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function OverviewTab({ project, editing, editData, setEditData, onEdit, onSave, onCancel, onDelete, onUpdate }) {
  const { addTask, updateTask, deleteTask } = useTasks();
  const milestones = (editing ? (editData.milestones ?? project.milestones) : project.milestones) || [];
  const sortedMilestones = [...milestones].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // Task state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Links state
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Notes inline edit state
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(project.notes || '');

  // Milestone inline add
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');

  const activeTasks = (project.tasks || []).filter(t => t.status !== 'done');
  const doneTasks = (project.tasks || []).filter(t => t.status === 'done');

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      await addTask({
        title: newTaskTitle.trim(),
        project_id: project.id,
        due_date: newTaskDueDate || null,
        priority: newTaskPriority || null,
        status: 'todo',
        is_mine: true,
      });
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setNewTaskPriority('');
    } finally {
      setAddingTask(false);
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;
    const currentLinks = project.links || [];
    const newLink = { title: linkTitle.trim() || linkUrl.trim(), url: linkUrl.trim() };
    await onUpdate(project.id, { links: [...currentLinks, newLink] });
    setLinkTitle('');
    setLinkUrl('');
    setShowAddLink(false);
  };

  const handleRemoveLink = async (index) => {
    const currentLinks = [...(project.links || [])];
    currentLinks.splice(index, 1);
    await onUpdate(project.id, { links: currentLinks });
  };

  const handleSaveNotes = async () => {
    setEditingNotes(false);
    if (notesValue !== (project.notes || '')) {
      await onUpdate(project.id, { notes: notesValue });
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim()) return;
    const current = project.milestones || [];
    await onUpdate(project.id, {
      milestones: [...current, { title: newMilestoneTitle.trim(), date: newMilestoneDate || '', completed: false }],
    });
    setNewMilestoneTitle('');
    setNewMilestoneDate('');
    setShowAddMilestone(false);
  };

  const handleRemoveMilestone = async (index) => {
    const current = [...(project.milestones || [])];
    current.splice(index, 1);
    await onUpdate(project.id, { milestones: current });
  };

  const toggleMilestone = async (index) => {
    const updated = [...(project.milestones || [])];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    await onUpdate(project.id, { milestones: updated });
  };

  const addEditMilestone = () => {
    const current = editData.milestones ?? project.milestones ?? [];
    setEditData({ ...editData, milestones: [...current, { title: '', date: '', completed: false }] });
  };

  const updateEditMilestone = (idx, field, value) => {
    const current = [...(editData.milestones ?? project.milestones ?? [])];
    current[idx] = { ...current[idx], [field]: value };
    setEditData({ ...editData, milestones: current });
  };

  const removeEditMilestone = (idx) => {
    const current = [...(editData.milestones ?? project.milestones ?? [])];
    current.splice(idx, 1);
    setEditData({ ...editData, milestones: current });
  };

  if (editing) {
    return (
      <Card className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
          <input
            type="text"
            value={editData.name ?? project.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <input
            type="text"
            value={editData.client ?? project.client ?? ''}
            onChange={(e) => setEditData({ ...editData, client: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={editData.status ?? project.status}
            onChange={(e) => setEditData({ ...editData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="active">Active</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <div className="flex gap-2">
            {[
              { id: 'active', label: 'Active', active: 'bg-green-600 text-white', dot: 'bg-green-500' },
              { id: 'engagement', label: 'Engagement', active: 'bg-amber-500 text-white', dot: 'bg-amber-400' },
              { id: 'opportunities', label: 'Opportunities', active: 'bg-orange-500 text-white', dot: 'bg-orange-400' },
              { id: 'sidequest', label: 'Sidequest', active: 'bg-blue-600 text-white', dot: 'bg-blue-500' },
            ].map(c => {
              const selected = (editData.category ?? project.category ?? 'active') === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setEditData({ ...editData, category: c.id })}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 ${
                    selected ? c.active : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${selected ? 'bg-white/60' : c.dot}`} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Folder Link</label>
          <input
            type="url"
            value={editData.drive_folder_url ?? project.drive_folder_url ?? ''}
            onChange={(e) => setEditData({ ...editData, drive_folder_url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="https://drive.google.com/..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
          <textarea
            value={editData.scope ?? project.scope ?? ''}
            onChange={(e) => setEditData({ ...editData, scope: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Summary of what this project delivers..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
          <input
            type="text"
            value={editData.phase ?? project.phase ?? ''}
            onChange={(e) => setEditData({ ...editData, phase: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., Pre-production, Production, Post"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
          <input
            type="date"
            value={editData.deadline ?? project.deadline ?? ''}
            onChange={(e) => setEditData({ ...editData, deadline: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={editData.budget ?? project.budget ?? ''}
              onChange={(e) => setEditData({ ...editData, budget: e.target.value ? parseFloat(e.target.value) : null })}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., 5000"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hours Estimate</label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={editData.hours_estimate ?? project.hours_estimate ?? ''}
            onChange={(e) => setEditData({ ...editData, hours_estimate: e.target.value ? parseFloat(e.target.value) : null })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., 40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Milestones</label>
          <div className="space-y-2">
            {(editData.milestones ?? project.milestones ?? []).map((m, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={m.title}
                  onChange={(e) => updateEditMilestone(idx, 'title', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="Milestone title"
                />
                <input
                  type="date"
                  value={m.date || ''}
                  onChange={(e) => updateEditMilestone(idx, 'date', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeEditMilestone(idx)}
                  className="p-2 text-red-400 hover:text-red-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addEditMilestone}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add Milestone
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={editData.notes ?? project.notes ?? ''}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave}>Save Changes</Button>
        </div>
      </Card>
    );
  }

  const catColors = { active: 'bg-green-100 text-green-700', engagement: 'bg-amber-100 text-amber-700', opportunities: 'bg-orange-100 text-orange-700', sidequest: 'bg-blue-100 text-blue-700' };
  const cat = project.category || 'active';
  const links = project.links || [];
  const ExternalIcon = () => (
    <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );

  // Inline-editable detail fields
  const [editingField, setEditingField] = useState(null);
  const [fieldValue, setFieldValue] = useState('');
  const [editingScope, setEditingScope] = useState(false);
  const [scopeValue, setScopeValue] = useState('');

  const startEditField = (field, value) => {
    setEditingField(field);
    setFieldValue(value || '');
  };

  const saveField = async (field) => {
    const val = fieldValue.trim();
    let update = {};
    if (field === 'phase') update.phase = val || null;
    else if (field === 'deadline') update.deadline = val || null;
    else if (field === 'start_date') update.start_date = val || null;
    else if (field === 'budget') update.budget = val ? parseFloat(val) : null;
    else if (field === 'hours_estimate') update.hours_estimate = val ? parseFloat(val) : null;
    else if (field === 'category') update.category = val || null;
    else if (field === 'client') update.client = val || null;
    else if (field === 'drive_folder_url') update.drive_folder_url = val || null;
    await onUpdate(project.id, update);
    setEditingField(null);
  };

  const handleSaveScope = async () => {
    await onUpdate(project.id, { scope: scopeValue.trim() || null });
    setEditingScope(false);
  };

  return (
    <div className="space-y-4">
      {/* ===== SCOPE (full-width, top) ===== */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Scope</h3>
        {editingScope ? (
          <textarea
            value={scopeValue}
            onChange={(e) => setScopeValue(e.target.value)}
            onBlur={handleSaveScope}
            rows={3}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-y"
            autoFocus
          />
        ) : (
          <div
            onClick={() => { setScopeValue(project.scope || ''); setEditingScope(true); }}
            className="text-sm text-gray-600 whitespace-pre-wrap cursor-text min-h-[40px] hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors"
          >
            {project.scope || <span className="text-gray-400 italic">Click to define project scope...</span>}
          </div>
        )}
      </Card>

      {/* ===== TASKS (full-width, first thing you see) ===== */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Next Steps</h3>

        {/* Add task form */}
        <form onSubmit={handleAddTask} className="mb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add a task..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              disabled={addingTask}
            />
            <button
              type="submit"
              disabled={addingTask || !newTaskTitle.trim()}
              className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {newTaskTitle.trim() && (
            <div className="flex items-center gap-3 mt-2">
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-200 rounded-lg"
              />
              <div className="flex gap-1">
                {[
                  { id: '', label: 'None', color: 'bg-gray-100 text-gray-500' },
                  { id: 'low', label: 'Low', color: 'bg-green-100 text-green-700' },
                  { id: 'medium', label: 'Med', color: 'bg-amber-100 text-amber-700' },
                  { id: 'high', label: 'High', color: 'bg-red-100 text-red-700' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setNewTaskPriority(p.id)}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                      newTaskPriority === p.id ? `${p.color} ring-1 ring-offset-1 ring-gray-300` : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Active tasks */}
        {activeTasks.length > 0 ? (
          <div className="space-y-1">
            {activeTasks.map(task => (
              <InlineTaskItem
                key={task.id}
                task={task}
                onToggle={() => updateTask(task.id, { status: 'done' })}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-2">No tasks yet</p>
        )}

        {/* Completed tasks (collapsed) */}
        {doneTasks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors w-full"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${showCompleted ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {doneTasks.length} completed
            </button>
            {showCompleted && (
              <div className="space-y-1 mt-2">
                {doneTasks.map(task => (
                  <InlineTaskItem
                    key={task.id}
                    task={task}
                    onToggle={() => updateTask(task.id, { status: 'todo' })}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ===== TWO-COLUMN GRID ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ---- LEFT COLUMN ---- */}
        <div className="space-y-4">
          {/* Links & Info */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Links & Info</h3>
            <div className="space-y-1.5">
              {/* Drive folder link (auto-included if exists) */}
              {project.drive_folder_url && (
                <a
                  href={project.drive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors group"
                >
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="text-sm text-gray-700 flex-1">Project Folder</span>
                  <ExternalIcon />
                </a>
              )}

              {/* Custom links */}
              {links.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors flex-1 min-w-0"
                  >
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-sm text-gray-700 truncate flex-1">{link.title}</span>
                    <ExternalIcon />
                  </a>
                  <button
                    onClick={() => handleRemoveLink(idx)}
                    className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* No links yet */}
              {!project.drive_folder_url && links.length === 0 && !showAddLink && (
                <p className="text-xs text-gray-400 py-1">No links yet</p>
              )}

              {/* Add link form */}
              {showAddLink ? (
                <div className="space-y-2 pt-2 border-t border-gray-100 mt-2">
                  <input
                    type="text"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder="Link title (optional)"
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500"
                  />
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowAddLink(false); setLinkTitle(''); setLinkUrl(''); }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                    <button onClick={handleAddLink} disabled={!linkUrl.trim()} className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50">Save</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddLink(true)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-1"
                >
                  + Add Link
                </button>
              )}
            </div>
          </Card>

          {/* Notes (inline editable) */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
            {editingNotes ? (
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                onBlur={handleSaveNotes}
                rows={5}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-y"
                autoFocus
              />
            ) : (
              <div
                onClick={() => { setNotesValue(project.notes || ''); setEditingNotes(true); }}
                className="text-sm text-gray-600 whitespace-pre-wrap cursor-text min-h-[60px] hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors"
              >
                {project.notes || <span className="text-gray-400 italic">Click to add notes...</span>}
              </div>
            )}
          </Card>

        </div>

        {/* ---- RIGHT COLUMN ---- */}
        <div className="space-y-4">
          {/* Milestones */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Milestones</h3>
            {sortedMilestones.length > 0 ? (
              <div className="space-y-2">
                {sortedMilestones.map((m, idx) => {
                  const originalIdx = (project.milestones || []).indexOf(m);
                  return (
                    <div key={idx} className="flex items-center gap-3 group">
                      <button
                        onClick={() => toggleMilestone(originalIdx >= 0 ? originalIdx : idx)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          m.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 group-hover:border-gray-400'
                        }`}>
                          {m.completed && (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className={`text-sm flex-1 ${m.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {m.title}
                        </span>
                        {m.date && (
                          <span className={`text-xs flex-shrink-0 ${m.completed ? 'text-gray-300' : 'text-gray-500'}`}>
                            {formatDate(m.date)}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => handleRemoveMilestone(originalIdx >= 0 ? originalIdx : idx)}
                        className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-1">No milestones yet</p>
            )}

            {/* Add milestone inline */}
            {showAddMilestone ? (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <input
                  type="text"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="Milestone title"
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500"
                  autoFocus
                />
                <input
                  type="date"
                  value={newMilestoneDate}
                  onChange={(e) => setNewMilestoneDate(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                />
                <button onClick={handleAddMilestone} disabled={!newMilestoneTitle.trim()} className="text-xs text-primary-600 font-medium disabled:opacity-50">Add</button>
                <button onClick={() => { setShowAddMilestone(false); setNewMilestoneTitle(''); setNewMilestoneDate(''); }} className="text-xs text-gray-400">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddMilestone(true)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-3"
              >
                + Add Milestone
              </button>
            )}
          </Card>

          {/* Details (inline editable) */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Details</h3>

            <dl className="space-y-2 text-sm">
              {/* Category */}
              <div className="flex justify-between items-center py-1">
                <dt className="text-gray-500">Category</dt>
                <dd>
                  {editingField === 'category' ? (
                    <select
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      onBlur={() => saveField('category')}
                      className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500"
                      autoFocus
                    >
                      <option value="active">Active</option>
                      <option value="engagement">Engagement</option>
                      <option value="opportunities">Opportunities</option>
                      <option value="sidequest">Sidequest</option>
                    </select>
                  ) : (
                    <button onClick={() => startEditField('category', cat)} className="hover:bg-gray-100 rounded px-1 -mx-1 transition-colors">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${catColors[cat] || catColors.active}`}>{cat}</span>
                    </button>
                  )}
                </dd>
              </div>

              {/* Client */}
              <div className="flex justify-between items-center py-1">
                <dt className="text-gray-500">Client</dt>
                <dd>
                  {editingField === 'client' ? (
                    <input
                      type="text"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      onBlur={() => saveField('client')}
                      onKeyDown={(e) => e.key === 'Enter' && saveField('client')}
                      className="text-sm px-2 py-0.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 w-36 text-right"
                      autoFocus
                    />
                  ) : (
                    <button onClick={() => startEditField('client', project.client)} className="font-medium hover:bg-gray-100 rounded px-1 -mx-1 transition-colors text-right">
                      {project.client || <span className="text-gray-400">—</span>}
                    </button>
                  )}
                </dd>
              </div>

              {/* Phase */}
              <div className="flex justify-between items-center py-1">
                <dt className="text-gray-500">Phase</dt>
                <dd>
                  {editingField === 'phase' ? (
                    <input
                      type="text"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      onBlur={() => saveField('phase')}
                      onKeyDown={(e) => e.key === 'Enter' && saveField('phase')}
                      className="text-sm px-2 py-0.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 w-36 text-right"
                      placeholder="e.g., Pre-production"
                      autoFocus
                    />
                  ) : (
                    <button onClick={() => startEditField('phase', project.phase)} className="font-medium hover:bg-gray-100 rounded px-1 -mx-1 transition-colors text-right">
                      {project.phase || <span className="text-gray-400">—</span>}
                    </button>
                  )}
                </dd>
              </div>

              {/* Deadline */}
              <div className="flex justify-between items-center py-1">
                <dt className="text-gray-500">Deadline</dt>
                <dd>
                  {editingField === 'deadline' ? (
                    <input
                      type="date"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      onBlur={() => saveField('deadline')}
                      className="text-sm px-2 py-0.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500"
                      autoFocus
                    />
                  ) : (
                    <button onClick={() => startEditField('deadline', project.deadline)} className="font-medium hover:bg-gray-100 rounded px-1 -mx-1 transition-colors">
                      {project.deadline ? formatDate(project.deadline) : <span className="text-gray-400">—</span>}
                    </button>
                  )}
                </dd>
              </div>

              {/* Start Date */}
              <div className="flex justify-between items-center py-1">
                <dt className="text-gray-500">Start Date</dt>
                <dd>
                  {editingField === 'start_date' ? (
                    <input
                      type="date"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      onBlur={() => saveField('start_date')}
                      className="text-sm px-2 py-0.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500"
                      autoFocus
                    />
                  ) : (
                    <button onClick={() => startEditField('start_date', project.start_date)} className="font-medium hover:bg-gray-100 rounded px-1 -mx-1 transition-colors">
                      {project.start_date ? formatDate(project.start_date) : <span className="text-gray-400">—</span>}
                    </button>
                  )}
                </dd>
              </div>

              {/* Budget */}
              <div className="flex justify-between items-center py-1">
                <dt className="text-gray-500">Budget</dt>
                <dd>
                  {editingField === 'budget' ? (
                    <div className="relative inline-block">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={fieldValue}
                        onChange={(e) => setFieldValue(e.target.value)}
                        onBlur={() => saveField('budget')}
                        onKeyDown={(e) => e.key === 'Enter' && saveField('budget')}
                        className="text-sm pl-5 pr-2 py-0.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 w-28 text-right"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button onClick={() => startEditField('budget', project.budget || '')} className="font-medium hover:bg-gray-100 rounded px-1 -mx-1 transition-colors">
                      {project.budget ? formatCurrency(project.budget) : <span className="text-gray-400">—</span>}
                    </button>
                  )}
                </dd>
              </div>

              {/* Hours Estimate */}
              <div className="flex justify-between items-center py-1">
                <dt className="text-gray-500">Hours</dt>
                <dd>
                  {editingField === 'hours_estimate' ? (
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      onBlur={() => saveField('hours_estimate')}
                      onKeyDown={(e) => e.key === 'Enter' && saveField('hours_estimate')}
                      className="text-sm px-2 py-0.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 w-20 text-right"
                      autoFocus
                    />
                  ) : (
                    <button onClick={() => startEditField('hours_estimate', project.hours_estimate || '')} className="font-medium hover:bg-gray-100 rounded px-1 -mx-1 transition-colors">
                      {project.hours_estimate ? `${project.hours_estimate}h` : <span className="text-gray-400">—</span>}
                    </button>
                  )}
                </dd>
              </div>

              {/* Drive Folder */}
              <div className="flex justify-between items-center py-1">
                <dt className="text-gray-500">Folder</dt>
                <dd>
                  {editingField === 'drive_folder_url' ? (
                    <input
                      type="url"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      onBlur={() => saveField('drive_folder_url')}
                      onKeyDown={(e) => e.key === 'Enter' && saveField('drive_folder_url')}
                      className="text-sm px-2 py-0.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 w-36 text-right"
                      placeholder="https://..."
                      autoFocus
                    />
                  ) : (
                    <button onClick={() => startEditField('drive_folder_url', project.drive_folder_url)} className="font-medium hover:bg-gray-100 rounded px-1 -mx-1 transition-colors text-right truncate max-w-[140px]">
                      {project.drive_folder_url ? 'Linked' : <span className="text-gray-400">—</span>}
                    </button>
                  )}
                </dd>
              </div>
            </dl>

            {/* Budget progress bar */}
            {project.budget && (() => {
              const totalExp = project.expensesList.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
              const pct = (totalExp / project.budget) * 100;
              const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500';
              return (
                <div className="pt-3 mt-2 border-t border-gray-100">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Spent</span>
                    <span className="font-medium text-gray-600">{formatCurrency(totalExp)} / {formatCurrency(project.budget)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })()}

            {/* Effective rate */}
            {project.hours_estimate && (() => {
              const projIncome = project.incomeList.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
              const effectiveRate = projIncome > 0 ? projIncome / project.hours_estimate : null;
              return effectiveRate !== null ? (
                <div className="flex justify-between text-xs pt-2 mt-2 border-t border-gray-100">
                  <span className="text-gray-400">Effective Rate</span>
                  <span className={`font-medium ${effectiveRate >= 150 ? 'text-green-600' : effectiveRate >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                    {formatCurrency(effectiveRate)}/h
                  </span>
                </div>
              ) : null;
            })()}
          </Card>
        </div>
      </div>
    </div>
  );
}

// Compact inline task item for the overview dashboard
function InlineTaskItem({ task, onToggle, onDelete }) {
  const isDone = task.status === 'done';
  const priorityDot = {
    high: 'bg-red-500',
    medium: 'bg-amber-400',
    low: 'bg-green-400',
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-gray-50 transition-colors group">
      <button onClick={onToggle} className="flex-shrink-0">
        <span className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors ${
          isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-gray-400'
        }`} style={{ width: '18px', height: '18px' }}>
          {isDone && (
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
      </button>
      <span className={`text-sm flex-1 ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
        {task.title}
      </span>
      {task.priority && !isDone && (
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[task.priority] || ''}`} />
      )}
      {task.due_date && !isDone && (
        <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(task.due_date)}</span>
      )}
      {onDelete && isDone && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function PeopleTab({ people, interactions, projectId }) {
  if (people.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-400">
        No people associated with this project
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {people.map(person => {
        const personInteractions = interactions.filter(i => i.person_id === person.id);
        const lastInteraction = personInteractions[0];
        
        return (
          <Card key={person.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{person.name}</p>
                <p className="text-sm text-gray-500 capitalize">{person.role}</p>
                {person.email && (
                  <p className="text-sm text-gray-400">{person.email}</p>
                )}
              </div>
              {lastInteraction && (
                <div className="text-right text-xs text-gray-400">
                  <p>Last: {formatDate(lastInteraction.date)}</p>
                  <p className="capitalize">{lastInteraction.type}</p>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function TasksTab({ tasks, projectId }) {
  const { addTask, updateTask, deleteTask } = useTasks();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setAdding(true);
    try {
      await addTask({
        title: newTaskTitle.trim(),
        project_id: projectId,
        due_date: newTaskDueDate || null,
        priority: newTaskPriority || null,
        status: 'todo',
        is_mine: true,
      });
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setNewTaskPriority('');
    } catch (err) {
      console.error('Failed to add task:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleToggleStatus = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await updateTask(task.id, { status: newStatus });
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Delete this task?')) {
      await deleteTask(taskId);
    }
  };

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="space-y-4">
      {/* Add Task Form */}
      <form onSubmit={handleAddTask} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a next step..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            disabled={adding}
          />
          <Button type="submit" disabled={adding || !newTaskTitle.trim()}>
            {adding ? '...' : 'Add'}
          </Button>
        </div>
        {/* Quick-set row: date + priority */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={newTaskDueDate}
            onChange={(e) => setNewTaskDueDate(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 text-gray-600"
            disabled={adding}
          />
          <div className="flex gap-1">
            {[
              { id: '', label: 'None', color: 'bg-gray-100 text-gray-500' },
              { id: 'low', label: 'Low', color: 'bg-green-100 text-green-700' },
              { id: 'medium', label: 'Med', color: 'bg-amber-100 text-amber-700' },
              { id: 'high', label: 'High', color: 'bg-red-100 text-red-700' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setNewTaskPriority(p.id)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  newTaskPriority === p.id
                    ? `${p.color} ring-1 ring-offset-1 ring-gray-300`
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
                disabled={adding}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-500">Next Steps ({activeTasks.length})</h4>
          {activeTasks.map(task => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onToggle={() => handleToggleStatus(task)}
              onDelete={() => handleDelete(task.id)}
            />
          ))}
        </div>
      )}

      {/* Completed Tasks */}
      {doneTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-400">Completed ({doneTasks.length})</h4>
          {doneTasks.map(task => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onToggle={() => handleToggleStatus(task)}
              onDelete={() => handleDelete(task.id)}
            />
          ))}
        </div>
      )}

      {tasks.length === 0 && (
        <p className="text-center text-gray-400 py-4">
          No tasks yet. Add your first next step above.
        </p>
      )}
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete }) {
  const [showActions, setShowActions] = useState(false);
  const isDone = task.status === 'done';

  const borderColor = isDone ? 'border-l-transparent' :
    task.priority === 'high' ? 'border-l-red-500' :
    task.priority === 'medium' ? 'border-l-amber-400' :
    'border-l-transparent';

  const days = task.due_date ? daysUntil(task.due_date) : null;
  const isOverdue = !isDone && days !== null && days < 0;
  const isToday = days === 0;

  return (
    <Card
      className={`p-3 border-l-[3px] ${borderColor} cursor-pointer transition-all ${isDone ? 'bg-gray-50' : ''}`}
      onClick={() => setShowActions(!showActions)}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-0.5 flex-shrink-0 ${
            isDone
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {isDone && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Title + subtitle */}
        <div className="flex-1 min-w-0">
          <span className={`text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.title}
          </span>
          {task.subtitle && !isDone && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{task.subtitle}</p>
          )}
        </div>

        {/* Due date */}
        {task.due_date && (
          <span className={`text-xs flex-shrink-0 mt-0.5 ${
            isOverdue ? 'text-red-600 font-medium' :
            isToday ? 'text-amber-600 font-medium' :
            'text-gray-400'
          }`}>
            {isOverdue ? `${Math.abs(days)}d overdue` :
             isToday ? 'Today' :
             formatDate(task.due_date)}
          </span>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-xs text-red-600 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      )}
    </Card>
  );
}

function ParseTab({ projectId, projectName, onUpdate, project }) {
  const [noteText, setNoteText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const [createdItems, setCreatedItems] = useState(new Set());
  const [parseMethod, setParseMethod] = useState(null);

  const { addTask } = useTasks();

  const handleParse = async () => {
    if (!noteText.trim()) return;
    setIsParsing(true);
    setError(null);
    setCreatedItems(new Set());

    try {
      let result;
      if (isStructuredFormat(noteText)) {
        result = parseStructuredNotes(noteText);
        setParseMethod('structured');
      } else {
        const normalizedText = await normalizeWithLLM(noteText);
        if (!normalizedText || normalizedText.includes('No tasks found.')) {
          result = { tasks: [], project_updates: [] };
        } else {
          result = parseStructuredNotes(normalizedText);
        }
        setParseMethod('freeform');
      }
      setParsedData(result);
    } catch (err) {
      console.error('Failed to parse notes:', err);
      setError(`Failed to parse: ${err.message}`);
      setParsedData(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleClear = () => {
    setNoteText('');
    setParsedData(null);
    setError(null);
    setCreatedItems(new Set());
    setParseMethod(null);
  };

  const handleCreateTask = async (task, index) => {
    try {
      await addTask({
        title: task.title,
        subtitle: task.subtitle || null,
        status: 'todo',
        priority: task.priority || '',
        is_mine: true,
        due_date: task.due_date || null,
        project_id: projectId,
      });
      setCreatedItems(prev => new Set([...prev, `task-${index}`]));
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleApplyProjectUpdate = async (update, index) => {
    try {
      const updates = {};
      if (update.scope) updates.scope = update.scope;
      if (update.milestones?.length > 0) {
        const existing = project.milestones || [];
        const existingTitles = new Set(existing.map(m => m.title.toLowerCase()));
        const newMilestones = update.milestones.filter(m => !existingTitles.has(m.title.toLowerCase()));
        if (newMilestones.length > 0) {
          updates.milestones = [...existing, ...newMilestones];
        }
      }
      if (Object.keys(updates).length > 0) {
        await onUpdate(projectId, updates);
        setCreatedItems(prev => new Set([...prev, `update-${index}`]));
      }
    } catch (err) {
      console.error('Failed to apply project update:', err);
    }
  };

  return (
    <div className="space-y-4">
      {!parsedData && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">Parse Notes for {projectName}</h3>
          <p className="text-sm text-gray-500">
            Paste meeting notes or transcripts. Tasks will be linked to this project.
          </p>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Paste your meeting notes here..."
            disabled={isParsing}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleParse} disabled={isParsing || !noteText.trim()}>
            {isParsing ? 'Parsing...' : 'Parse Notes'}
          </Button>
        </Card>
      )}

      {parsedData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Parsed Results</h3>
              <p className="text-xs text-gray-400">
                {parseMethod === 'structured' ? 'Deterministic parse' : 'AI-assisted parse'}
                {' \u2022 '}{parsedData.tasks?.length || 0} tasks found
              </p>
            </div>
            <Button variant="secondary" onClick={handleClear}>Parse New</Button>
          </div>

          {parsedData.tasks?.length > 0 && (
            <Card className="p-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Tasks</h4>
              {parsedData.tasks.map((task, i) => {
                const isCreated = createdItems.has(`task-${i}`);
                return (
                  <div key={i} className={`p-3 rounded-lg border ${isCreated ? 'bg-green-50 border-green-200' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                        {task.subtitle && <p className="text-xs text-gray-500 mt-1">{task.subtitle}</p>}
                        <div className="flex gap-2 mt-1">
                          {task.priority && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              task.priority === 'high' ? 'bg-red-100 text-red-700' :
                              task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-green-100 text-green-700'
                            }`}>{task.priority}</span>
                          )}
                          {task.due_date && <span className="text-xs text-gray-400">Due: {formatDate(task.due_date)}</span>}
                        </div>
                      </div>
                      {isCreated ? (
                        <span className="text-xs text-green-600 font-medium">Created</span>
                      ) : (
                        <Button onClick={() => handleCreateTask(task, i)} className="text-xs">Add Task</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          {parsedData.project_updates?.length > 0 && (
            <Card className="p-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Project Updates</h4>
              {parsedData.project_updates.map((update, i) => {
                const isApplied = createdItems.has(`update-${i}`);
                return (
                  <div key={i} className={`p-3 rounded-lg border ${isApplied ? 'bg-green-50 border-green-200' : 'border-gray-200'}`}>
                    {update.scope && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-500">Scope</p>
                        <p className="text-sm text-gray-900">{update.scope}</p>
                      </div>
                    )}
                    {update.milestones?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Milestones ({update.milestones.length})</p>
                        {update.milestones.map((m, mi) => (
                          <p key={mi} className="text-sm text-gray-700">
                            {m.date && <span className="text-gray-400 mr-2">{m.date}</span>}
                            {m.title}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="mt-2">
                      {isApplied ? (
                        <span className="text-xs text-green-600 font-medium">Applied to {projectName}</span>
                      ) : (
                        <Button onClick={() => handleApplyProjectUpdate(update, i)} className="text-xs">Apply to Project</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          {(!parsedData.tasks || parsedData.tasks.length === 0) &&
           (!parsedData.project_updates || parsedData.project_updates.length === 0) && (
            <Card className="p-8 text-center text-gray-400">
              No actionable items found in the notes.
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    complete: 'bg-green-100 text-green-700',
    on_hold: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  
  const labels = {
    active: 'Active',
    in_progress: 'In Progress',
    completed: 'Completed',
    complete: 'Complete',
    on_hold: 'On Hold',
    cancelled: 'Cancelled',
  };
  
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${styles[status] || styles.active}`}>
      {labels[status] || status}
    </span>
  );
}

function NewProjectSheet({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    phase: '',
    deadline: '',
    budget: '',
    hours_estimate: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parsedTasks, setParsedTasks] = useState([]);
  const [parsedMilestones, setParsedMilestones] = useState([]);
  const [parsedLinks, setParsedLinks] = useState([]);
  const [parsedScope, setParsedScope] = useState('');

  const { addTask } = useTasks();

  const handleParse = async () => {
    if (!pasteText.trim()) return;
    setIsParsing(true);
    setParseError(null);

    try {
      const parsed = await parseForNewProject(pasteText);
      if (!parsed) return;

      // Auto-fill form fields (only overwrite if parsed value is non-empty)
      setFormData(prev => ({
        name: parsed.name || prev.name,
        client: parsed.client || prev.client,
        phase: parsed.phase || prev.phase,
        deadline: parsed.deadline || prev.deadline,
        budget: parsed.budget ? String(parsed.budget) : prev.budget,
        hours_estimate: parsed.hours_estimate ? String(parsed.hours_estimate) : prev.hours_estimate,
        notes: parsed.notes || prev.notes,
      }));

      setParsedScope(parsed.scope || '');
      setParsedTasks(parsed.tasks || []);
      setParsedMilestones(parsed.milestones || []);
      setParsedLinks(parsed.links || []);
    } catch (err) {
      console.error('Failed to parse notes:', err);
      setParseError(`Failed to parse: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleClearParsed = () => {
    setParsedTasks([]);
    setParsedMilestones([]);
    setParsedLinks([]);
    setParsedScope('');
    setPasteText('');
    setParseError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const projectData = {
        name: formData.name.trim(),
        client: formData.client.trim() || null,
        phase: formData.phase.trim() || null,
        deadline: formData.deadline || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        hours_estimate: formData.hours_estimate ? parseFloat(formData.hours_estimate) : null,
        notes: formData.notes.trim() || null,
        status: 'active',
      };

      // Include parsed extras
      if (parsedScope) projectData.scope = parsedScope;
      if (parsedMilestones.length > 0) projectData.milestones = parsedMilestones;
      if (parsedLinks.length > 0) projectData.links = parsedLinks;

      const result = await onSave(projectData);

      if (result.error) throw result.error;

      // Create tasks linked to the new project
      const newProjectId = result.data?.[0]?.id || result.data?.id;
      if (newProjectId && parsedTasks.length > 0) {
        for (const task of parsedTasks) {
          await addTask({
            title: task.title,
            subtitle: task.subtitle || null,
            status: 'todo',
            priority: task.priority || '',
            is_mine: true,
            due_date: task.due_date || null,
            project_id: newProjectId,
          });
        }
      }

      // Reset everything
      setFormData({ name: '', client: '', phase: '', deadline: '', budget: '', hours_estimate: '', notes: '' });
      handleClearParsed();
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Failed to create project: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const hasParsedExtras = parsedTasks.length > 0 || parsedMilestones.length > 0 || parsedLinks.length > 0 || parsedScope;

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="New Project">
      {/* Paste & Parse section — always visible until parsed */}
      {!hasParsedExtras && (
        <div className="mb-4 space-y-2">
          <label className="block text-sm font-medium text-gray-700">Paste Notes (AI auto-fill)</label>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            placeholder="Paste meeting notes, project brief, messages — AI will extract project details, tasks, milestones..."
            disabled={isParsing}
          />
          {parseError && <p className="text-xs text-red-600">{parseError}</p>}
          {pasteText.trim() && (
            <Button onClick={handleParse} disabled={isParsing} className="w-full">
              {isParsing ? 'Parsing...' : 'Parse & Auto-fill'}
            </Button>
          )}
        </div>
      )}

      {/* Parsed extras preview */}
      {hasParsedExtras && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-green-700">Parsed from notes</span>
            <button type="button" onClick={handleClearParsed} className="text-xs text-green-600 hover:text-green-800">Clear</button>
          </div>
          <div className="space-y-1 text-xs text-green-800">
            {parsedScope && <p>Scope extracted</p>}
            {parsedTasks.length > 0 && <p>{parsedTasks.length} task{parsedTasks.length !== 1 ? 's' : ''} will be created</p>}
            {parsedMilestones.length > 0 && <p>{parsedMilestones.length} milestone{parsedMilestones.length !== 1 ? 's' : ''} will be added</p>}
            {parsedLinks.length > 0 && <p>{parsedLinks.length} link{parsedLinks.length !== 1 ? 's' : ''} will be added</p>}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g., Goat Farm LED System"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client
          </label>
          <input
            type="text"
            value={formData.client}
            onChange={(e) => setFormData({ ...formData, client: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g., Mark DiNatale"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phase
          </label>
          <input
            type="text"
            value={formData.phase}
            onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g., Pre-production"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deadline
          </label>
          <input
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Budget
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., 5000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hours Estimate
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={formData.hours_estimate}
            onChange={(e) => setFormData({ ...formData, hours_estimate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g., 40"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Project details..."
          />
        </div>

        <Button type="submit" disabled={saving || !formData.name.trim()} className="w-full">
          {saving ? 'Creating...' : hasParsedExtras ? `Create Project + ${parsedTasks.length} Tasks` : 'Create Project'}
        </Button>
      </form>
    </Sheet>
  );
}
