import { useMemo } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useTransactions } from '@/hooks/useTransactions';
import { useTasks } from '@/hooks/useTasks';
import { useOpportunities } from '@/hooks/useOpportunities';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils';

export function DashboardV2({ onNavigate }) {
  const { projects, activeProjects, loading: projectsLoading } = useProjects();
  const { 
    cashPosition, 
    upcomingIncome, 
    upcomingExpenses,
    getProjectTotals,
    loading: transactionsLoading 
  } = useTransactions();
  const { getTodayTasks, getHighPriorityTasks, getUpcomingTasks, loading: tasksLoading } = useTasks();
  const { activeOpportunities, pipelineValue, loading: oppsLoading } = useOpportunities();

  const loading = projectsLoading || transactionsLoading || tasksLoading || oppsLoading;

  // Get next actions (today's tasks + high priority)
  const nextActions = useMemo(() => {
    const todayTasks = getTodayTasks();
    const highPriority = getHighPriorityTasks().filter(
      t => !todayTasks.find(tt => tt.id === t.id)
    );
    return [...todayTasks, ...highPriority].slice(0, 5);
  }, [getTodayTasks, getHighPriorityTasks]);

  // Get upcoming dates (tasks with due dates in next 14 days)
  const upcomingDates = useMemo(() => {
    return getUpcomingTasks(14).slice(0, 5);
  }, [getUpcomingTasks]);

  // Projects with financials
  const projectsWithFinancials = useMemo(() => {
    return activeProjects.map(project => {
      const totals = getProjectTotals(project.id);
      const budget = parseFloat(project.budget) || 0;
      const progress = budget > 0 ? Math.min(100, (totals.expenses / budget) * 100) : 0;
      return {
        ...project,
        ...totals,
        budget,
        progress,
      };
    });
  }, [activeProjects, getProjectTotals]);

  // Next upcoming income/expense
  const nextIncome = upcomingIncome[0];
  const nextExpense = upcomingExpenses[0];

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
      {/* Cash Position - Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <p className="text-slate-400 text-sm font-medium mb-1">CASH NOW</p>
        <p className="text-4xl font-bold tracking-tight">
          {formatCurrency(cashPosition)}
        </p>
        
        {/* Upcoming flows */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {nextIncome && (
            <div className="flex items-center gap-2">
              <span className="text-green-400">+{formatCurrency(nextIncome.amount)}</span>
              <span className="text-slate-400">
                in ({formatDate(nextIncome.date)})
              </span>
            </div>
          )}
          {nextExpense && (
            <div className="flex items-center gap-2">
              <span className="text-red-400">-{formatCurrency(nextExpense.amount)}</span>
              <span className="text-slate-400">
                out ({nextExpense.description})
              </span>
            </div>
          )}
        </div>
      </div>

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
        
        {projectsWithFinancials.length === 0 ? (
          <Card className="p-6 text-center text-gray-400">
            No active projects
          </Card>
        ) : (
          <div className="space-y-3">
            {projectsWithFinancials.slice(0, 3).map(project => (
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
              <TaskRow key={task.id} task={task} />
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

      {/* Deals in Motion */}
      {activeOpportunities.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Deals in Motion ({activeOpportunities.length})
            </h2>
            <span className="text-sm text-gray-500">
              {formatCurrency(pipelineValue)} pipeline
            </span>
          </div>
          
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
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-gray-900">{project.name}</p>
          {(project.client || project.client_name) && (
            <p className="text-sm text-gray-500">{project.client || project.client_name}</p>
          )}
        </div>
        <p className="font-bold text-gray-900">
          {formatCurrency(project.profit)}
        </p>
      </div>
      
      <div className="text-sm text-gray-500 mb-3">
        Revenue: {formatCurrency(project.income)} | Spent: {formatCurrency(project.expenses)}
      </div>
      
      {project.next_milestone && (
        <p className="text-sm text-gray-600 mb-3">
          Next: {project.next_milestone}
          {days !== null && days <= 14 && (
            <span className={`ml-2 ${days <= 3 ? 'text-red-600' : 'text-amber-600'}`}>
              ({days <= 0 ? 'Due!' : `${days}d`})
            </span>
          )}
        </p>
      )}
      
      {/* Progress bar */}
      {project.budget > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Budget used</span>
            <span>{Math.round(project.progress)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                project.progress > 90 ? 'bg-red-500' : 
                project.progress > 70 ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, project.progress)}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

function TaskRow({ task }) {
  const isToday = task.due_date && daysUntil(task.due_date) === 0;
  const isOverdue = task.due_date && daysUntil(task.due_date) < 0;
  
  return (
    <div className="p-3 flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        task.priority === 'high' ? 'bg-red-500' :
        task.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-300'
      }`} />
      <span className="text-sm text-gray-900 flex-1">{task.title}</span>
      {isToday && (
        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
          TODAY
        </span>
      )}
      {isOverdue && (
        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
          OVERDUE
        </span>
      )}
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
