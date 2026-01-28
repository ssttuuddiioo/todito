import { useState, useEffect } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What needs to be done? *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
            placeholder="Order media server"
            autoFocus
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Additional details..."
            rows={2}
          />
        </div>

        {/* Project */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          <select
            value={formData.project_id}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">No project</option>
            {activeProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Due date
          </label>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <div className="flex gap-2">
            {[
              { id: '', label: 'None', color: 'bg-gray-100 text-gray-600' },
              { id: 'low', label: 'Low', color: 'bg-green-100 text-green-700' },
              { id: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700' },
              { id: 'high', label: 'High', color: 'bg-red-100 text-red-700' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setFormData({ ...formData, priority: p.id })}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  formData.priority === p.id
                    ? `${p.color} ring-2 ring-offset-1 ring-gray-400`
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
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
