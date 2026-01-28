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
              <span className="font-medium text-gray-900 flex-1">{data.title}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {data.priority && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    data.priority === 'high' ? 'bg-red-100 text-red-700' :
                    data.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {data.priority}
                  </span>
                )}
                {data.is_mine !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    data.is_mine ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {data.is_mine ? 'Mine' : 'Team'}
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500 flex flex-wrap gap-x-2">
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
              <span className="font-medium text-gray-900 flex-1">{data.name}</span>
              {data.phase && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  {data.phase}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {data.client && `Client: ${data.client} • `}
              Status: {data.status}
              {data.deadline && ` • Deadline: ${formatDate(data.deadline)}`}
            </div>
          </div>
        );
      case 'project-update':
        return (
          <div className="space-y-1">
            <div className="font-medium text-gray-900">{data.project_name}</div>
            <div className="text-sm text-gray-500">
              {data.status && `Status: ${data.status} • `}
              {data.next_milestone && `Milestone: ${data.next_milestone} • `}
              {data.deadline && `Deadline: ${formatDate(data.deadline)}`}
            </div>
          </div>
        );
      case 'opportunity':
        return (
          <div className="space-y-1">
            <div className="font-medium text-gray-900">{data.name}</div>
            <div className="text-sm text-gray-500">
              {data.contact && `Contact: ${data.contact} • `}
              {data.value > 0 && `Value: $${data.value.toLocaleString()} • `}
              Stage: {data.stage}
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="space-y-1">
            <div className="font-medium text-gray-900">{data.name}</div>
            <div className="text-sm text-gray-500">
              {data.company && `${data.company} • `}
              {data.email && `${data.email} • `}
              {data.phone}
            </div>
          </div>
        );
      case 'time-entry':
        return (
          <div className="space-y-1">
            <div className="font-medium text-gray-900">{data.hours}h - {data.notes}</div>
            <div className="text-sm text-gray-500">
              {data.project_name && `Project: ${data.project_name} • `}
              Date: {formatDate(data.date || new Date().toISOString().split('T')[0])}
            </div>
          </div>
        );
      default:
        return <div className="text-gray-500">Unknown item type</div>;
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
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Back to AI Notes"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Ignored Items</h2>
            <p className="text-gray-500 mt-1">Review and manage items you've ignored from AI Notes parsing.</p>
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
        <Card className="p-12 text-center text-gray-400">
          <div className="text-4xl mb-4">⏸</div>
          <p className="text-lg font-medium mb-2">No ignored items</p>
          <p className="text-sm">Items you ignore in AI Notes will appear here for review.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByType).map(([type, items]) => (
            <div key={type} className="space-y-3">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                {typeLabels[type] || type} ({items.length})
              </h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <Card 
                    key={item.id} 
                    className={`p-4 cursor-pointer transition-all ${
                      selectedItem?.id === item.id 
                        ? 'bg-primary-50 border-primary-300' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        {getItemDetails(item)}
                        <div className="text-xs text-gray-400 mt-2">
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
                          className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50"
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

