import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { AddTaskSheet } from '@/components/AddTaskSheet';
import { formatDate, daysUntil } from '@/lib/utils';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CATEGORIES, CATEGORY_TONES } from '@/lib/categories';

const STATUSES = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

export function TasksView({ onNavigate, selectedProjectId, selectedCategory, onSelectCategory, onSelectProject }) {
  const {
    tasks,
    loading,
    updateTask,
    deleteTask,
  } = useTasks();
  const { projects, activeProjects, updateProject, loading: projectsLoading } = useProjects();

  const [viewMode, setViewMode] = useState('list');
  const [projectFilter, setProjectFilter] = useState(selectedProjectId || 'all'); // 'all' | project_id | '__none__'

  // Sync project filter when sidebar selection changes
  useEffect(() => {
    setProjectFilter(selectedProjectId || 'all');
  }, [selectedProjectId]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const initialCollapseRef = useRef(false);
  const [activeId, setActiveId] = useState(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const selectionActive = selectedIds.size > 0;

  // Edit
  const [editingTask, setEditingTask] = useState(null);

  // Project lookup
  const projectMap = useMemo(() => {
    const map = {};
    projects.forEach(p => { map[p.id] = p.name; });
    return map;
  }, [projects]);

  // Project category lookup
  const projectCategoryMap = useMemo(() => {
    const map = {};
    projects.forEach(p => { map[p.id] = p.category || 'active'; });
    return map;
  }, [projects]);

  // Project sort_order lookup (for matching sidebar ordering)
  const projectOrderMap = useMemo(() => {
    const map = {};
    projects.forEach(p => { map[p.id] = p.sort_order ?? 0; });
    return map;
  }, [projects]);

  // Project IDs in selected category
  const categoryProjectIds = useMemo(() => {
    if (!selectedCategory) return null;
    return new Set(
      projects.filter(p => (p.category || 'active') === selectedCategory).map(p => p.id)
    );
  }, [selectedCategory, projects]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = tasks || [];
    if (categoryProjectIds) {
      result = result.filter(t => t.project_id && categoryProjectIds.has(t.project_id));
    }
    if (projectFilter !== 'all') {
      if (projectFilter === '__none__') {
        result = result.filter(t => !t.project_id);
      } else {
        result = result.filter(t => t.project_id === projectFilter);
      }
    }
    return result;
  }, [tasks, projectFilter, categoryProjectIds]);

  const filteredActive = useMemo(() =>
    filteredTasks.filter(t => t.status !== 'done'), [filteredTasks]);

  const filteredDone = useMemo(() =>
    filteredTasks.filter(t => t.status === 'done'), [filteredTasks]);

  // Focus tasks (pulled from filteredActive, shown in Focus section)
  const focusTasks = useMemo(() =>
    filteredActive.filter(t => t.is_focus), [filteredActive]);

  const nonFocusActive = useMemo(() =>
    filteredActive.filter(t => !t.is_focus), [filteredActive]);

  // Group active (non-focus) tasks by project
  const groupedByProject = useMemo(() => {
    const groups = {};
    nonFocusActive.forEach(task => {
      const key = task.project_id || '__none__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      if (a === '__none__') return 1;
      if (b === '__none__') return -1;
      return (projectOrderMap[a] ?? 0) - (projectOrderMap[b] ?? 0) || (projectMap[a] || '').localeCompare(projectMap[b] || '');
    });
    return sorted;
  }, [filteredActive, projectMap, projectOrderMap]);

  // Default to all collapsed on first load
  useEffect(() => {
    if (!initialCollapseRef.current && groupedByProject.length > 0) {
      initialCollapseRef.current = true;
      const collapsed = {};
      groupedByProject.forEach(([id]) => { collapsed[id] = true; });
      setCollapsedGroups(collapsed);
    }
  }, [groupedByProject]);

  // Board columns
  const boardColumns = useMemo(() => {
    return STATUSES.map(status => {
      const statusTasks = filteredTasks.filter(t => t.status === status.id);
      const groups = {};
      statusTasks.forEach(task => {
        const key = task.project_id || '__none__';
        if (!groups[key]) groups[key] = [];
        groups[key].push(task);
      });
      const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
        if (a === '__none__') return 1;
        if (b === '__none__') return -1;
        return (projectOrderMap[a] ?? 0) - (projectOrderMap[b] ?? 0) || (projectMap[a] || '').localeCompare(projectMap[b] || '');
      });
      return { ...status, tasks: statusTasks, groups: sortedGroups };
    });
  }, [filteredTasks, projectMap, projectOrderMap]);

  // All visible task ids (for select all)
  const allVisibleIds = useMemo(() =>
    filteredActive.map(t => t.id), [filteredActive]);

  // --- Handlers ---

  const handleToggleStatus = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await updateTask(task.id, { status: newStatus });
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Delete this task?')) {
      await deleteTask(taskId);
    }
  };

  const handleToggleFocus = async (taskId) => {
    const task = (tasks || []).find(t => t.id === taskId);
    if (task) await updateTask(taskId, { is_focus: !task.is_focus });
  };

  const handleToggleFavorite = async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (project) await updateProject(projectId, { is_favorite: !project.is_favorite });
  };

  const handleStatusChange = async (taskId, newStatus) => {
    await updateTask(taskId, { status: newStatus });
  };

  const toggleGroup = (groupKey) => {
    setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Selection handlers
  const toggleSelect = useCallback((taskId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === allVisibleIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  }, [allVisibleIds, selectedIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''}?`)) return;
    const ids = [...selectedIds];
    setSelectedIds(new Set());
    await Promise.all(ids.map(id => deleteTask(id)));
  };

  const handleBulkComplete = async () => {
    const ids = [...selectedIds];
    setSelectedIds(new Set());
    await Promise.all(ids.map(id => updateTask(id, { status: 'done' })));
  };

  // Edit handler
  const handleEditSave = async (updates) => {
    if (!editingTask) return;
    await updateTask(editingTask.id, updates);
    setEditingTask(null);
  };

  // DnD shared sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // Board DnD
  const activeDragTask = activeId ? (tasks || []).find(t => t.id === activeId) : null;

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleBoardDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const taskId = active.id;
    let newStatus = null;
    if (typeof over.id === 'string' && over.id.startsWith('column-')) {
      newStatus = over.id.replace('column-', '');
    } else {
      const overTask = (tasks || []).find(t => t.id === over.id);
      if (overTask) newStatus = overTask.status;
    }

    if (newStatus) {
      const task = (tasks || []).find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        handleStatusChange(taskId, newStatus);
      }
    }
  };

  // Projects that have tasks (for project filter)
  const projectsWithTasks = useMemo(() => {
    const ids = new Set((tasks || []).map(t => t.project_id).filter(Boolean));
    return projects.filter(p => ids.has(p.id));
  }, [tasks, projects]);

  // Filtered dropdown projects (scoped to category when active)
  const dropdownProjects = useMemo(() => {
    if (!categoryProjectIds) return projectsWithTasks;
    return projectsWithTasks.filter(p => categoryProjectIds.has(p.id));
  }, [projectsWithTasks, categoryProjectIds]);

  // Reset project filter when switching categories if current project not in category
  useEffect(() => {
    if (selectedCategory && projectFilter !== 'all' && projectFilter !== '__none__') {
      if (categoryProjectIds && !categoryProjectIds.has(projectFilter)) {
        setProjectFilter('all');
      }
    }
  }, [selectedCategory, categoryProjectIds, projectFilter]);

  // Project favorite lookup
  const projectFavoriteMap = useMemo(() => {
    const map = {};
    projects.forEach(p => { map[p.id] = !!p.is_favorite; });
    return map;
  }, [projects]);

  const favoriteGroups = useMemo(() =>
    groupedByProject.filter(([id]) => id !== '__none__' && projectFavoriteMap[id]), [groupedByProject, projectFavoriteMap]);
  const sortableGroups = useMemo(() =>
    groupedByProject.filter(([id]) => id !== '__none__' && !projectFavoriteMap[id]), [groupedByProject, projectFavoriteMap]);
  const noProjectGroup = useMemo(() =>
    groupedByProject.find(([id]) => id === '__none__'), [groupedByProject]);

  if (loading || projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-surface-on-variant">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-on">
          All Project Tasks {filteredActive.length > 0 && <span className="text-outline font-normal text-lg">({filteredActive.length})</span>}
        </h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => onNavigate('projects')}>+ New Project</Button>
          <Button onClick={() => setShowAddTask(true)}>+ Add Task</Button>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => onSelectCategory?.(null)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            !selectedCategory
              ? 'bg-surface-on text-surface'
              : 'bg-surface-container-high text-surface-on-variant hover:bg-surface-container-highest'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => {
          const tone = CATEGORY_TONES[cat.id];
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory?.(selectedCategory === cat.id ? null : cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                selectedCategory === cat.id
                  ? tone.badge
                  : 'bg-surface-container-high text-surface-on-variant hover:bg-surface-container-highest'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Project filter dropdown */}
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-outline rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-surface-container"
        >
          <option value="all">All Projects</option>
          {dropdownProjects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          <option value="__none__">No Project</option>
        </select>

        {/* Done toggle */}
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
            showCompleted
              ? 'bg-green-600 text-white'
              : 'bg-surface-container-high text-surface-on-variant hover:bg-surface-container-highest'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Done{filteredDone.length > 0 ? ` (${filteredDone.length})` : ''}
        </button>

        {/* Collapse all toggle */}
        {viewMode === 'list' && groupedByProject.length > 1 && (
          <button
            onClick={() => {
              const allCollapsed = groupedByProject.every(([id]) => collapsedGroups[id]);
              if (allCollapsed) {
                setCollapsedGroups({});
              } else {
                const next = {};
                groupedByProject.forEach(([id]) => { next[id] = true; });
                setCollapsedGroups(next);
              }
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-surface-container-high text-surface-on-variant hover:bg-surface-container-highest transition-colors whitespace-nowrap"
          >
            {groupedByProject.every(([id]) => collapsedGroups[id]) ? 'Expand All' : 'Collapse All'}
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex bg-surface-container-high rounded-md p-1 flex-shrink-0">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-surface-container text-surface-on shadow-elevation-1'
                : 'text-surface-on-variant hover:text-surface-on'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'board'
                ? 'bg-surface-container text-surface-on shadow-elevation-1'
                : 'text-surface-on-variant hover:text-surface-on'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {viewMode === 'list' && (
        <div className="flex items-center justify-between">
          <button
            onClick={selectAll}
            className="text-xs text-surface-on-variant hover:text-surface-on font-medium"
          >
            {selectedIds.size === allVisibleIds.length && allVisibleIds.length > 0 ? 'Deselect All' : 'Select All'}
          </button>

          {selectionActive && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-on-variant">{selectedIds.size} selected</span>
              <button
                onClick={handleBulkComplete}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Mark Done
              </button>
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Forever
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-surface-container-high text-surface-on-variant hover:bg-surface-container-highest transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e) => setActiveId(e.active.id)}
          onDragEnd={(event) => {
            const { active, over } = event;
            setActiveId(null);
            if (!over) return;

            const activeIdStr = String(active.id);

            // --- Project-level drag (id starts with 'drag-project-') ---
            if (activeIdStr.startsWith('drag-project-')) {
              const projectId = activeIdStr.replace('drag-project-', '');
              const overIdStr = String(over.id);
              const isFav = projectFavoriteMap[projectId];

              // Direct drop on zone containers
              if (overIdStr === 'favorites-zone') {
                if (!isFav) updateProject(projectId, { is_favorite: true });
                return;
              }
              if (overIdStr === 'projects-zone') {
                if (isFav) updateProject(projectId, { is_favorite: false });
                return;
              }

              // Drop on another project group — check if that group is in favorites
              if (overIdStr.startsWith('group-')) {
                const targetPid = overIdStr.replace('group-', '');
                if (targetPid === projectId) return; // dropped on self
                const targetIsFav = projectFavoriteMap[targetPid];
                if (targetIsFav && !isFav) updateProject(projectId, { is_favorite: true });
                else if (!targetIsFav && isFav) updateProject(projectId, { is_favorite: false });
                return;
              }

              // Drop on a task — infer zone from the task's project favorite status
              const overTask = (tasks || []).find(t => t.id === over.id);
              if (overTask) {
                const taskProjFav = overTask.project_id ? !!projectFavoriteMap[overTask.project_id] : false;
                if (taskProjFav && !isFav) updateProject(projectId, { is_favorite: true });
                else if (!taskProjFav && isFav) updateProject(projectId, { is_favorite: false });
              }

              // Drop on focus-zone or anything else with a project drag — ignore
              return;
            }

            // --- Task-level drag ---
            const draggedTaskId = active.id;
            const draggedTask = (tasks || []).find(t => t.id === draggedTaskId);
            if (!draggedTask) return;

            // Dropped on the focus zone container
            if (over.id === 'focus-zone') {
              if (!draggedTask.is_focus) updateTask(draggedTaskId, { is_focus: true });
              return;
            }

            // Dropped on a project group container (id starts with 'group-')
            if (typeof over.id === 'string' && over.id.startsWith('group-')) {
              if (draggedTask.is_focus) updateTask(draggedTaskId, { is_focus: false });
              return;
            }

            // Dropped on another task — check if that task is in focus or not
            const overTask = (tasks || []).find(t => t.id === over.id);
            if (overTask) {
              if (overTask.is_focus && !draggedTask.is_focus) {
                updateTask(draggedTaskId, { is_focus: true });
              } else if (!overTask.is_focus && draggedTask.is_focus) {
                updateTask(draggedTaskId, { is_focus: false });
              }
            }
          }}
        >
          {/* Focus Section */}
          <FocusZone
            tasks={focusTasks}
            projectMap={projectMap}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onEdit={setEditingTask}
            onToggleFocus={handleToggleFocus}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            selectionActive={selectionActive}
          />

          {/* Favorites Section */}
          <FavoritesZone
            groups={favoriteGroups}
            projectMap={projectMap}
            projectCategoryMap={projectCategoryMap}
            collapsedGroups={collapsedGroups}
            onToggleCollapse={toggleGroup}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onEdit={setEditingTask}
            onToggleFocus={handleToggleFocus}
            onToggleFavorite={handleToggleFavorite}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            selectionActive={selectionActive}
            onSelectProject={onSelectProject}
          />

          {groupedByProject.length === 0 && !showCompleted && focusTasks.length === 0 ? (
            <Card className="p-8 text-center text-outline">
              No active tasks
            </Card>
          ) : (
            <ProjectsDropZone>
              {sortableGroups.map(([projectId, projectTasks]) => (
                <DraggableProjectGroup
                  key={projectId}
                  projectId={projectId}
                  projectName={projectMap[projectId] || 'Unknown Project'}
                  tasks={projectTasks}
                  collapsed={collapsedGroups[projectId]}
                  onToggleCollapse={() => toggleGroup(projectId)}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onEdit={setEditingTask}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  selectionActive={selectionActive}
                  onSelectProject={onSelectProject}
                  category={projectCategoryMap[projectId]}
                  onToggleFocus={handleToggleFocus}
                  onToggleFavorite={() => handleToggleFavorite(projectId)}
                />
              ))}
              {noProjectGroup && (
                <ProjectGroup
                  projectId="__none__"
                  projectName="No Project"
                  tasks={noProjectGroup[1]}
                  collapsed={collapsedGroups['__none__']}
                  onToggleCollapse={() => toggleGroup('__none__')}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onEdit={setEditingTask}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  selectionActive={selectionActive}
                  onSelectProject={onSelectProject}
                  onToggleFocus={handleToggleFocus}
                />
              )}
            </ProjectsDropZone>
          )}

          {/* Completed section */}
          {showCompleted && filteredDone.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDone.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  projectName={projectMap[task.project_id]}
                  showProject
                  onToggle={() => handleToggleStatus(task)}
                  onDelete={() => handleDelete(task.id)}
                  onStatusChange={(status) => handleStatusChange(task.id, status)}
                  onEdit={() => setEditingTask(task)}
                  onToggleFocus={() => handleToggleFocus(task.id)}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  selectionActive={selectionActive}
                />
              ))}
            </div>
          )}

          <DragOverlay>
            {activeId && String(activeId).startsWith('drag-project-') ? (
              (() => {
                const pid = String(activeId).replace('drag-project-', '');
                return (
                  <Card className="p-3 shadow-elevation-3 ring-2 ring-purple-400/30 bg-surface-container-highest rounded-lg opacity-90">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400">&#9829;</span>
                      <span className="text-sm font-semibold text-surface-on">{projectMap[pid] || 'Project'}</span>
                    </div>
                  </Card>
                );
              })()
            ) : activeDragTask ? (
              <TaskItem
                task={activeDragTask}
                projectName={projectMap[activeDragTask.project_id]}
                showProject
                onToggle={() => {}}
                onDelete={() => {}}
                selectedIds={new Set()}
                selectionActive={false}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleBoardDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[60vh]">
            {boardColumns.map(column => (
              <BoardColumn
                key={column.id}
                column={column}
                projectMap={projectMap}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
                onEdit={setEditingTask}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDragTask && (
              <BoardCard
                task={activeDragTask}
                projectName={projectMap[activeDragTask.project_id]}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      <AddTaskSheet isOpen={showAddTask} onClose={() => setShowAddTask(false)} />

      {/* Edit Task Sheet */}
      <EditTaskSheet
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleEditSave}
        onDelete={(id) => { setEditingTask(null); handleDelete(id); }}
        projects={activeProjects}
      />
    </div>
  );
}

// --- Edit Task Sheet ---

function EditTaskSheet({ task, isOpen, onClose, onSave, onDelete, projects }) {
  const [formData, setFormData] = useState({});

  // Reset form when task changes
  const taskId = task?.id;
  useState(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        subtitle: task.subtitle || '',
        project_id: task.project_id || '',
        due_date: task.due_date || '',
        priority: task.priority || '',
        status: task.status || 'todo',
      });
    }
  }, [taskId]);

  // Also reset when opening with a new task
  if (task && formData._taskId !== task.id) {
    setFormData({
      _taskId: task.id,
      title: task.title || '',
      subtitle: task.subtitle || '',
      project_id: task.project_id || '',
      due_date: task.due_date || '',
      priority: task.priority || '',
      status: task.status || 'todo',
    });
  }

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    setSaving(true);
    try {
      await onSave({
        title: formData.title.trim(),
        subtitle: formData.subtitle?.trim() || null,
        project_id: formData.project_id || null,
        due_date: formData.due_date || null,
        priority: formData.priority || null,
        status: formData.status,
      });
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Edit Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-surface-on mb-1">Title *</label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-3 border border-outline rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-lg"
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-surface-on mb-1">Notes</label>
          <textarea
            value={formData.subtitle || ''}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            rows={2}
          />
        </div>

        {/* Project */}
        <div>
          <label className="block text-sm font-medium text-surface-on mb-1">Project</label>
          <select
            value={formData.project_id || ''}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            className="w-full px-3 py-3 border border-outline rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">No project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-surface-on mb-2">Status</label>
          <div className="flex gap-2">
            {STATUSES.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setFormData({ ...formData, status: s.id })}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  formData.status === s.id
                    ? 'bg-surface-on text-surface'
                    : 'bg-surface-container-high text-surface-on-variant hover:bg-surface-container-highest'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-surface-on mb-1">Due date</label>
          <input
            type="date"
            value={formData.due_date || ''}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="w-full px-3 py-3 border border-outline rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-surface-on mb-2">Priority</label>
          <div className="flex gap-2">
            {[
              { id: '', label: 'None', color: 'bg-surface-container-high text-surface-on-variant' },
              { id: 'low', label: 'Low', color: 'bg-green-500/15 text-green-400' },
              { id: 'medium', label: 'Medium', color: 'bg-amber-500/15 text-amber-400' },
              { id: 'high', label: 'High', color: 'bg-red-500/15 text-red-400' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setFormData({ ...formData, priority: p.id })}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  formData.priority === p.id
                    ? `${p.color} ring-2 ring-offset-1 ring-outline`
                    : 'bg-surface text-outline hover:bg-surface-container-high'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={saving || !formData.title?.trim()} className="w-full py-3 text-lg">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>

        {/* Delete */}
        {task && (
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="w-full py-2 text-sm text-red-400 hover:text-red-400 font-medium"
          >
            Delete Task
          </button>
        )}
      </form>
    </Sheet>
  );
}

// --- Focus Zone ---

function FocusZone({ tasks, projectMap, onToggleStatus, onDelete, onStatusChange, onEdit, onToggleFocus, selectedIds, onToggleSelect, selectionActive }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'focus-zone' });

  if (tasks.length === 0) {
    return (
      <div
        ref={setNodeRef}
        className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          isOver ? 'border-amber-400 bg-amber-950/60' : 'border-outline-variant'
        }`}
      >
        <p className="text-sm text-outline">
          <span className="text-amber-400 mr-1">&#9733;</span>
          {isOver ? 'Drop to add to Focus' : 'Star tasks or drag here to focus'}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border-2 p-4 transition-colors ${
        isOver ? 'border-amber-400 bg-amber-950/60' : 'border-amber-500/25 bg-amber-950/40'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-400">&#9733;</span>
        <h3 className="text-sm font-semibold text-surface-on">Focus</h3>
        <span className="text-xs text-outline">({tasks.length})</span>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map(task => (
            <DraggableTaskItem
              key={task.id}
              task={task}
              projectName={projectMap[task.project_id]}
              showProject
              focusMode
              onToggle={() => onToggleStatus(task)}
              onDelete={() => onDelete(task.id)}
              onStatusChange={(status) => onStatusChange(task.id, status)}
              onEdit={() => onEdit(task)}
              onToggleFocus={() => onToggleFocus(task.id)}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              selectionActive={selectionActive}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// --- List View Components ---

function ProjectGroup({ projectId, projectName, tasks, collapsed, onToggleCollapse, onToggleStatus, onDelete, onStatusChange, onEdit, selectedIds, onToggleSelect, selectionActive, onSelectProject, category, onToggleFocus, dragHandleProps, isFavorite, onToggleFavorite }) {
  const isNoProject = projectId === '__none__';
  const visibleTasks = tasks.slice(0, 3);
  const hiddenCount = tasks.length - visibleTasks.length;
  const tone = !isNoProject && category ? CATEGORY_TONES[category] : null;
  const { setNodeRef, isOver } = useDroppable({ id: `group-${projectId}` });

  return (
    <div ref={setNodeRef} className={`rounded-lg border p-4 flex flex-col transition-all shadow-elevation-1 ${tone ? `${tone.card} ${tone.glow}` : 'bg-surface-container-high border-outline-variant'} ${isOver ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        {/* Drag handle for project (shown when draggable) */}
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="flex-shrink-0 text-outline hover:text-surface-on-variant cursor-grab active:cursor-grabbing touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </button>
        )}
        <button
          onClick={onToggleCollapse}
          className="flex-shrink-0 text-outline hover:text-surface-on-variant"
        >
          <svg
            className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-90'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          onClick={() => !isNoProject && onSelectProject ? onSelectProject(projectId) : onToggleCollapse()}
          className="flex items-center gap-2 group text-left min-w-0"
        >
          <h3 className={`text-sm font-semibold truncate ${isNoProject ? 'text-outline' : tone ? tone.text : 'text-surface-on'} group-hover:text-surface-on`}>
            {projectName}
          </h3>
          <span className="text-xs text-outline flex-shrink-0">({tasks.length})</span>
        </button>
        {/* Favorite toggle */}
        {onToggleFavorite && !isNoProject && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={`flex-shrink-0 ml-auto transition-colors ${isFavorite ? 'text-purple-400 hover:text-purple-500' : 'text-outline-variant hover:text-purple-300'}`}
            title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        )}
      </div>

      {!collapsed && (
        <SortableContext
          items={visibleTasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {visibleTasks.map(task => (
              <DraggableTaskItem
                key={task.id}
                task={task}
                compact
                onToggle={() => onToggleStatus(task)}
                onDelete={() => onDelete(task.id)}
                onStatusChange={(status) => onStatusChange(task.id, status)}
                onEdit={() => onEdit(task)}
                onToggleFocus={() => onToggleFocus?.(task.id)}
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                selectionActive={selectionActive}
              />
            ))}
          </div>
        </SortableContext>
      )}

      {!collapsed && hiddenCount > 0 && (
        <div className="mt-2 pt-2 border-t border-outline-variant">
          <span className="text-xs text-outline">+{hiddenCount} more</span>
        </div>
      )}
    </div>
  );
}

// --- Projects Drop Zone (for receiving projects dragged out of Favorites) ---

function ProjectsDropZone({ children }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'projects-zone' });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-wrap gap-4 rounded-lg p-1 transition-colors ${isOver ? 'bg-surface-container-high' : ''}`}
    >
      {children}
    </div>
  );
}

// --- Draggable Project Group wrapper (for dragging entire projects into Favorites) ---

function DraggableProjectGroup(props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `drag-project-${props.projectId}`,
  });

  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.4 : 1 }}>
      <ProjectGroup {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

// --- Favorites Zone ---

function FavoritesZone({ groups, projectMap, projectCategoryMap, collapsedGroups, onToggleCollapse, onToggleStatus, onDelete, onStatusChange, onEdit, onToggleFocus, onToggleFavorite, selectedIds, onToggleSelect, selectionActive, onSelectProject }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'favorites-zone' });

  if (groups.length === 0) {
    return (
      <div
        ref={setNodeRef}
        className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          isOver ? 'border-purple-400 bg-purple-950/60' : 'border-outline-variant'
        }`}
      >
        <p className="text-sm text-outline">
          <span className="mr-1">&#9829;</span>
          {isOver ? 'Drop to add to Favorites' : 'Drag projects here to favorite'}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border-2 p-4 transition-colors ${
        isOver ? 'border-purple-400 bg-purple-950/60' : 'border-purple-500/25 bg-purple-950/40'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-purple-400">&#9829;</span>
        <h3 className="text-sm font-semibold text-surface-on">Favorites</h3>
        <span className="text-xs text-outline">({groups.length})</span>
      </div>

      <div className="flex flex-wrap gap-4">
        {groups.map(([projectId, projectTasks]) => (
          <DraggableProjectGroup
            key={projectId}
            projectId={projectId}
            projectName={projectMap[projectId] || 'Unknown Project'}
            tasks={projectTasks}
            collapsed={collapsedGroups[projectId]}
            onToggleCollapse={() => onToggleCollapse(projectId)}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            selectionActive={selectionActive}
            onSelectProject={onSelectProject}
            category={projectCategoryMap[projectId]}
            onToggleFocus={onToggleFocus}
            isFavorite={true}
            onToggleFavorite={() => onToggleFavorite(projectId)}
          />
        ))}
      </div>
    </div>
  );
}

function DraggableTaskItem(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function TaskItem({ task, projectName, showProject, onToggle, onDelete, onStatusChange, onEdit, onToggleFocus, selectedIds, onToggleSelect, selectionActive, dragHandleProps, isDragOverlay, compact, focusMode }) {
  const [showActions, setShowActions] = useState(false);
  const isDone = task.status === 'done';
  const isSelected = selectedIds?.has(task.id);

  const borderColor = isDone ? 'border-l-transparent' :
    task.priority === 'high' ? 'border-l-red-500/40' :
    task.priority === 'medium' ? 'border-l-amber-400/40' :
    'border-l-transparent';

  const days = task.due_date ? daysUntil(task.due_date) : null;
  const isOverdue = !isDone && days !== null && days < 0;
  const isToday = days === 0;

  const handleClick = () => {
    if (selectionActive) {
      onToggleSelect(task.id);
    } else {
      setShowActions(!showActions);
    }
  };

  return (
    <Card
      className={`p-3 border-l-2 ${borderColor} cursor-pointer transition-all bg-transparent ${isDone ? '!bg-surface opacity-60' : ''} ${
        isSelected ? 'ring-2 ring-primary !bg-primary-container' : ''
      } ${isDragOverlay ? 'shadow-elevation-3 ring-2 ring-primary/30 !bg-surface-container-highest' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        {dragHandleProps && !selectionActive && (
          <button
            {...dragHandleProps}
            className="mt-0.5 flex-shrink-0 text-outline hover:text-surface-on-variant cursor-grab active:cursor-grabbing touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </button>
        )}

        {/* Selection checkbox (bulk mode) */}
        {selectionActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(task.id); }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-0.5 flex-shrink-0 ${
              isSelected
                ? 'bg-primary border-primary text-primary-on'
                : 'border-outline hover:border-outline'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {showProject && projectName && (
            <p className="text-[16px] font-medium text-outline uppercase tracking-wide mb-0.5">
              {projectName}
            </p>
          )}
          <span className={`text-sm ${isDone ? 'line-through text-outline' : 'text-surface-on'}`}>
            {task.title}
          </span>
          {task.subtitle && !isDone && (
            <p className="text-xs text-surface-on-variant mt-0.5 truncate">{task.subtitle}</p>
          )}
        </div>

        {/* Focus star */}
        {onToggleFocus && !selectionActive && !isDragOverlay && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFocus(); }}
            className={`flex-shrink-0 mt-0.5 transition-colors ${task.is_focus ? 'text-amber-400 hover:text-amber-500' : 'text-outline-variant hover:text-amber-300'}`}
            title={task.is_focus ? 'Remove from Focus' : 'Add to Focus'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill={task.is_focus ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
        )}

        {/* Due date */}
        {!compact && task.due_date && (
          <span className={`text-xs flex-shrink-0 mt-1 ${
            isOverdue ? 'text-red-400 font-medium' :
            isToday ? 'text-amber-400 font-medium' :
            'text-outline'
          }`}>
            {isOverdue ? `${Math.abs(days)}d overdue` :
             isToday ? 'Today' :
             formatDate(task.due_date)}
          </span>
        )}

        {/* Status button — always visible */}
        {!compact && !selectionActive && (
          <StatusButton
            status={task.status}
            focusMode={focusMode}
            onStatusChange={(newStatus) => {
              if (onStatusChange) onStatusChange(newStatus);
              else if (onToggle) onToggle();
            }}
          />
        )}

        {/* Edit button — always visible in focus mode */}
        {focusMode && onEdit && !selectionActive && !isDragOverlay && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex-shrink-0 p-1 text-outline hover:text-primary transition-colors"
            title="Edit task"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded actions */}
      {showActions && !selectionActive && (
        <div className="mt-2 pt-2 border-t border-outline-variant flex items-center justify-end gap-2">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="text-xs text-primary hover:text-primary font-medium"
            >
              Edit
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-xs text-red-400 hover:text-red-400"
          >
            Delete
          </button>
        </div>
      )}
    </Card>
  );
}

// --- Status Button (cycles: todo -> wip -> done -> todo) ---

const STATUS_CYCLE = [
  { id: 'todo', label: 'To Do', shortLabel: 'To Do', bg: 'bg-surface-container-high', text: 'text-surface-on-variant', ring: '' },
  { id: 'in_progress', label: 'In Progress', shortLabel: 'WIP', bg: 'bg-blue-500/15', text: 'text-blue-400', ring: 'ring-blue-500/25' },
  { id: 'done', label: 'Done', shortLabel: 'Done', bg: 'bg-green-500/15', text: 'text-green-400', ring: 'ring-green-500/25' },
];

// Focus mode: todo->Start (sets in_progress), in_progress->Done (sets done)
const FOCUS_STATUS_CYCLE = [
  { id: 'todo', label: 'Start', shortLabel: 'Start', bg: 'bg-amber-500/15', text: 'text-amber-400', ring: 'ring-amber-500/25', nextId: 'in_progress' },
  { id: 'in_progress', label: 'Done', shortLabel: 'Done', bg: 'bg-blue-500/15', text: 'text-blue-400', ring: 'ring-blue-500/25', nextId: 'done' },
  { id: 'done', label: 'Reopen', shortLabel: 'Done', bg: 'bg-green-500/15', text: 'text-green-400', ring: 'ring-green-500/25', nextId: 'todo' },
];

function StatusButton({ status, onStatusChange, focusMode }) {
  const cycle = focusMode ? FOCUS_STATUS_CYCLE : STATUS_CYCLE;
  const current = cycle.find(s => s.id === status) || cycle[0];
  const currentIdx = cycle.findIndex(s => s.id === status);
  const nextIdx = (currentIdx + 1) % cycle.length;
  const next = focusMode ? current : cycle[nextIdx];

  const handleClick = (e) => {
    e.stopPropagation();
    if (focusMode) {
      onStatusChange(current.nextId);
    } else {
      onStatusChange(next.id);
    }
  };

  // In focus mode, show the action label (what clicking will do)
  const displayLabel = focusMode && current.id !== 'done' ? current.shortLabel : current.shortLabel;

  return (
    <button
      onClick={handleClick}
      title={focusMode ? `Click to ${current.label}` : `Click to set ${next.label}`}
      className={`px-2.5 py-1 text-[16px] font-semibold rounded-md flex-shrink-0 transition-all ${current.bg} ${current.text} hover:ring-2 ${current.ring || 'ring-outline-variant'}`}
    >
      {current.id === 'done' && (
        <svg className="w-3 h-3 inline mr-0.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {displayLabel}
    </button>
  );
}

// --- Board View Components ---

function BoardColumn({ column, projectMap, onToggleStatus, onDelete, onEdit }) {
  const { setNodeRef } = useSortable({
    id: `column-${column.id}`,
    data: { type: 'column', status: column.id },
  });

  const columnColors = {
    todo: 'border-t-outline',
    in_progress: 'border-t-blue-500',
    done: 'border-t-green-500',
  };

  return (
    <div
      ref={setNodeRef}
      className={`bg-surface rounded-lg border-t-[3px] ${columnColors[column.id]} p-3 flex flex-col min-h-[200px]`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-surface-on">{column.label}</h3>
        <span className="text-xs text-outline bg-surface-container-highest px-2 py-0.5 rounded-full">
          {column.tasks.length}
        </span>
      </div>

      <SortableContext
        items={column.tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 flex-1">
          {column.groups.map(([projectId, projectTasks]) => (
            <div key={projectId}>
              {column.groups.length > 1 && (
                <p className="text-[15px] font-medium text-outline uppercase tracking-wider mb-1 px-1">
                  {projectId === '__none__' ? 'No Project' : projectMap[projectId] || 'Unknown'}
                </p>
              )}
              {projectTasks.map(task => (
                <DraggableBoardCard
                  key={task.id}
                  task={task}
                  projectName={column.groups.length <= 1 ? (projectMap[task.project_id] || null) : null}
                  onToggleStatus={() => onToggleStatus(task)}
                  onDelete={() => onDelete(task.id)}
                  onEdit={() => onEdit(task)}
                />
              ))}
            </div>
          ))}

          {column.tasks.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-sm text-outline py-8">
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function DraggableBoardCard({ task, projectName, onToggleStatus, onDelete, onEdit }) {
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
      <BoardCard
        task={task}
        projectName={projectName}
        onToggleStatus={onToggleStatus}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    </div>
  );
}

function BoardCard({ task, projectName, isDragging, onToggleStatus, onDelete, onEdit }) {
  const isDone = task.status === 'done';
  const days = task.due_date ? daysUntil(task.due_date) : null;
  const isOverdue = !isDone && days !== null && days < 0;
  const isToday = days === 0;

  const priorityDot = {
    high: 'bg-red-500',
    medium: 'bg-amber-400',
    low: 'bg-green-400',
  };

  return (
    <div className={`bg-surface-container-highest rounded-md border border-outline-variant p-3 mb-2 ${
      isDragging ? 'shadow-elevation-3 ring-2 ring-primary/30' : 'shadow-elevation-1 hover:shadow-elevation-2'
    } transition-shadow cursor-grab active:cursor-grabbing`}>
      <div className="flex items-start gap-2">
        {task.priority && (
          <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${priorityDot[task.priority] || ''}`} />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isDone ? 'line-through text-outline' : 'text-surface-on'}`}>
            {task.title}
          </p>
          {projectName && (
            <p className="text-[15px] text-outline mt-0.5">{projectName}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-2">
        {task.due_date ? (
          <span className={`text-[15px] font-medium ${
            isOverdue ? 'text-red-400' :
            isToday ? 'text-amber-400' :
            'text-outline'
          }`}>
            {isOverdue ? `${Math.abs(days)}d overdue` :
             isToday ? 'Today' :
             formatDate(task.due_date)}
          </span>
        ) : <span />}

        <div className="flex gap-1.5">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(); }}
              className="text-outline hover:text-primary"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onToggleStatus && (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleStatus(); }}
              className={`w-4 h-4 rounded border flex items-center justify-center ${
                isDone
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-outline hover:border-outline'
              }`}
            >
              {isDone && (
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
