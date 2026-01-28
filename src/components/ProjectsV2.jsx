import { useState, useMemo } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useTransactions } from '@/hooks/useTransactions';
import { usePeople } from '@/hooks/usePeople';
import { useTasks } from '@/hooks/useTasks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils';

export function ProjectsV2({ onNavigate, initialProjectId }) {
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || null);
  const [filter, setFilter] = useState('active'); // active, complete, all
  const [showNewProject, setShowNewProject] = useState(false);
  
  const { projects, activeProjects, completedProjects, loading, addProject, updateProject, deleteProject } = useProjects();
  const { getProjectTotals, getExpensesByProject, getIncomeByProject } = useTransactions();
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
    
    const totals = getProjectTotals(project.id);
    const expenses = getExpensesByProject(project.id);
    const income = getIncomeByProject(project.id);
    const people = getPeopleByProject(project.id);
    const interactions = getInteractionsForProject(project.id);
    const tasks = getTasksByProject(project.id);
    
    return {
      ...project,
      ...totals,
      expensesList: expenses,
      incomeList: income,
      people,
      interactions,
      tasks,
    };
  }, [selectedProjectId, projects, getProjectTotals, getExpensesByProject, getIncomeByProject, getPeopleByProject, getInteractionsForProject, getTasksByProject]);

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
        onBack={() => setSelectedProjectId(null)}
        onUpdate={updateProject}
        onDelete={deleteProject}
        onNavigate={onNavigate}
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
                  <StatusBadge status={project.status} />
                </div>
                
                <div className="text-sm text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Revenue</span>
                    <span className="text-green-600 font-medium">{formatCurrency(totals.income)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenses</span>
                    <span className="text-red-600 font-medium">{formatCurrency(totals.expenses)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-100">
                    <span className="font-medium text-gray-700">Profit</span>
                    <span className={`font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totals.profit)}
                    </span>
                  </div>
                </div>
                
                {project.deadline && (
                  <div className="mt-3 text-xs text-gray-400">
                    Deadline: {formatDate(project.deadline)}
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

function ProjectDetail({ project, onBack, onUpdate, onDelete, onNavigate }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: `Next Steps (${project.tasks.filter(t => t.status !== 'done').length})` },
    { id: 'expenses', label: `Expenses (${project.expensesList.length})` },
    { id: 'income', label: `Income (${project.incomeList.length})` },
    { id: 'people', label: `People (${project.people.length})` },
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
        <StatusBadge status={project.status} />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Revenue</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(project.income)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Expenses</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(project.expenses)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Profit</p>
          <p className={`text-xl font-bold ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(project.profit)}
          </p>
        </Card>
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
        />
      )}
      
      {activeTab === 'expenses' && (
        <TransactionsList 
          transactions={project.expensesList}
          type="expense"
          projectId={project.id}
          onNavigate={onNavigate}
        />
      )}
      
      {activeTab === 'income' && (
        <TransactionsList 
          transactions={project.incomeList}
          type="income"
          projectId={project.id}
          onNavigate={onNavigate}
        />
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
    </div>
  );
}

function OverviewTab({ project, editing, editData, setEditData, onEdit, onSave, onCancel, onDelete }) {
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Next Milestone</label>
          <input
            type="text"
            value={editData.next_milestone ?? project.next_milestone ?? ''}
            onChange={(e) => setEditData({ ...editData, next_milestone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
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

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-semibold text-gray-900">Details</h3>
          <button 
            onClick={onEdit}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Edit
          </button>
        </div>
        
        <dl className="space-y-3 text-sm">
          {project.phase && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Phase</dt>
              <dd className="font-medium">{project.phase}</dd>
            </div>
          )}
          {project.deadline && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Deadline</dt>
              <dd className="font-medium">{formatDate(project.deadline)}</dd>
            </div>
          )}
          {project.next_milestone && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Next Milestone</dt>
              <dd className="font-medium">{project.next_milestone}</dd>
            </div>
          )}
          {project.start_date && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Start Date</dt>
              <dd className="font-medium">{formatDate(project.start_date)}</dd>
            </div>
          )}
        </dl>
      </Card>

      {project.notes && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{project.notes}</p>
        </Card>
      )}

      <Card className="p-4 border-red-100">
        <h3 className="font-semibold text-red-600 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-500 mb-3">
          Deleting this project will not delete associated transactions or people.
        </p>
        <Button 
          variant="secondary" 
          onClick={onDelete}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          Delete Project
        </Button>
      </Card>
    </div>
  );
}

function TransactionsList({ transactions, type, projectId, onNavigate }) {
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
  const [adding, setAdding] = useState(false);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    setAdding(true);
    try {
      await addTask({
        title: newTaskTitle.trim(),
        project_id: projectId,
        status: 'todo',
        is_mine: true,
      });
      setNewTaskTitle('');
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
      <form onSubmit={handleAddTask} className="flex gap-2">
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

  return (
    <Card 
      className={`p-3 cursor-pointer transition-all ${isDone ? 'bg-gray-50' : ''}`}
      onClick={() => setShowActions(!showActions)}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
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
        
        {/* Title */}
        <span className={`text-sm flex-1 ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {task.title}
        </span>
        
        {/* Due date */}
        {task.due_date && (
          <span className="text-xs text-gray-400">{formatDate(task.due_date)}</span>
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
        client: formData.client.trim() || null,
        phase: formData.phase.trim() || null,
        deadline: formData.deadline || null,
        notes: formData.notes.trim() || null,
        status: 'active',
      });
      
      if (result.error) {
        throw result.error;
      }
      
      setFormData({ name: '', client: '', phase: '', deadline: '', notes: '' });
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Failed to create project: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="New Project">
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
          {saving ? 'Creating...' : 'Create Project'}
        </Button>
      </form>
    </Sheet>
  );
}
