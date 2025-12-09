import { useState, useMemo } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { formatDate, daysUntil } from '@/lib/utils';
import { differenceInDays, addDays, startOfWeek, endOfWeek, eachWeekOfInterval, format, isWithinInterval } from 'date-fns';

const STATUSES = [
  { id: 'in_progress', label: 'In Progress', icon: '🚀', color: 'blue' },
  { id: 'review', label: 'Review', icon: '👀', color: 'yellow' },
  { id: 'complete', label: 'Complete', icon: '✅', color: 'green' },
];

const PHASES = ['Discovery', 'Development', 'Review', 'Complete'];

export function Projects() {
  const [activeProject, setActiveProject] = useState(null);

  if (activeProject) {
    return <ProjectDetails project={activeProject} onBack={() => setActiveProject(null)} />;
  }

  return <ProjectsList onSelectProject={setActiveProject} />;
}

function ProjectsList({ onSelectProject }) {
  const { projects, loading, addProject, updateProject, deleteProject } = useProjects();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active');

  const [formData, setFormData] = useState({
    name: '', client: '', deadline: '', status: 'in_progress',
    phase: 'Discovery', next_milestone: '', notes: '', drive_folder_url: '',
    start_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const projectData = { 
      ...formData, 
      deadline: formData.deadline || null,
      milestones: editingProject?.milestones || [],
    };
    if (editingProject) {
      await updateProject(editingProject.id, projectData);
    } else {
      await addProject(projectData);
    }
    setIsSheetOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '', client: '', deadline: '', status: 'in_progress',
      phase: 'Discovery', next_milestone: '', notes: '', drive_folder_url: '',
      start_date: new Date().toISOString().split('T')[0],
    });
    setEditingProject(null);
  };

  const filteredProjects = projects?.filter(project => {
    if (filterStatus === 'active') return project.status !== 'complete';
    if (filterStatus === 'complete') return project.status === 'complete';
    return true;
  }) || [];

  if (loading) return <div className="text-center py-12 text-gray-400">Loading projects...</div>;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Projects</h2>
        <Button onClick={() => setIsSheetOpen(true)}>+ Add Project</Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {['active', 'complete', 'all'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all duration-200 ${
              filterStatus === status 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map(project => (
          <div key={project.id} onClick={() => onSelectProject(project)} className="cursor-pointer h-full">
             <ProjectCard 
               project={project} 
               onEdit={(p) => {
                 setEditingProject(p);
                 setFormData({
                   name: p.name || '',
                   client: p.client || '',
                   deadline: p.deadline || '',
                   status: p.status || 'in_progress',
                   phase: p.phase || 'Discovery',
                   next_milestone: p.next_milestone || '',
                   notes: p.notes || '',
                   drive_folder_url: p.drive_folder_url || '',
                   start_date: p.start_date || '',
                 });
                 setIsSheetOpen(true);
               }}
               onDelete={deleteProject}
               onStatusChange={(p, s) => {
                 updateProject(p.id, { status: s });
               }}
             />
          </div>
        ))}
        {filteredProjects.length === 0 && (
           <div className="col-span-full py-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
             No projects found.
           </div>
        )}
      </div>

      <Sheet isOpen={isSheetOpen} onClose={() => { setIsSheetOpen(false); resetForm(); }} title={editingProject ? 'Edit Project' : 'New Project'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div><label className="label">Project Name *</label><input required className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><label className="label">Client</label><input className="input" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Start Date</label><input type="date" className="input" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} /></div>
               <div><label className="label">Deadline</label><input type="date" className="input" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="label">Status</label>
                 <select className="input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                   {STATUSES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                 </select>
               </div>
              <div>
                <label className="label">Phase</label>
                <select className="input" value={formData.phase} onChange={e => setFormData({...formData, phase: e.target.value})}>
                  {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div><label className="label">Next Milestone</label><input className="input" value={formData.next_milestone} onChange={e => setFormData({...formData, next_milestone: e.target.value})} /></div>
            <div>
              <label className="label">Drive Folder URL</label>
              <input 
                className="input" 
                type="url"
                value={formData.drive_folder_url} 
                onChange={e => setFormData({...formData, drive_folder_url: e.target.value})} 
                placeholder="https://drive.google.com/drive/folders/..."
              />
            </div>
            <div><label className="label">Notes</label><textarea className="input min-h-[100px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => { setIsSheetOpen(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" className="flex-1">Save Project</Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

function ProjectDetails({ project, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const { tasks, timeEntries, addTask, updateTask, logTime, getTotalHoursByProject } = useTasks();
  const { updateProject } = useProjects();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [projectNotes, setProjectNotes] = useState(project.notes || '');
  
  const projectTasks = tasks?.filter(t => t.project_id === project.id) || [];
  const projectTime = timeEntries?.filter(t => t.project_id === project.id) || [];
  const totalHours = getTotalHoursByProject(project.id);

  const handleSaveNotes = async () => {
    await updateProject(project.id, { notes: projectNotes });
    setIsEditingNotes(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
          <div className="flex items-center text-sm text-gray-500 gap-3 mt-1">
            <span>{project.client || 'No Client'}</span>
            <span>•</span>
            <StatusBadge status={project.status} />
            {project.phase && (
              <>
                <span>•</span>
                <span className="text-purple-600 font-medium">{project.phase}</span>
              </>
            )}
          </div>
        </div>
        {project.drive_folder_url && (
          <a
            href={project.drive_folder_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.71 3.5L1.15 15l3.43 6h13.67l3.43-6L15.13 3.5H7.71zm.58 1h6.34l5.23 9.5H2.14l5.23-9.5zM2.16 15h19.69l-2.75 5H4.91l-2.75-5z"/>
            </svg>
            Drive Folder
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" />
        <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} label={`Tasks (${projectTasks.length})`} />
        <TabButton active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} label="Timeline" />
        <TabButton active={activeTab === 'time'} onClick={() => setActiveTab('time')} label={`Time (${totalHours}h)`} />
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Key Details */}
              <Card className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">Project Details</h3>
            <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm text-gray-500">Client</span>
                    <p className="font-medium text-gray-900">{project.client || 'None'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Phase</span>
                    <p className="font-medium text-purple-700">{project.phase || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Start Date</span>
                    <p className="font-medium text-gray-900">{project.start_date ? formatDate(project.start_date) : 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Deadline</span>
                    <p className={`font-medium ${project.deadline && daysUntil(project.deadline) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {project.deadline ? formatDate(project.deadline) : 'None'}
                      {project.deadline && daysUntil(project.deadline) !== null && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({daysUntil(project.deadline) > 0 ? `${daysUntil(project.deadline)}d left` : 'Overdue'})
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Next Milestone</span>
                    <p className="font-medium text-gray-900">{project.next_milestone || 'None'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Total Hours</span>
                    <p className="font-medium text-gray-900">{totalHours}h logged</p>
                  </div>
                </div>
              </Card>

              {/* Notes */}
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900">Project Notes</h3>
                  {!isEditingNotes && (
                    <Button variant="secondary" onClick={() => setIsEditingNotes(true)} className="text-sm">
                      Edit
                    </Button>
                  )}
                </div>
                {isEditingNotes ? (
                  <div className="space-y-3">
                    <textarea
                      className="input min-h-[200px]"
                      value={projectNotes}
                      onChange={(e) => setProjectNotes(e.target.value)}
                      placeholder="Add project notes, meeting summaries, important decisions..."
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" onClick={() => { setIsEditingNotes(false); setProjectNotes(project.notes || ''); }}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveNotes}>Save Notes</Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg min-h-[100px]">
                    {project.notes ? (
                      <p className="text-gray-700 whitespace-pre-wrap">{project.notes}</p>
                    ) : (
                      <p className="text-gray-400 italic">No notes yet. Click Edit to add notes.</p>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Milestones */}
              <Card className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">Milestones</h3>
                {project.milestones && project.milestones.length > 0 ? (
                  <div className="space-y-3">
                    {project.milestones.map((milestone, i) => (
                      <div key={milestone.id || i} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${milestone.completed ? 'bg-green-500' : 'bg-orange-400'}`} />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${milestone.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {milestone.name}
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(milestone.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No milestones defined.</p>
                )}
              </Card>

              {/* Documents */}
              <Card className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">Documents</h3>
                {project.drive_folder_url ? (
                  <a
                    href={project.drive_folder_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.71 3.5L1.15 15l3.43 6h13.67l3.43-6L15.13 3.5H7.71z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Google Drive</p>
                      <p className="text-xs text-gray-500">Project folder</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : (
                  <p className="text-sm text-gray-400">No Drive folder linked. Edit project to add one.</p>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && <TasksView project={project} tasks={projectTasks} onAdd={addTask} onUpdate={updateTask} />}
        {activeTab === 'timeline' && <ProjectTimeline project={project} />}
        {activeTab === 'time' && <TimeView project={project} entries={projectTime} onAdd={logTime} />}
      </div>
    </div>
  );
}

function ProjectTimeline({ project }) {
  const timelineRange = useMemo(() => {
    if (!project.start_date || !project.deadline) {
      const today = new Date();
      return {
        start: startOfWeek(addDays(today, -14)),
        end: endOfWeek(addDays(today, 30)),
      };
    }
    return {
      start: startOfWeek(addDays(new Date(project.start_date), -7)),
      end: endOfWeek(addDays(new Date(project.deadline), 14)),
    };
  }, [project]);

  const timeColumns = useMemo(() => {
    return eachWeekOfInterval(timelineRange).map(date => ({
      date,
      label: format(date, 'MMM d'),
      isToday: isWithinInterval(new Date(), { start: date, end: addDays(date, 6) }),
    }));
  }, [timelineRange]);

  const getBarStyle = () => {
    if (!project.start_date || !project.deadline) return { left: '10%', width: '80%' };
    
    const { start, end } = timelineRange;
    const totalDays = differenceInDays(end, start);
    
    const projectStart = new Date(project.start_date);
    const projectEnd = new Date(project.deadline);
    
    const startOffset = Math.max(0, differenceInDays(projectStart, start));
    const projectDuration = differenceInDays(projectEnd, projectStart) + 1;
    
    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = Math.min((projectDuration / totalDays) * 100, 100 - leftPercent);
    
    return {
      left: `${leftPercent}%`,
      width: `${Math.max(widthPercent, 5)}%`,
    };
  };

  const getMilestonePosition = (date) => {
    const { start, end } = timelineRange;
    const totalDays = differenceInDays(end, start);
    const milestoneDate = new Date(date);
    const offset = differenceInDays(milestoneDate, start);
    return `${(offset / totalDays) * 100}%`;
  };

  const getTodayPosition = () => {
    const { start, end } = timelineRange;
    const totalDays = differenceInDays(end, start);
    const today = new Date();
    const offset = differenceInDays(today, start);
    if (offset < 0 || offset > totalDays) return null;
    return `${(offset / totalDays) * 100}%`;
  };

  const todayPosition = getTodayPosition();

  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div className="w-32 shrink-0 p-4 font-medium text-gray-700 text-sm">Timeline</div>
            <div className="flex-1 flex">
              {timeColumns.map((col, i) => (
                <div
                  key={i}
                  className={`flex-1 text-center py-2 px-1 text-xs border-r border-gray-100 ${col.isToday ? 'bg-primary-50' : ''}`}
                >
                  <div className="font-medium text-gray-700">{col.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Row */}
          <div className="flex relative min-h-[120px]">
            {/* Today Line */}
            {todayPosition && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                style={{ left: `calc(128px + (100% - 128px) * ${parseFloat(todayPosition) / 100})` }}
              >
                <div className="absolute -top-1 -left-2 bg-red-500 text-white text-[10px] px-1 rounded">Today</div>
              </div>
            )}

            <div className="w-32 shrink-0 p-4 border-r border-gray-200">
              <div className="font-medium text-gray-900">{project.name}</div>
              <div className="text-xs text-gray-500">{project.phase}</div>
            </div>

            <div className="flex-1 relative py-8">
              {/* Project Bar */}
              <div
                className="absolute h-10 rounded-lg bg-blue-500 shadow-sm flex items-center px-3"
                style={getBarStyle()}
              >
                <span className="text-xs text-white font-medium truncate">{project.name}</span>
              </div>

              {/* Milestones */}
              {project.milestones?.map((milestone, i) => {
                const pos = getMilestonePosition(milestone.date);
                const posPercent = parseFloat(pos);
                if (posPercent < 0 || posPercent > 100) return null;

                return (
                  <div
                    key={milestone.id || i}
                    className="absolute top-1/2 -translate-y-1/2 z-10 group"
                    style={{ left: pos }}
                  >
                    <div className={`w-4 h-4 rotate-45 ${milestone.completed ? 'bg-green-500' : 'bg-orange-500'} border-2 border-white shadow-sm cursor-pointer`} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30">
                      <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {milestone.name}
                        <br />
                        <span className="text-gray-300">{formatDate(milestone.date)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="p-4 border-t border-gray-100 flex gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span>Project Duration</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rotate-45 bg-orange-500" />
              <span>Upcoming Milestone</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rotate-45 bg-green-500" />
              <span>Completed Milestone</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-red-500" />
              <span>Today</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function TasksView({ project, tasks, onAdd, onUpdate }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState('medium');

  const handleAdd = async (e) => {
    e.preventDefault();
    await onAdd({ 
      project_id: project.id, 
      title: newTask, 
      status: 'todo',
      priority: newPriority,
      is_mine: true,
      assignee: 'Me',
    });
    setNewTask('');
    setNewPriority('medium');
    setIsAdding(false);
  };

  const handleToggle = async (task) => {
    await onUpdate(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-900">Tasks ({tasks.length})</h3>
        <Button onClick={() => setIsAdding(true)} className="text-sm py-1 px-3">+ Add Task</Button>
      </div>
      
      {isAdding && (
        <form onSubmit={handleAdd} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 animate-in fade-in slide-in-from-top-2">
          <input 
            autoFocus 
            className="input" 
            value={newTask} 
            onChange={e => setNewTask(e.target.value)} 
            placeholder="What needs to be done?" 
          />
          <div className="flex gap-2">
            <select
              className="input w-40"
              value={newPriority}
              onChange={e => setNewPriority(e.target.value)}
            >
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
            <div className="flex-1" />
            <Button variant="secondary" onClick={() => setIsAdding(false)}>Cancel</Button>
          <Button type="submit">Save</Button>
          </div>
        </form>
      )}

      {tasks.length === 0 && !isAdding ? (
        <div className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
          No tasks yet. Click "+ Add Task" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TaskColumn title="To Do" tasks={todoTasks} onToggle={handleToggle} />
          <TaskColumn title="In Progress" tasks={inProgressTasks} onToggle={handleToggle} />
          <TaskColumn title="Done" tasks={doneTasks} onToggle={handleToggle} />
        </div>
      )}
    </div>
  );
}

function TaskColumn({ title, tasks, onToggle }) {
  const bgColor = title === 'Done' ? 'bg-green-50' : title === 'In Progress' ? 'bg-blue-50' : 'bg-gray-50';
  
  return (
    <div className={`${bgColor} rounded-xl p-4 min-h-[200px]`}>
      <h4 className="font-bold text-gray-700 text-sm mb-3">{title} ({tasks.length})</h4>
      <div className="space-y-2">
        {tasks.map(task => (
          <div 
            key={task.id} 
            className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
          >
            <div className="flex items-start gap-2">
              <input 
                type="checkbox" 
                checked={task.status === 'done'} 
                onChange={() => onToggle(task)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600" 
              />
              <div className="flex-1">
                <span className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {task.title}
                </span>
                {task.priority && (
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {task.priority}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No tasks</p>
        )}
      </div>
    </div>
  );
}

function TimeView({ project, entries, onAdd }) {
  const [isAdding, setIsAdding] = useState(false);
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    await onAdd({ project_id: project.id, hours: Number(hours), notes, date: new Date().toISOString().split('T')[0] });
    setHours('');
    setNotes('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-900">Time Log</h3>
        <Button onClick={() => setIsAdding(true)} className="text-sm py-1 px-3">+ Log Time</Button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex gap-4">
            <div className="w-32">
              <label className="label">Hours</label>
              <input type="number" step="0.5" className="input" value={hours} onChange={e => setHours(e.target.value)} placeholder="0.0" />
            </div>
            <div className="flex-1">
              <label className="label">Description</label>
              <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="What did you work on?" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
             <Button variant="secondary" onClick={() => setIsAdding(false)}>Cancel</Button>
             <Button type="submit">Save Entry</Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {entries.length === 0 && !isAdding && <div className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">No time logged yet.</div>}
        {entries.map(entry => (
          <div key={entry.id} className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-4">
              <div className="bg-primary-50 text-primary-700 font-bold px-3 py-1 rounded-md">{entry.hours}h</div>
              <span className="text-gray-700 font-medium">{entry.notes}</span>
            </div>
            <span className="text-xs text-gray-400 font-medium">{formatDate(entry.date || entry.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button onClick={onClick} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
      {label}
    </button>
  );
}

function StatusBadge({ status }) {
   const s = STATUSES.find(st => st.id === status);
   const colors = {
     blue: 'bg-blue-50 text-blue-700 border-blue-100',
     yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
     green: 'bg-green-50 text-green-700 border-green-100',
   };
   return (
     <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[s?.color] || 'bg-gray-50 text-gray-700 border-gray-100'}`}>
       {s?.label || status}
     </span>
   );
}

function ProjectCard({ project, onEdit, onDelete }) {
  const status = STATUSES.find(s => s.id === project.status);
  const days = daysUntil(project.deadline);
  const isOverdue = days !== null && days < 0;
  
  return (
    <Card className="hover:shadow-md hover:border-primary-200 transition-all duration-200 h-full flex flex-col group">
      <div className="flex-1 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-bold text-gray-900 truncate text-lg">{project.name}</h3>
            {project.client && <p className="text-sm text-gray-500 truncate font-medium">{project.client}</p>}
          </div>
          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
            {project.phase && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                {project.phase}
              </span>
            )}
             <StatusBadge status={project.status} />
          </div>
        </div>

        {project.next_milestone && (
          <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100">
            <span className="font-semibold text-gray-900 block mb-1 text-xs uppercase tracking-wide">Next Milestone</span>
            {project.next_milestone}
          </div>
        )}

        {project.deadline && (
          <div className="text-sm flex items-center gap-2">
            <span className="text-gray-500">Deadline:</span>
            <span className={`font-medium ${isOverdue ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded' : 'text-gray-900'}`}>
              {formatDate(project.deadline)}
            </span>
          </div>
        )}

        {project.drive_folder_url && (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.71 3.5L1.15 15l3.43 6h13.67l3.43-6L15.13 3.5H7.71z"/>
            </svg>
            Drive linked
          </div>
        )}
      </div>

      <div className="flex space-x-2 pt-4 mt-2 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onEdit(project)} className="flex-1 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md">Edit</button>
        <button onClick={() => window.confirm('Delete?') && onDelete(project.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md">Delete</button>
      </div>
    </Card>
  );
}
