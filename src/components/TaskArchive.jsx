import { useTasks } from '@/hooks/useTasks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

export function TaskArchive({ onNavigate }) {
  // Archived tasks are completed tasks
  const { doneTasks: archivedTasks } = useTasks();

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-surface-on tracking-tight">Task Archive</h2>
          <p className="text-surface-on-variant mt-1">View all completed and archived tasks.</p>
        </div>
        <Button variant="secondary" onClick={() => onNavigate?.('tasks')}>
          ← Back to Tasks
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-surface-on-variant">Total Archived</div>
          <div className="text-2xl font-bold text-surface-on mt-1">{archivedTasks?.length || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-surface-on-variant">This Month</div>
          <div className="text-2xl font-bold text-surface-on mt-1">
            {archivedTasks?.filter(t => {
              const archivedDate = new Date(t.archived_at || t.created_at);
              const now = new Date();
              return archivedDate.getMonth() === now.getMonth() && archivedDate.getFullYear() === now.getFullYear();
            }).length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-surface-on-variant">This Week</div>
          <div className="text-2xl font-bold text-surface-on mt-1">
            {archivedTasks?.filter(t => {
              const archivedDate = new Date(t.archived_at || t.created_at);
              const now = new Date();
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              return archivedDate >= weekAgo;
            }).length || 0}
          </div>
        </Card>
      </div>

      {/* Archived Tasks List */}
      {archivedTasks && archivedTasks.length > 0 ? (
        <div className="space-y-3">
          {archivedTasks
            .sort((a, b) => {
              const dateA = new Date(a.archived_at || a.created_at);
              const dateB = new Date(b.archived_at || b.created_at);
              return dateB - dateA; // Most recent first
            })
            .map(task => (
              <Card key={task.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-surface-on line-through">{task.title}</h4>
                      {task.priority === 'high' && (
                        <span className="text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded">High</span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-surface-on-variant mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-outline">
                      {task.archived_at && (
                        <span>Archived: {formatDate(task.archived_at)}</span>
                      )}
                      {task.due_date && (
                        <span>Due: {formatDate(task.due_date)}</span>
                      )}
                      {task.pomodoro_count > 0 && (
                        <span>
                          {'🍅'.repeat(Math.min(task.pomodoro_count, 3))}
                          {task.pomodoro_count >= 4 && '🍇'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="text-outline text-lg">No archived tasks yet</div>
          <p className="text-sm text-surface-on-variant mt-2">
            Completed tasks will appear here after you click "Clear" in the Done column
          </p>
        </Card>
      )}
    </div>
  );
}
