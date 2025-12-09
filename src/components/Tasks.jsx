import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { formatDate, daysUntil } from '@/lib/utils';

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

const PRIORITY_LABELS = {
  high: '🔴 High',
  medium: '🟡 Medium',
  low: '🟢 Low',
};

const STATUS_COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-100' },
  { id: 'done', label: 'Done', color: 'bg-green-100' },
];

const ENERGY_TYPES = [
  { id: 'deep_focus', label: '🧠 Deep Focus' },
  { id: 'communication', label: '💬 Communication' },
  { id: 'planning', label: '📐 Planning' },
  { id: 'admin', label: '📋 Admin' },
];

const TEAMS = [
  { id: 'me', label: 'Me' },
  { id: 'software', label: 'Software' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'ops', label: 'Ops' },
];

export function Tasks() {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [filter, setFilter] = useState('all'); // 'mine' | 'all' | 'completed'
  const [projectFilter, setProjectFilter] = useState('all'); // 'all' | project_id
  const [energyFilter, setEnergyFilter] = useState(null); // Single-select energy type or null for all
  const [pomodoroFilter, setPomodoroFilter] = useState(null); // Single-select: 1, 2, 3, 4 or null for all
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null); // For detail modal
  const [pomodoroTask, setPomodoroTask] = useState(null); // For pomodoro timer
  const [focusQueue, setFocusQueue] = useState([]); // Tasks queued for focus session
  
  // Toggle helpers - single select (clicking same one deselects)
  const selectEnergy = (energyId) => {
    setEnergyFilter(prev => prev === energyId ? null : energyId);
  };
  
  const selectPomodoro = (count) => {
    setPomodoroFilter(prev => prev === count ? null : count);
  };

  const { 
    tasks, 
    addTask, 
    updateTask, 
    deleteTask, 
    reorderTasks,
    getMyTasks, 
    getAllActiveTasks, 
    getCompletedTasks 
  } = useTasks();
  const { projects, getActiveProjects } = useProjects();

  const [formData, setFormData] = useState({
    title: '',
    project_id: '',
    priority: 'medium',
    due_date: '',
    assignee: 'Me',
    is_mine: true,
    description: '',
    energy: '',
    pomodoro_count: 0,
    team: 'me',
  });

  // Get active projects for filter buttons
  const activeProjects = getActiveProjects();

  // Filter tasks based on selected filter and project
  const filteredTasks = useMemo(() => {
    let filtered;
    switch (filter) {
      case 'mine':
        filtered = getMyTasks();
        break;
      case 'completed':
        filtered = getCompletedTasks();
        break;
      case 'all':
      default:
        filtered = tasks || [];
    }
    
    // Apply project filter
    if (projectFilter === 'none') {
      filtered = filtered.filter(t => !t.project_id);
    } else if (projectFilter !== 'all') {
      filtered = filtered.filter(t => t.project_id === projectFilter);
    }
    
    // Apply energy filter (single-select)
    if (energyFilter) {
      filtered = filtered.filter(t => t.energy === energyFilter);
    }
    
    // Apply pomodoro filter (single-select)
    if (pomodoroFilter) {
      filtered = filtered.filter(t => {
        const taskPomos = t.pomodoro_count || 0;
        if (pomodoroFilter === 4) {
          return taskPomos >= 4; // 4+ pomodoros
        }
        return taskPomos === pomodoroFilter;
      });
    }
    
    return filtered;
  }, [filter, projectFilter, energyFilter, pomodoroFilter, tasks, getMyTasks, getCompletedTasks]);

  // Calculate total pomodoros in focus queue
  const focusQueuePomodoros = useMemo(() => {
    return focusQueue.reduce((sum, task) => sum + (task.pomodoro_count || 1), 0);
  }, [focusQueue]);

  // Calculate task counts for filter badges (based on current project/status filter, before energy/pomo filters)
  const taskCounts = useMemo(() => {
    let baseTasks;
    switch (filter) {
      case 'mine':
        baseTasks = getMyTasks();
        break;
      case 'completed':
        baseTasks = getCompletedTasks();
        break;
      default:
        baseTasks = tasks || [];
    }
    
    // Apply project filter
    if (projectFilter === 'none') {
      baseTasks = baseTasks.filter(t => !t.project_id);
    } else if (projectFilter !== 'all') {
      baseTasks = baseTasks.filter(t => t.project_id === projectFilter);
    }

    // Count by energy
    const energyCounts = {};
    ENERGY_TYPES.forEach(e => { energyCounts[e.id] = 0; });
    
    // Count by pomodoro
    const pomoCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    
    baseTasks.forEach(t => {
      // Energy count
      if (t.energy && energyCounts[t.energy] !== undefined) {
        energyCounts[t.energy]++;
      }
      // Pomodoro count
      const pomos = t.pomodoro_count || 0;
      if (pomos >= 4) pomoCounts[4]++;
      else if (pomos > 0) pomoCounts[pomos]++;
    });

    return { energy: energyCounts, pomodoro: pomoCounts };
  }, [filter, projectFilter, tasks, getMyTasks, getCompletedTasks]);

  // Add task to focus queue
  const addToFocusQueue = (task) => {
    if (!focusQueue.find(t => t.id === task.id)) {
      setFocusQueue(prev => [...prev, task]);
    }
  };

  // Group tasks by status for kanban view
  const tasksByStatus = useMemo(() => {
    const grouped = { todo: [], in_progress: [], done: [] };
    filteredTasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    // Sort by order within each column
    Object.keys(grouped).forEach(status => {
      grouped[status].sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return grouped;
  }, [filteredTasks]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    // Check if dropped on a column
    const overColumn = STATUS_COLUMNS.find(col => col.id === over.id);
    if (overColumn) {
      // Dropped on column - change status
      if (activeTask.status !== overColumn.id) {
        updateTask(activeTask.id, { status: overColumn.id });
      }
      return;
    }

    // Check if dropped on another task
    const overTask = tasks.find(t => t.id === over.id);
    if (overTask) {
      if (activeTask.status !== overTask.status) {
        // Moving to different column
        updateTask(activeTask.id, { status: overTask.status });
      } else if (active.id !== over.id) {
        // Reordering within same column
        const oldIndex = tasksByStatus[activeTask.status].findIndex(t => t.id === active.id);
        const newIndex = tasksByStatus[activeTask.status].findIndex(t => t.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(tasksByStatus[activeTask.status], oldIndex, newIndex);
          const updatedTasks = tasks.map(t => {
            const orderIndex = newOrder.findIndex(nt => nt.id === t.id);
            if (orderIndex !== -1) {
              return { ...t, order: orderIndex };
            }
            return t;
          });
          reorderTasks(updatedTasks);
        }
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const taskData = {
      ...formData,
      status: 'todo',
      project_id: formData.project_id || null,
      order: tasks?.length || 0,
    };

    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      addTask(taskData);
    }

    setIsSheetOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      project_id: '',
      priority: 'medium',
      due_date: '',
      assignee: 'Me',
      is_mine: true,
      description: '',
      energy: '',
      pomodoro_count: 0,
      team: 'me',
    });
    setEditingTask(null);
  };

  const handleExpand = (task) => {
    setExpandedTask(task);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      project_id: task.project_id || '',
      priority: task.priority || 'medium',
      due_date: task.due_date || '',
      assignee: task.assignee || 'Me',
      is_mine: task.is_mine ?? true,
      description: task.description || '',
      energy: task.energy || '',
      pomodoro_count: task.pomodoro_count || 0,
      team: task.team || 'me',
    });
    setIsSheetOpen(true);
  };

  const handleDelete = (taskId) => {
    if (window.confirm('Delete this task?')) {
      deleteTask(taskId);
    }
  };

  const handleToggleComplete = (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTask(task.id, { status: newStatus });
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  // Start pomodoro for a specific task
  const startPomodoro = (task = null) => {
    setPomodoroTask(task || { title: 'Focus Time' });
  };

  // If pomodoro is active, show full-screen timer
  if (pomodoroTask) {
    return (
      <PomodoroTimer
        onClose={() => setPomodoroTask(null)}
        taskTitle={pomodoroTask.title}
        task={pomodoroTask.id ? pomodoroTask : null}
        onUpdateTask={updateTask}
        focusQueue={focusQueue}
        onMarkTaskDone={(taskId) => updateTask(taskId, { status: 'done' })}
        onRemoveFromQueue={(taskId) => setFocusQueue(prev => prev.filter(t => t.id !== taskId))}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Tasks</h2>
          <p className="text-gray-500 mt-1">Manage your tasks and track progress.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsSheetOpen(true)}>+ Add Task</Button>
        </div>
      </div>

      {/* Focus Zone wraps in its own DndContext area below */}

      {/* View Toggle & Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'all', label: 'All Tasks' },
            { id: 'mine', label: 'My Tasks' },
            { id: 'completed', label: 'Completed' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                filter === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              viewMode === 'kanban'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Energy & Pomodoro Filters */}
      <div className="flex flex-wrap gap-4 items-start">
        {/* Energy Filter - Single select with counts */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 px-1">Energy type:</span>
          <div className="flex flex-wrap gap-1">
            {ENERGY_TYPES.map(energy => (
              <button
                key={energy.id}
                onClick={() => selectEnergy(energy.id)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all border ${
                  energyFilter === energy.id
                    ? 'bg-primary-100 border-primary-300 text-primary-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {energy.label}
                {taskCounts.energy[energy.id] > 0 && (
                  <span className="ml-1 text-[10px] opacity-60">({taskCounts.energy[energy.id]})</span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Pomodoro Filter - Single select with counts */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 px-1">🍅 Pomodoros:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map(count => (
              <button
                key={count}
                onClick={() => selectPomodoro(count)}
                className={`px-2 h-7 rounded-md text-xs font-medium transition-all flex items-center justify-center border ${
                  pomodoroFilter === count
                    ? 'bg-red-100 border-red-300 text-red-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
                title={`${count} pomodoro${count > 1 ? 's' : ''}`}
              >
                {count}
                {taskCounts.pomodoro[count] > 0 && (
                  <span className="ml-0.5 text-[10px] opacity-60">({taskCounts.pomodoro[count]})</span>
                )}
              </button>
            ))}
            <button
              onClick={() => selectPomodoro(4)}
              className={`px-2 h-7 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 border ${
                pomodoroFilter === 4
                  ? 'bg-purple-100 border-purple-300 text-purple-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
              title="Big tasks (4+ pomodoros)"
            >
              🍇
              {taskCounts.pomodoro[4] > 0 && (
                <span className="text-[10px] opacity-60">({taskCounts.pomodoro[4]})</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Project Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setProjectFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            projectFilter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Projects
        </button>
        {activeProjects.map(project => (
          <button
            key={project.id}
            onClick={() => setProjectFilter(project.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              projectFilter === project.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {project.name}
          </button>
        ))}
        <button
          onClick={() => setProjectFilter('none')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            projectFilter === 'none'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          No Project
        </button>
      </div>

      {/* Content - all in DndContext for focus zone drag support */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Focus Zone - Add tasks via + button only */}
        <FocusDropZone 
          focusQueue={focusQueue}
          totalPomodoros={focusQueuePomodoros}
          onRemoveTask={(taskId) => setFocusQueue(prev => prev.filter(t => t.id !== taskId))}
          onClearQueue={() => setFocusQueue([])}
          onStartFocus={() => {
            if (focusQueue.length > 0) {
              startPomodoro(focusQueue[0]);
            } else {
              startPomodoro(); // Start with no specific task
            }
          }}
        />

        <div className="mt-4">
          {viewMode === 'kanban' ? (
            <KanbanBoard
              tasksByStatus={tasksByStatus}
              projects={projects}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleComplete={handleToggleComplete}
              onAddToQueue={addToFocusQueue}
              onPomodoro={startPomodoro}
            />
          ) : (
            <ListView
              tasks={filteredTasks}
              projects={projects}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleComplete={handleToggleComplete}
              onAddToQueue={addToFocusQueue}
              onPomodoro={startPomodoro}
            />
          )}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              project={projects?.find(p => p.id === activeTask.project_id)}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add/Edit Task Sheet */}
      <Sheet
        isOpen={isSheetOpen}
        onClose={() => { setIsSheetOpen(false); resetForm(); }}
        title={editingTask ? 'Edit Task' : 'New Task'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="label">Task Title *</label>
              <input
                required
                className="input"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="What needs to be done?"
              />
            </div>

            <div>
              <label className="label">Project</label>
              <select
                className="input"
                value={formData.project_id}
                onChange={e => setFormData({ ...formData, project_id: e.target.value })}
              >
                <option value="">No project</option>
                {projects?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Priority</label>
                <select
                  className="input"
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>
              <div>
                <label className="label">Due Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.due_date}
                  onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Assignee</label>
                <input
                  className="input"
                  value={formData.assignee}
                  onChange={e => setFormData({ ...formData, assignee: e.target.value })}
                  placeholder="Who's responsible?"
                />
              </div>
              <div>
                <label className="label">Team</label>
                <select
                  className="input"
                  value={formData.team}
                  onChange={e => setFormData({ ...formData, team: e.target.value })}
                >
                  {TEAMS.map(team => (
                    <option key={team.id} value={team.id}>{team.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_mine"
                checked={formData.is_mine}
                onChange={e => setFormData({ ...formData, is_mine: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="is_mine" className="text-sm text-gray-700">
                This is my task (appears in "My Tasks")
              </label>
            </div>

            <div>
              <label className="label">Description / Notes</label>
              <textarea
                className="input min-h-[100px]"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add more details about this task..."
              />
            </div>

            {/* Energy & Pomodoro */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Energy Type</label>
                <select
                  className="input"
                  value={formData.energy}
                  onChange={e => setFormData({ ...formData, energy: e.target.value })}
                >
                  <option value="">Uncategorized</option>
                  {ENERGY_TYPES.map(e => (
                    <option key={e.id} value={e.id}>{e.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Pomodoros</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, pomodoro_count: Math.max(0, (formData.pomodoro_count || 0) - 1) })}
                    className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="w-16 text-center font-medium">
                    {formData.pomodoro_count === 0 ? '—' : 
                     formData.pomodoro_count >= 4 ? '🍇' : 
                     '🍅'.repeat(formData.pomodoro_count)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, pomodoro_count: Math.min(4, (formData.pomodoro_count || 0) + 1) })}
                    className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => { setIsSheetOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingTask ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Task Detail Sheet */}
      <Sheet
        isOpen={!!expandedTask}
        onClose={() => setExpandedTask(null)}
        title="Task Details"
      >
        {expandedTask && (
          <div className="space-y-6">
            {/* Title & Priority */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-bold text-gray-900">{expandedTask.title}</h3>
                {expandedTask.priority && (
                  <span className={`text-xs px-2 py-1 rounded-full border ${PRIORITY_COLORS[expandedTask.priority]}`}>
                    {PRIORITY_LABELS[expandedTask.priority]}
                  </span>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3">
              <span className={`text-sm px-3 py-1 rounded-full ${
                expandedTask.status === 'done' ? 'bg-green-100 text-green-700' :
                expandedTask.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {expandedTask.status === 'in_progress' ? 'In Progress' : 
                 expandedTask.status === 'done' ? 'Done' : 'To Do'}
              </span>
              {expandedTask.is_mine && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">My Task</span>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Project</span>
                <p className="font-medium text-gray-900">
                  {projects?.find(p => p.id === expandedTask.project_id)?.name || 'No project'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Assignee</span>
                <p className="font-medium text-gray-900">{expandedTask.assignee || 'Unassigned'}</p>
              </div>
              <div>
                <span className="text-gray-500">Due Date</span>
                <p className={`font-medium ${
                  expandedTask.due_date && daysUntil(expandedTask.due_date) < 0 && expandedTask.status !== 'done'
                    ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {expandedTask.due_date ? formatDate(expandedTask.due_date) : 'No due date'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Created</span>
                <p className="font-medium text-gray-900">
                  {expandedTask.created_at ? formatDate(expandedTask.created_at) : '—'}
                </p>
              </div>
            </div>

            {/* Description */}
            {expandedTask.description && (
              <div>
                <span className="text-sm text-gray-500">Description</span>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{expandedTask.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="secondary"
                onClick={() => {
                  handleToggleComplete(expandedTask);
                  setExpandedTask({ ...expandedTask, status: expandedTask.status === 'done' ? 'todo' : 'done' });
                }}
              >
                {expandedTask.status === 'done' ? 'Reopen' : 'Mark Done'}
              </Button>
              <button
                onClick={() => {
                  setExpandedTask(null);
                  startPomodoro(expandedTask);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors font-medium"
                title="Start Pomodoro for this task"
              >
                <span>🍅</span> Focus
              </button>
              <Button
                onClick={() => {
                  handleEdit(expandedTask);
                  setExpandedTask(null);
                }}
                className="flex-1"
              >
                Edit Task
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

// Kanban Board Component
function KanbanBoard({ tasksByStatus, projects, onEdit, onDelete, onToggleComplete, onAddToQueue, onPomodoro }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {STATUS_COLUMNS.map(column => (
        <KanbanColumn
          key={column.id}
          column={column}
          tasks={tasksByStatus[column.id] || []}
          projects={projects}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleComplete={onToggleComplete}
          onAddToQueue={onAddToQueue}
          onPomodoro={onPomodoro}
        />
      ))}
    </div>
  );
}

function KanbanColumn({ column, tasks, projects, onEdit, onDelete, onToggleComplete, onAddToQueue, onPomodoro }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl p-4 ${column.color} min-h-[400px] transition-colors ${
        isOver ? 'ring-2 ring-primary-500 ring-offset-2' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">{column.label}</h3>
        <span className="bg-white/60 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tasks.map(task => (
            <SortableTaskCard
              key={task.id}
              task={task}
              project={projects?.find(p => p.id === task.project_id)}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleComplete={onToggleComplete}
              onAddToQueue={onAddToQueue}
              onPomodoro={onPomodoro}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No tasks
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTaskCard({ task, project, onEdit, onDelete, onToggleComplete, onAddToQueue, onPomodoro }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        project={project}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleComplete={onToggleComplete}
        onAddToQueue={onAddToQueue}
        onPomodoro={onPomodoro}
      />
    </div>
  );
}

function TaskCard({ task, project, onEdit, onDelete, onToggleComplete, onExpand, onPomodoro, onAddToQueue, isDragging = false }) {
  const days = daysUntil(task.due_date);
  const isOverdue = days !== null && days < 0 && task.status !== 'done';
  const energyInfo = ENERGY_TYPES.find(e => e.id === task.energy);
  const pomodoroCount = task.pomodoro_count || 0;

  return (
    <Card 
      className={`p-3 pb-8 cursor-pointer hover:shadow-md transition-all relative ${isDragging ? 'shadow-lg ring-2 ring-primary-500 cursor-grabbing' : ''}`}
      onClick={() => onEdit?.(task)}
    >
      <div className="space-y-2">
        {/* Title */}
        <h4 className={`font-medium text-gray-900 text-sm leading-tight ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>
          {task.title}
        </h4>

        {/* Indicators row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {/* Energy indicator */}
            {energyInfo && <span className="text-xs" title={energyInfo.label}>{energyInfo.label.split(' ')[0]}</span>}
            
            {/* Pomodoro count */}
            {pomodoroCount > 0 && (
              <span className="text-xs text-gray-400">
                {pomodoroCount >= 4 ? '🍇' : '🍅'.repeat(pomodoroCount)}
              </span>
            )}
            
            {/* Project badge */}
            {project && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                {project.name}
              </span>
            )}
            
            {/* Team badge */}
            {task.team && task.team !== 'me' && (
              <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                {task.team}
              </span>
            )}
          </div>
          
          {/* Due date / Priority */}
          <div className="flex items-center gap-1 shrink-0">
            {isOverdue && (
              <span className="text-xs text-red-600 font-medium">Overdue</span>
            )}
            {task.priority === 'high' && !isOverdue && (
              <span className="w-2 h-2 rounded-full bg-red-500" title="High priority" />
            )}
          </div>
        </div>
      </div>
      
      {/* Add to focus queue button - bottom right corner */}
      <button
        onClick={(e) => { e.stopPropagation(); onAddToQueue?.(task); }}
        className="absolute bottom-1.5 right-2 w-6 h-6 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-600 flex items-center justify-center text-sm font-bold transition-colors"
        title="Add to focus queue"
      >
        +
      </button>
    </Card>
  );
}

// List View Component
function ListView({ tasks, projects, onEdit, onDelete, onToggleComplete, onAddToQueue, onPomodoro }) {
  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by priority first, then by due date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    if (priorityDiff !== 0) return priorityDiff;
    
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date) - new Date(b.due_date);
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedTasks.map(task => {
            const project = projects?.find(p => p.id === task.project_id);
            const days = daysUntil(task.due_date);
            const isOverdue = days !== null && days < 0 && task.status !== 'done';

            return (
              <tr key={task.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'done'}
                      onChange={() => onToggleComplete?.(task)}
                      className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className={`font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {task.title}
                    </span>
                    {task.is_mine && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Mine</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {project?.name || '—'}
                </td>
                <td className="px-6 py-4">
                  {task.priority && (
                    <span className={`text-xs px-2 py-1 rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  {task.due_date ? (
                    <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      {formatDate(task.due_date)}
                      {isOverdue && ' (Overdue)'}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.status === 'done' ? 'bg-green-100 text-green-700' :
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {task.status === 'in_progress' ? 'In Progress' : task.status === 'done' ? 'Done' : 'To Do'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onAddToQueue?.(task)} className="text-orange-500 hover:text-orange-700" title="Add to queue">+</button>
                    <button onClick={() => onPomodoro?.(task)} className="text-red-600 hover:text-red-800" title="Focus">🍅</button>
                    <button onClick={() => onEdit?.(task)} className="text-gray-600 hover:text-gray-900">Edit</button>
                    <button onClick={() => onDelete?.(task.id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
          {sortedTasks.length === 0 && (
            <tr>
              <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                No tasks found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Focus Drop Zone Component - Add tasks via + button only
function FocusDropZone({ focusQueue, totalPomodoros, onRemoveTask, onClearQueue, onStartFocus }) {
  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-all duration-300 ${
        focusQueue.length > 0 
          ? 'border-red-200 bg-red-50/30'
          : 'border-gray-200 bg-gray-50/50'
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍅</span>
            <div>
              <h3 className="font-bold text-gray-900">Focus Zone</h3>
              <p className="text-xs text-gray-500">
                {focusQueue.length === 0 
                  ? 'Use + button on tasks to add to focus queue'
                  : `${totalPomodoros} pomodoro${totalPomodoros !== 1 ? 's' : ''} queued`
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {focusQueue.length > 0 && (
              <button
                onClick={onClearQueue}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
              >
                Clear
              </button>
            )}
            <button
              onClick={onStartFocus}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all bg-red-600 text-white hover:bg-red-700 shadow-lg"
            >
              {focusQueue.length > 0 ? `▶ Start (${totalPomodoros} 🍅)` : '▶ Quick Focus'}
            </button>
          </div>
        </div>

        {/* Progress bar - fills at 3 pomodoros */}
        {focusQueue.length > 0 && (
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500"
              style={{ width: `${Math.min(100, (totalPomodoros / 3) * 100)}%` }}
            />
          </div>
        )}

        {/* Queued tasks */}
        {focusQueue.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {focusQueue.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-red-100"
              >
                <span className="text-xs">
                  {'🍅'.repeat(Math.min(task.pomodoro_count || 1, 3))}
                  {(task.pomodoro_count || 1) >= 4 && '🍇'}
                </span>
                <span className="text-sm text-gray-700 max-w-[150px] truncate">{task.title}</span>
                <button
                  onClick={() => onRemoveTask(task.id)}
                  className="text-gray-400 hover:text-red-600 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

