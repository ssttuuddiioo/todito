import { useOpportunities } from '@/hooks/useOpportunities';
import { useProjects } from '@/hooks/useProjects';
import { useFinance } from '@/hooks/useFinance';
import { useTasks } from '@/hooks/useTasks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QuickAdd } from '@/components/QuickAdd';
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils';
import confetti from 'canvas-confetti';

export function Dashboard({ onNavigate }) {
  const { opportunities, updateOpportunity, loading: oppsLoading } = useOpportunities();
  const { projects, addProject, getUpcomingMilestones, getActiveProjects, getNextMilestone, loading: projectsLoading } = useProjects();
  const { invoices, expenses, loading: financeLoading } = useFinance();
  const { 
    tasks, 
    getMyTasks, 
    getUpcomingTasks, 
    getHighPriorityTasks, 
    getOverdueTasks,
    getAllActiveTasks,
    updateTask, 
    loading: tasksLoading 
  } = useTasks();

  if (oppsLoading || projectsLoading || financeLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 animate-pulse">Loading your workspace...</div>
      </div>
    );
  }

  // Data
  const activeProjects = getActiveProjects();
  const myTasks = getMyTasks();
  const highPriorityTasks = getHighPriorityTasks();
  const overdueTasks = getOverdueTasks();
  const upcomingTasks = getUpcomingTasks(7);
  const upcomingMilestones = getUpcomingMilestones(14);
  const allActiveTasks = getAllActiveTasks();

  // Today's tasks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todaysTasks = tasks?.filter(t => {
    if (!t.due_date || t.status === 'done') return false;
    const dueDate = new Date(t.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  }) || [];

  // Finance
  const totalRevenue = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, i) => sum + (Number(i.amount) || 0), 0) || 0;
  const profit = totalRevenue - totalExpenses;

  const activeOpportunities = opportunities?.filter(o => !['won', 'lost'].includes(o.stage)) || [];
  const totalPipelineValue = activeOpportunities.reduce((sum, o) => sum + (o.value || 0), 0);

  const handleConvertToProject = async (opp) => {
    if (window.confirm(`Convert "${opp.name}" to a project? This will mark the deal as won.`)) {
      await addProject({
        name: opp.name,
        client: opp.contact?.split(' - ')[0] || opp.contact || 'New Client',
        status: 'in_progress',
        deadline: opp.due_date,
        notes: `Converted from opportunity. Original notes: ${opp.notes || ''}`,
      });
      await updateOpportunity(opp.id, { stage: 'won' });
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#22c55e', '#3b82f6', '#f59e0b'] });
    }
  };

  const handleToggleTask = (task) => {
    updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h2>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {overdueTasks.length > 0 && (
            <button 
              onClick={() => onNavigate('tasks')}
              className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
            >
              <span>⚠️</span>
              <span>{overdueTasks.length} Overdue</span>
            </button>
          )}
        <QuickAdd />
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <QuickStat 
          label="Today" 
          value={todaysTasks.length} 
          sublabel="tasks due"
          color="blue"
          onClick={() => onNavigate('tasks')}
        />
        <QuickStat 
          label="High Priority" 
          value={highPriorityTasks.length} 
          sublabel="urgent"
          color="red"
          onClick={() => onNavigate('tasks')}
        />
        <QuickStat 
          label="All Tasks" 
          value={allActiveTasks.length} 
          sublabel="active"
          color="purple"
          onClick={() => onNavigate('tasks')}
        />
        <QuickStat 
          label="Projects" 
          value={activeProjects.length} 
          sublabel="in progress"
          color="green"
          onClick={() => onNavigate('projects')}
        />
        <QuickStat 
          label="Pipeline" 
          value={formatCurrency(totalPipelineValue)} 
          sublabel={`${activeOpportunities.length} deals`}
          color="orange"
          onClick={() => onNavigate('crm')}
        />
        <QuickStat 
          label="Profit" 
          value={formatCurrency(profit)} 
          sublabel={profit >= 0 ? 'positive' : 'negative'}
          color={profit >= 0 ? 'green' : 'red'}
          onClick={() => onNavigate('revenue')}
        />
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Column 1: Tasks - Purple theme */}
        <div className="space-y-4 bg-purple-50/50 rounded-2xl p-4 border border-purple-100">
          {/* Today's Tasks */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Today's Tasks
                {todaysTasks.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{todaysTasks.length}</span>
                )}
              </h3>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {todaysTasks.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No tasks due today 🎉
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {todaysTasks.map(task => (
                    <TaskRow key={task.id} task={task} projects={projects} onToggle={handleToggleTask} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* High Priority Tasks */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                High Priority
                {highPriorityTasks.length > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{highPriorityTasks.length}</span>
                )}
              </h3>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {highPriorityTasks.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No high priority tasks
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {highPriorityTasks.slice(0, 5).map(task => (
                    <TaskRow key={task.id} task={task} projects={projects} onToggle={handleToggleTask} showPriority={false} />
                  ))}
                </div>
              )}
          </div>
          </section>

          {/* Latest Tasks */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Latest Tasks
              </h3>
              <button onClick={() => onNavigate('tasks')} className="text-xs text-primary-600 hover:underline">
                View all ({allActiveTasks.length})
              </button>
            </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {allActiveTasks.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No tasks yet. Add one!
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                  {allActiveTasks.slice(0, 10).map(task => (
                    <TaskRow key={task.id} task={task} projects={projects} onToggle={handleToggleTask} />
                  ))}
                  {allActiveTasks.length > 10 && (
                    <div className="p-3 text-center">
                      <button onClick={() => onNavigate('tasks')} className="text-sm text-primary-600 hover:underline">
                        +{allActiveTasks.length - 10} more tasks
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Column 2: Projects - Green theme */}
        <div className="space-y-4 bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Active Projects
              </h3>
              <button onClick={() => onNavigate('projects')} className="text-xs text-primary-600 hover:underline">
                View all
              </button>
            </div>
            <div className="space-y-3">
              {activeProjects.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 text-sm">
                  No active projects
                </div>
              ) : (
                activeProjects.map(project => {
                  const nextMilestone = getNextMilestone(project.id);
                  const days = daysUntil(project.deadline);
                  const isOverdue = days !== null && days < 0;
                  const projectTasks = tasks?.filter(t => t.project_id === project.id && t.status !== 'done') || [];
                  const completedTasks = tasks?.filter(t => t.project_id === project.id && t.status === 'done') || [];
                  const totalTasks = projectTasks.length + completedTasks.length;
                  const progress = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

                  return (
                    <div 
                      key={project.id} 
                      className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onNavigate('projects')}
                    >
                      {/* Header Row */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="font-bold text-gray-900 truncate text-sm flex-1">{project.name}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                          project.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {project.phase || project.status}
                        </span>
                        {project.deadline && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            {isOverdue ? '!' : `${days}d`}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 w-8 text-right">{progress}%</span>
                      </div>

                      {/* Bottom Row: Client + Milestone */}
                      <div className="flex items-center justify-between mt-2 text-[11px] text-gray-500">
                        <span className="truncate">{project.client}</span>
                        {nextMilestone && (
                          <span className="flex items-center gap-1 shrink-0">
                            <span className="w-1 h-1 rounded-full bg-orange-400" />
                            {nextMilestone.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Column 3: Upcoming & Opportunities - Blue theme */}
        <div className="space-y-4 bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
          {/* Upcoming (Next 7 Days) */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Upcoming (7 days)
              </h3>
              <button onClick={() => onNavigate('timeline')} className="text-xs text-primary-600 hover:underline">
                Timeline
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {(() => {
                const items = [
                  ...upcomingMilestones.slice(0, 3).map(m => ({ ...m, _type: 'milestone' })),
                  ...upcomingTasks.slice(0, 4).map(t => ({ ...t, _type: 'task' })),
                ].sort((a, b) => {
                  const dateA = new Date(a.date || a.due_date);
                  const dateB = new Date(b.date || b.due_date);
                  return dateA - dateB;
                }).slice(0, 8);

                if (items.length === 0) {
                  return (
                    <div className="p-6 text-center text-gray-400 text-sm">
                      Nothing scheduled
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-gray-100">
                    {items.map((item, i) => (
                      <div key={`${item._type}-${item.id || i}`} className="p-3 flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          item._type === 'milestone' ? 'bg-orange-400' :
                          item.priority === 'high' ? 'bg-red-400' :
                          item.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item._type === 'milestone' ? item.name : item.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {item._type === 'milestone' ? item.project_name : projects?.find(p => p.id === item.project_id)?.name || 'No project'}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatDate(item.date || item.due_date)}
                        </span>
                  </div>
                ))}
              </div>
                );
              })()}
            </div>
          </section>

          {/* Milestones */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                Milestones
              </h3>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {upcomingMilestones.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No upcoming milestones
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {upcomingMilestones.slice(0, 5).map((milestone, i) => {
                    const days = daysUntil(milestone.date);
                    return (
                      <div key={i} className="p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {days}d
          </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{milestone.name}</p>
                          <p className="text-xs text-gray-500 truncate">{milestone.project_name}</p>
        </div>
                        <span className="text-xs text-gray-400">{formatDate(milestone.date)}</span>
              </div>
                    );
                  })}
              </div>
              )}
            </div>
          </section>

          {/* Opportunities */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Opportunities
              </h3>
              <button onClick={() => onNavigate('crm')} className="text-xs text-primary-600 hover:underline">
                Pipeline
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {activeOpportunities.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No active opportunities
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activeOpportunities.slice(0, 4).map(opp => (
                    <div key={opp.id} className="p-3 flex items-center gap-3 group hover:bg-gray-50">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                        {opp.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{opp.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(opp.value)} • {opp.stage}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleConvertToProject(opp); }}
                        className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-all"
                      >
                        Convert
                      </button>
                    </div>
                  ))}
              </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// Quick Stat Component
function QuickStat({ label, value, sublabel, color, onClick }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100 hover:border-blue-200',
    red: 'bg-red-50 border-red-100 hover:border-red-200',
    green: 'bg-green-50 border-green-100 hover:border-green-200',
    purple: 'bg-purple-50 border-purple-100 hover:border-purple-200',
    orange: 'bg-orange-50 border-orange-100 hover:border-orange-200',
    gray: 'bg-gray-50 border-gray-100 hover:border-gray-200',
  };

  return (
    <div 
      onClick={onClick}
      className={`${colors[color] || colors.gray} border rounded-xl p-3 cursor-pointer transition-all hover:shadow-sm`}
    >
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      <p className="text-xs text-gray-400">{sublabel}</p>
          </div>
  );
}

// Task Row Component
function TaskRow({ task, projects, onToggle, showPriority = true }) {
  const project = projects?.find(p => p.id === task.project_id);
  const days = daysUntil(task.due_date);
  const isOverdue = days !== null && days < 0;

  return (
    <div className="p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors group">
      <input
        type="checkbox"
        checked={task.status === 'done'}
        onChange={() => onToggle(task)}
        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {project && <span className="truncate">{project.name}</span>}
          {project && task.due_date && <span>•</span>}
          {task.due_date && (
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              {isOverdue ? 'Overdue' : formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>
      {showPriority && task.priority && (
        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
          task.priority === 'high' ? 'bg-red-100 text-red-700' :
          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          {task.priority[0].toUpperCase()}
        </span>
      )}
    </div>
  );
}
