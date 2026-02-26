import { useState, useEffect } from 'react';
import { useTasks } from '@/contexts/TasksContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';

export function AddTaskSheet({ isOpen, onClose, preselectedProjectId }) {
  const { addTask } = useTasks();
  const { activeProjects } = useProjects();

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    project_id: '',
    due_date: '',
    priority: '',
    status: 'todo',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        subtitle: '',
        project_id: preselectedProjectId || '',
        due_date: '',
        priority: '',
        status: 'todo',
      });
    }
  }, [isOpen, preselectedProjectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      await addTask({
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || null,
        project_id: formData.project_id || null,
        due_date: formData.due_date || null,
        priority: formData.priority || null,
        status: formData.status,
        is_mine: true,
      });
      onClose();
    } catch (err) {
      console.error('Failed to add task:', err);
      alert('Failed to add task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-surface-on-variant mb-1">
            What needs to be done? *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-3 border border-outline rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-lg"
            placeholder="Order media server"
            autoFocus
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-surface-on-variant mb-1">
            Notes (optional)
          </label>
          <textarea
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            className="w-full px-3 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Additional details..."
            rows={2}
          />
        </div>

        {/* Project */}
        <div>
          <label className="block text-sm font-medium text-surface-on-variant mb-1">
            Project
          </label>
          <select
            value={formData.project_id}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            className="w-full px-3 py-3 border border-outline rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">No project</option>
            {activeProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-surface-on-variant mb-1">
            Due date
          </label>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="w-full px-3 py-3 border border-outline rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-surface-on-variant mb-2">
            Priority
          </label>
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
                    : 'bg-surface-container text-outline hover:bg-surface-container-high'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          disabled={saving || !formData.title.trim()}
          className="w-full py-3 text-lg"
        >
          {saving ? 'Saving...' : 'Add Task'}
        </Button>
      </form>
    </Sheet>
  );
}
