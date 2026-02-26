import { useMemo } from 'react';
import { useProjects } from '@/contexts/ProjectsContext';
import { useTasks } from '@/contexts/TasksContext';
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
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-surface-on-variant">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Active Projects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-surface-on">Active Projects</h2>
          <button
            onClick={() => onNavigate?.('projects')}
            className="text-sm text-primary hover:opacity-90 font-medium"
          >
            View all
          </button>
        </div>

        {activeProjects.length === 0 ? (
          <Card className="p-6 text-center text-outline">
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
          <h2 className="text-lg font-bold text-surface-on">
            Next Actions {nextActions.length > 0 && `(${nextActions.length})`}
          </h2>
          <button
            onClick={() => onNavigate?.('tasks')}
            className="text-sm text-primary hover:opacity-90 font-medium"
          >
            View all
          </button>
        </div>

        {nextActions.length === 0 ? (
          <Card className="p-6 text-center text-outline">
            No urgent tasks
          </Card>
        ) : (
          <Card className="divide-y divide-outline-variant">
            {nextActions.map(task => (
              <TaskRow key={task.id} task={task} projectName={projectMap[task.project_id]} />
            ))}
          </Card>
        )}
      </section>

      {/* Upcoming Dates */}
      {upcomingDates.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-surface-on mb-3">Upcoming</h2>
          <Card className="divide-y divide-outline-variant">
            {upcomingDates.map(task => (
              <div key={task.id} className="p-3 flex items-center gap-3">
                <span className="text-sm font-medium text-surface-on-variant w-20">
                  {formatDate(task.due_date)}
                </span>
                <span className="text-sm text-surface-on flex-1">{task.title}</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Overdue Invoices Alert */}
      {overdueInvoices.length > 0 && (
        <section>
          <Card
            className="p-4 bg-red-950/40 border border-red-800/20 cursor-pointer hover:shadow-glow-primary transition-shadow"
            onClick={() => onNavigate?.('money')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-400">
                  {overdueInvoices.length} Overdue Invoice{overdueInvoices.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-surface-on-variant">{formatCurrency(totalOutstanding)} outstanding</p>
              </div>
              <span className="text-sm text-primary font-medium">View</span>
            </div>
          </Card>
        </section>
      )}

      {/* Deals in Motion */}
      {activeOpportunities.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-surface-on">
              Deals in Motion ({activeOpportunities.length})
            </h2>
            <button
              onClick={() => onNavigate?.('deals')}
              className="text-sm text-primary hover:opacity-90 font-medium"
            >
              View all
            </button>
          </div>
          <p className="text-sm text-surface-on-variant -mt-2 mb-3">{formatCurrency(pipelineValue)} pipeline</p>

          <div className="space-y-2">
            {activeOpportunities.slice(0, 3).map(opp => (
              <Card key={opp.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-surface-on">{opp.title || opp.name}</p>
                    <p className="text-sm text-surface-on-variant mt-0.5">
                      {opp.next_action || opp.contact || 'No next action'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-surface-on">
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
      className="p-4 cursor-pointer hover:shadow-glow-primary transition-shadow"
      onClick={() => onNavigate?.('projects', { projectId: project.id })}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-surface-on">{project.name}</p>
          {(project.client || project.client_name) && (
            <p className="text-sm text-surface-on-variant">{project.client || project.client_name}</p>
          )}
        </div>
        {days !== null && (
          <span className={`text-xs font-medium ${
            days <= 3 ? 'text-red-400' : days <= 14 ? 'text-amber-400' : 'text-outline'
          }`}>
            {days <= 0 ? 'Due!' : `${days}d`}
          </span>
        )}
      </div>

      {project.next_milestone && (
        <p className="text-sm text-surface-on-variant mt-2">
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
    task.priority === 'high' ? 'border-l-red-500/40' :
    task.priority === 'medium' ? 'border-l-amber-400/40' :
    'border-l-transparent';

  return (
    <div className={`p-3 border-l-2 ${borderColor}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {projectName && (
            <p className="text-[16px] font-medium text-outline uppercase tracking-wide mb-0.5">
              {projectName}
            </p>
          )}
          <p className="text-sm text-surface-on leading-snug">{task.title}</p>
          {task.subtitle && (
            <p className="text-xs text-surface-on-variant mt-0.5 truncate">{task.subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          {task.due_date && (
            <span className={`text-xs font-medium ${
              isOverdue ? 'text-red-400' :
              isToday ? 'text-amber-400' :
              'text-outline'
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
    lead: 'bg-blue-500/15 text-blue-400',
    qualified: 'bg-cyan-500/15 text-cyan-400',
    proposal: 'bg-purple-500/15 text-purple-400',
    negotiation: 'bg-amber-500/15 text-amber-400',
    won: 'bg-green-500/15 text-green-400',
    closed_won: 'bg-green-500/15 text-green-400',
    lost: 'bg-surface-container-high text-surface-on-variant',
    closed_lost: 'bg-surface-container-high text-surface-on-variant',
  };

  const displayName = stage?.replace('closed_', '').replace('_', ' ');

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${styles[stage] || styles.lead}`}>
      {displayName || stage}
    </span>
  );
}
