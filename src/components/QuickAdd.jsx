import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useProjects } from '@/hooks/useProjects';

export function QuickAdd() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('opportunity');

  const { addOpportunity } = useOpportunities();
  const { addProject } = useProjects();

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    value: '',
    due_date: '',
    notes: '',
    drive_folder_link: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (type === 'opportunity') {
      await addOpportunity({
        name: formData.name,
        contact: formData.contact || null,
        value: parseFloat(formData.value) || 0,
        due_date: formData.due_date || null,
        stage: 'lead',
        notes: formData.notes || null,
        drive_folder_link: formData.drive_folder_link || null,
      });
    } else {
      await addProject({
        name: formData.name,
        client: formData.contact || null,
        deadline: formData.due_date || null,
        status: 'in_progress',
        notes: formData.notes || null,
        drive_folder_link: formData.drive_folder_link || null,
      });
    }

    setIsOpen(false);
    setFormData({ name: '', contact: '', value: '', due_date: '', notes: '', drive_folder_link: '' });
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="text-sm md:text-base">
        + Quick Add
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Quick Add"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Type</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setType('opportunity')}
                className={`flex-1 px-4 py-2 rounded-full font-medium transition-colors ${
                  type === 'opportunity'
                    ? 'bg-primary text-primary-on'
                    : 'bg-surface-container-highest text-surface-on'
                }`}
              >
                🎯 Opportunity
              </button>
              <button
                type="button"
                onClick={() => setType('project')}
                className={`flex-1 px-4 py-2 rounded-full font-medium transition-colors ${
                  type === 'project'
                    ? 'bg-primary text-primary-on'
                    : 'bg-surface-container-highest text-surface-on'
                }`}
              >
                📁 Project
              </button>
            </div>
          </div>

          <div>
            <label className="label">
              {type === 'opportunity' ? 'Opportunity Name' : 'Project Name'} *
            </label>
            <input
              type="text"
              required
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={type === 'opportunity' ? 'Website redesign' : 'Client project'}
            />
          </div>

          <div>
            <label className="label">
              {type === 'opportunity' ? 'Contact' : 'Client'}
            </label>
            <input
              type="text"
              className="input"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              placeholder="Jane Smith - jane@company.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Value</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="label">
                {type === 'opportunity' ? 'Due Date' : 'Deadline'}
              </label>
              <input
                type="date"
                className="input"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
            />
          </div>

          <div>
            <label className="label">Google Drive Folder Link</label>
            <input
              type="url"
              className="input"
              value={formData.drive_folder_link}
              onChange={(e) => setFormData({ ...formData, drive_folder_link: e.target.value })}
              placeholder="https://drive.google.com/drive/folders/..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              Add {type === 'opportunity' ? 'Opportunity' : 'Project'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
