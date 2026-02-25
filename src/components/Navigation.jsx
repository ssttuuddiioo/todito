import { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const NAV_ITEMS = [
  {
    id: 'tasks',
    label: 'Projects',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    )
  },
  {
    id: 'projects',
    label: 'Scopes',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  {
    id: 'money',
    label: 'Finance',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  { 
    id: 'people', 
    label: 'Contacts',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  {
    id: 'deals',
    label: 'Deals',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    )
  },
  {
    id: 'ai-notes',
    label: 'Parse',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
];

export function Navigation({ currentView, onNavigate, onLogout, user, selectedProjectId, selectedCategory, onSelectProject, onSelectCategory }) {
  const displayUser = user || { email: 'demo@todito.app' };
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProjects, setShowProjects] = useState(true);
  const { activeProjects, reorderProjects } = useProjects();
  const { tasks } = useTasks();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Category definitions in display order
  const CATEGORIES = [
    { id: 'active', label: 'Active', color: 'text-green-400', dot: 'bg-green-400' },
    { id: 'engagement', label: 'Engagement', color: 'text-amber-400', dot: 'bg-amber-400' },
    { id: 'opportunities', label: 'Opportunities', color: 'text-orange-400', dot: 'bg-orange-400' },
    { id: 'sidequest', label: 'Sidequest', color: 'text-blue-400', dot: 'bg-blue-400' },
  ];

  // Projects that have tasks, grouped by category — sorted by sort_order (from hook)
  const projectsWithTasks = activeProjects
    .filter(p => (tasks || []).some(t => t.project_id === p.id));

  const projectsByCategory = CATEGORIES
    .map(cat => ({
      ...cat,
      projects: projectsWithTasks.filter(p => (p.category || 'active') === cat.id),
    }))
    .filter(cat => cat.projects.length > 0);

  const handleDragEnd = (event, catProjects) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = catProjects.findIndex(p => p.id === active.id);
    const newIndex = catProjects.findIndex(p => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(catProjects, oldIndex, newIndex);
    const updates = reordered.map((p, i) => ({ id: p.id, sort_order: i }));
    reorderProjects(updates);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-slate-900 text-gray-300 border-r border-slate-800 z-50">
        {/* Brand */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center h-16 px-6 border-b border-slate-800 bg-slate-950 w-full cursor-pointer hover:bg-slate-900 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white font-bold mr-3">
            T
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Toditox</span>
        </button>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (item.id === 'tasks') {
                      onSelectProject?.(null);
                      onSelectCategory?.(null);
                    } else {
                      onNavigate(item.id);
                    }
                  }}
                  className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    currentView === item.id && !selectedProjectId && !selectedCategory
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
                      : currentView === item.id && (selectedProjectId || selectedCategory)
                        ? 'bg-slate-800 text-white'
                        : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className={`mr-3 transition-colors ${
                    currentView === item.id ? 'text-primary-200' : 'text-slate-400 group-hover:text-white'
                  }`}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>

                  {/* Expand/collapse toggle for Tasks */}
                  {item.id === 'tasks' && projectsWithTasks.length > 0 && (
                    <span
                      onClick={(e) => { e.stopPropagation(); setShowProjects(!showProjects); }}
                      className="ml-1 p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${showProjects ? 'rotate-90' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  )}
                </button>

                {/* Project sub-items grouped by category */}
                {item.id === 'tasks' && showProjects && projectsByCategory.length > 0 && (
                  <div className="ml-5 mt-1 border-l border-slate-700 pl-3 space-y-2">
                    {projectsByCategory.map(cat => (
                      <div key={cat.id}>
                        <button
                          onClick={() => onSelectCategory?.(selectedCategory === cat.id ? null : cat.id)}
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 pt-1 pb-0.5 rounded transition-colors w-full text-left ${
                            selectedCategory === cat.id
                              ? `${cat.color} bg-slate-800`
                              : `${cat.color} hover:bg-slate-800/50`
                          }`}
                        >
                          {cat.label}
                        </button>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleDragEnd(event, cat.projects)}
                        >
                          <SortableContext items={cat.projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-0.5">
                              {cat.projects.map(project => (
                                <SortableProjectItem
                                  key={project.id}
                                  project={project}
                                  isActive={currentView === 'tasks' && selectedProjectId === project.id}
                                  taskCount={(tasks || []).filter(t => t.project_id === project.id && t.status !== 'done').length}
                                  catDot={cat.dot}
                                  onSelect={() => onSelectProject?.(project.id)}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-medium text-sm">
              {displayUser?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {displayUser?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-slate-500 truncate">
                Pro Plan
              </p>
            </div>
            <button 
              onClick={() => window.confirm('Sign out?') && onLogout?.()}
              className="text-slate-500 hover:text-white transition-colors"
              title="Sign out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40 px-4 flex items-center justify-between">
        <button onClick={() => onNavigate('dashboard')} className="flex items-center cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold mr-2">
            T
          </div>
          <span className="text-lg font-bold text-gray-900">Toditox</span>
        </button>
        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"
          >
            {displayUser?.email?.[0]?.toUpperCase()}
          </button>
          
          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowUserMenu(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-50 py-1">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {displayUser?.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    if (window.confirm('Sign out?')) onLogout?.();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                currentView === item.id
                  ? 'text-primary-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="transform scale-90">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function SortableProjectItem({ project, isActive, taskCount, catDot, onSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors cursor-grab active:cursor-grabbing select-none ${
        isActive
          ? 'bg-primary-600/80 text-white'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-primary-300' : catDot}`} />
      <span className="flex-1 text-left truncate">{project.name}</span>
      {taskCount > 0 && (
        <span className={`text-[10px] ${isActive ? 'text-primary-200' : 'text-slate-500'}`}>
          {taskCount}
        </span>
      )}
    </div>
  );
}
