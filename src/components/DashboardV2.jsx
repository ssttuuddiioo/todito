import { useMemo } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useInvoices } from '@/hooks/useInvoices';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils';

export function DashboardV2({ onNavigate }) {
  const { projects, activeProjects, loading: projectsLoading } = useProjects();
  const { getTodayTasks, getHighPriorityTasks, getOverdueTasks, getUpcomingTasks, loading: tasksLoading } = useTasks();
  const { activeOpportunities, pipelineValue, loading: oppsLoading } = useOpportunities();
  const { overdueInvoices, totalOutstanding, loading: invoicesLoading } = useInvoices();

  const loading = projectsLoading || tasksLoading || oppsLoading;

  // Project lookup map
  const projectMap = useMemo(() => {
    const map = {};
    projects.forEach(p => { map[p.id] = p.name; });
    return map;
  }, [projects]);

  // Get next actions (overdue + today + high priority)
  const nextActions = useMemo(() => {
    const overdue = getOverdueTasks();
    const todayTasks = getTodayTasks().filter(
      t => !overdue.find(o => o.id === t.id)
    );
    const highPriority = getHighPriorityTasks().filter(
      t => !overdue.find(o => o.id === t.id) && !todayTasks.find(tt => tt.id === t.id)
    );
    return [...overdue, ...todayTasks, ...highPriority].slice(0, 8);
  }, [getOverdueTasks, getTodayTasks, getHighPriorityTasks]);

  // Get upcoming dates (tasks with due dates in next 14 days)
  const upcomingDates = useMemo(() => {
    return getUpcomingTasks(14).slice(0, 5);
  }, [getUpcomingTasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Active Projects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Active Projects</h2>
          <button 
            onClick={() => onNavigate?.('projects')}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all
          </button>
        </div>
        
        {activeProjects.length === 0 ? (
          <Card className="p-6 text-center text-gray-400">
            No active projects
          </Card>
        ) : (
          <div className="space-y-3">
            {activeProjects.slice(0, 3).map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </section>

      {/* Next Actions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">
            Next Actions {nextActions.length > 0 && `(${nextActions.length})`}
          </h2>
          <button 
            onClick={() => onNavigate?.('tasks')}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all
          </button>
        </div>
        
        {nextActions.length === 0 ? (
          <Card className="p-6 text-center text-gray-400">
            No urgent tasks
          </Card>
        ) : (
          <Card className="divide-y divide-gray-100">
            {nextActions.map(task => (
              <TaskRow key={task.id} task={task} projectName={projectMap[task.project_id]} />
            ))}
          </Card>
        )}
      </section>

      {/* Upcoming Dates */}
      {upcomingDates.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Upcoming</h2>
          <Card className="divide-y divide-gray-100">
            {upcomingDates.map(task => (
              <div key={task.id} className="p-3 flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500 w-20">
                  {formatDate(task.due_date)}
                </span>
                <span className="text-sm text-gray-900 flex-1">{task.title}</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Overdue Invoices Alert */}
      {overdueInvoices.length > 0 && (
        <section>
          <Card
            className="p-4 border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate?.('money')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-700">
                  {overdueInvoices.length} Overdue Invoice{overdueInvoices.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-500">{formatCurrency(totalOutstanding)} outstanding</p>
              </div>
              <span className="text-sm text-primary-600 font-medium">View</span>
            </div>
          </Card>
        </section>
      )}

      {/* Deals in Motion */}
      {activeOpportunities.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Deals in Motion ({activeOpportunities.length})
            </h2>
            <button
              onClick={() => onNavigate?.('deals')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View all
            </button>
          </div>
          <p className="text-sm text-gray-500 -mt-2 mb-3">{formatCurrency(pipelineValue)} pipeline</p>
          
          <div className="space-y-2">
            {activeOpportunities.slice(0, 3).map(opp => (
              <Card key={opp.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{opp.title || opp.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {opp.next_action || opp.contact || 'No next action'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(opp.value)}
                    </p>
                    <StageBadge stage={opp.stage} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProjectCard({ project, onNavigate }) {
  const days = project.deadline ? daysUntil(project.deadline) : null;

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onNavigate?.('projects', { projectId: project.id })}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{project.name}</p>
          {(project.client || project.client_name) && (
            <p className="text-sm text-gray-500">{project.client || project.client_name}</p>
          )}
        </div>
        {days !== null && (
          <span className={`text-xs font-medium ${
            days <= 3 ? 'text-red-600' : days <= 14 ? 'text-amber-600' : 'text-gray-400'
          }`}>
            {days <= 0 ? 'Due!' : `${days}d`}
          </span>
        )}
      </div>

      {project.next_milestone && (
        <p className="text-sm text-gray-600 mt-2">
          Next: {project.next_milestone}
        </p>
      )}
    </Card>
  );
}

function TaskRow({ task, projectName }) {
  const days = task.due_date ? daysUntil(task.due_date) : null;
  const isToday = days === 0;
  const isOverdue = days !== null && days < 0;

  const borderColor =
    task.priority === 'high' ? 'border-l-red-500' :
    task.priority === 'medium' ? 'border-l-amber-400' :
    'border-l-transparent';

  return (
    <div className={`p-3 border-l-[3px] ${borderColor}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {projectName && (
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
              {projectName}
            </p>
          )}
          <p className="text-sm text-gray-900 leading-snug">{task.title}</p>
          {task.subtitle && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{task.subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          {task.due_date && (
            <span className={`text-xs font-medium ${
              isOverdue ? 'text-red-600' :
              isToday ? 'text-amber-600' :
              'text-gray-400'
            }`}>
              {isOverdue ? `${Math.abs(days)}d overdue` :
               isToday ? 'Today' :
               formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StageBadge({ stage }) {
  const styles = {
    lead: 'bg-blue-100 text-blue-700',
    qualified: 'bg-cyan-100 text-cyan-700',
    proposal: 'bg-purple-100 text-purple-700',
    negotiation: 'bg-amber-100 text-amber-700',
    won: 'bg-green-100 text-green-700',
    closed_won: 'bg-green-100 text-green-700',
    lost: 'bg-gray-100 text-gray-500',
    closed_lost: 'bg-gray-100 text-gray-500',
  };
  
  const displayName = stage?.replace('closed_', '').replace('_', ' ');
  
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${styles[stage] || styles.lead}`}>
      {displayName || stage}
    </span>
  );
}
