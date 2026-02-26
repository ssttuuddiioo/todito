import { useState } from 'react';
import { useIgnoredItems } from '@/hooks/useNotesArchive';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';

export function IgnoredTasks({ onNavigate }) {
  const { ignoredItems, deleteIgnoredItem } = useIgnoredItems();
  const [selectedItem, setSelectedItem] = useState(null);

  const handleDelete = (id) => {
    if (window.confirm('Permanently delete this ignored item?')) {
      deleteIgnoredItem(id);
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    }
  };

  const handleRestore = (item) => {
    // This would restore the item back to the AI Notes parser
    // For now, we'll just show a message
    alert('Restore functionality coming soon! This will allow you to bring the item back to the AI Notes parser.');
  };

  // Helper to get item data (supports both old mock format and new Supabase format)
  const getItemData = (item) => item.item_data || item.item || {};
  const getItemType = (item) => item.item_type || item.type || 'unknown';

  const getItemTitle = (item) => {
    const data = getItemData(item);
    switch (getItemType(item)) {
      case 'task':
        return data.title;
      case 'project':
        return data.name;
      case 'project-update':
        return data.project_name;
      case 'opportunity':
        return data.name;
      case 'contact':
        return data.name;
      case 'time-entry':
        return `${data.hours}h - ${data.notes}`;
      default:
        return 'Unknown item';
    }
  };

  const getItemDetails = (item) => {
    const data = getItemData(item);
    const type = getItemType(item);

    switch (type) {
      case 'task':
        return (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="font-medium text-surface-on flex-1">{data.title}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {data.priority && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    data.priority === 'high' ? 'bg-red-500/15 text-red-400' :
                    data.priority === 'medium' ? 'bg-yellow-500/15 text-yellow-400' :
                    'bg-green-500/15 text-green-400'
                  }`}>
                    {data.priority}
                  </span>
                )}
                {data.is_mine !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    data.is_mine ? 'bg-blue-500/15 text-blue-400' : 'bg-surface-container-high text-surface-on-variant'
                  }`}>
                    {data.is_mine ? 'Mine' : 'Team'}
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-surface-on-variant flex flex-wrap gap-x-2">
              {data.project_name && <span>Project: {data.project_name}</span>}
              {data.assignee && <span>• Assignee: {data.assignee}</span>}
              {data.due_date && <span>• Due: {formatDate(data.due_date)}</span>}
            </div>
          </div>
        );
      case 'project':
        return (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="font-medium text-surface-on flex-1">{data.name}</span>
              {data.phase && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
                  {data.phase}
                </span>
              )}
            </div>
            <div className="text-sm text-surface-on-variant">
              {data.client && `Client: ${data.client} • `}
              Status: {data.status}
              {data.deadline && ` • Deadline: ${formatDate(data.deadline)}`}
            </div>
          </div>
        );
      case 'project-update':
        return (
          <div className="space-y-1">
            <div className="font-medium text-surface-on">{data.project_name}</div>
            <div className="text-sm text-surface-on-variant">
              {data.status && `Status: ${data.status} • `}
              {data.next_milestone && `Milestone: ${data.next_milestone} • `}
              {data.deadline && `Deadline: ${formatDate(data.deadline)}`}
            </div>
          </div>
        );
      case 'opportunity':
        return (
          <div className="space-y-1">
            <div className="font-medium text-surface-on">{data.name}</div>
            <div className="text-sm text-surface-on-variant">
              {data.contact && `Contact: ${data.contact} • `}
              {data.value > 0 && `Value: $${data.value.toLocaleString()} • `}
              Stage: {data.stage}
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="space-y-1">
            <div className="font-medium text-surface-on">{data.name}</div>
            <div className="text-sm text-surface-on-variant">
              {data.company && `${data.company} • `}
              {data.email && `${data.email} • `}
              {data.phone}
            </div>
          </div>
        );
      case 'time-entry':
        return (
          <div className="space-y-1">
            <div className="font-medium text-surface-on">{data.hours}h - {data.notes}</div>
            <div className="text-sm text-surface-on-variant">
              {data.project_name && `Project: ${data.project_name} • `}
              Date: {formatDate(data.date || new Date().toISOString().split('T')[0])}
            </div>
          </div>
        );
      default:
        return <div className="text-surface-on-variant">Unknown item type</div>;
    }
  };

  const groupedByType = ignoredItems.reduce((acc, item) => {
    const type = getItemType(item);
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(item);
    return acc;
  }, {});

  const typeLabels = {
    'task': 'Tasks',
    'project': 'Projects',
    'project-update': 'Project Updates',
    'opportunity': 'Opportunities',
    'contact': 'Contacts',
    'time-entry': 'Time Entries',
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {onNavigate && (
            <button
              onClick={() => onNavigate('ai-notes')}
              className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
              title="Back to AI Notes"
            >
              <svg className="w-5 h-5 text-surface-on-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <div>
            <h2 className="text-3xl font-bold text-surface-on tracking-tight">Ignored Items</h2>
            <p className="text-surface-on-variant mt-1">Review and manage items you've ignored from AI Notes parsing.</p>
          </div>
        </div>
        {ignoredItems.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => {
              if (window.confirm(`Delete all ${ignoredItems.length} ignored items?`)) {
                ignoredItems.forEach(item => deleteIgnoredItem(item.id));
              }
            }}
          >
            Clear All
          </Button>
        )}
      </div>

      {ignoredItems.length === 0 ? (
        <Card className="p-12 text-center text-outline">
          <div className="text-4xl mb-4">⏸</div>
          <p className="text-lg font-medium mb-2">No ignored items</p>
          <p className="text-sm">Items you ignore in AI Notes will appear here for review.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByType).map(([type, items]) => (
            <div key={type} className="space-y-3">
              <h3 className="text-sm font-bold text-surface-on-variant uppercase tracking-wide">
                {typeLabels[type] || type} ({items.length})
              </h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedItem?.id === item.id
                        ? 'bg-primary-50 border-primary'
                        : 'bg-surface border-outline-variant hover:bg-surface-container-high'
                    }`}
                    onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        {getItemDetails(item)}
                        <div className="text-xs text-outline mt-2">
                          Ignored on {formatDate(item.ignored_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(item);
                          }}
                        >
                          Restore
                        </Button>
                        <Button
                          variant="secondary"
                          className="text-xs px-3 py-1.5 text-red-400 hover:bg-red-500/15"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
