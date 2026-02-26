import { useState, useRef, useEffect } from 'react';
import { formatDate, daysUntil } from '@/lib/utils';

const icons = {
  calendar: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  tag: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><circle cx="7" cy="7" r="1" />
    </svg>
  ),
  note: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  trash: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  ),
  tomato: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 5c-1-2-3-3-5-3M12 5c1-2 3-3 5-3" />
      <path d="M12 5V3" />
    </svg>
  ),
  arrowLeft: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
};

const TAG_PRESETS = [
  { label: 'bug', color: '#ef4444' },
  { label: 'feature', color: '#22d3ee' },
  { label: 'design', color: '#60a5fa' },
  { label: 'urgent', color: '#f97316' },
  { label: 'research', color: '#a78bfa' },
  { label: 'finance', color: '#10b981' },
];

// Urgency border color based on days until due
function urgencyBorder(days) {
  if (days === null) return 'border-l-green-500'; // no date = calm
  if (days <= 1) return 'border-l-red-500';       // overdue or 1 day
  if (days <= 4) return 'border-l-amber-400';     // 2-4 days
  return 'border-l-green-500';                     // 5+ days
}

export function KanbanCard({ task, isDragOverlay, onToggleStatus, onDelete, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [editingField, setEditingField] = useState(null); // 'title' | 'subtitle' | 'due_date' | 'tags' | 'notes'
  const cardRef = useRef(null);

  const isDone = task.status === 'done';
  const isInProgress = task.status === 'in_progress';
  const days = task.due_date ? daysUntil(task.due_date) : null;

  // Close card when clicking outside
  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setExpanded(false);
        setEditingField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expanded]);

  const handleCardClick = (e) => {
    if (e.target.closest('[data-editor]')) return;
    if (editingField === 'title' || editingField === 'subtitle') return;
    setExpanded(!expanded);
    if (expanded) setEditingField(null);
  };

  const handleIconClick = (e, key) => {
    e.stopPropagation();
    setEditingField(editingField === key ? null : key);
  };

  const handleUpdate = (key, value) => {
    onUpdate?.(key, value);
    if (key !== 'tags') setEditingField(null);
  };

  const borderColor = isDone ? 'border-l-outline' : isInProgress ? 'border-l-orange-500' : urgencyBorder(days);

  return (
    <div
      ref={cardRef}
      className={`bg-surface-container-highest rounded-md border border-outline-variant border-l-2 ${borderColor} p-3 ${
        isDragOverlay ? 'shadow-elevation-3 ring-2 ring-primary/30' : 'shadow-elevation-1 hover:shadow-elevation-2'
      } transition-all cursor-grab active:cursor-grabbing`}
      onClick={handleCardClick}
    >
      {/* Title — click to edit */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {editingField === 'title' ? (
            <input
              data-editor
              autoFocus
              className="w-full bg-transparent text-sm text-surface-on outline-none border-b border-primary pb-0.5"
              defaultValue={task.title}
              onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdate('title', e.target.value); } }}
              onBlur={(e) => handleUpdate('title', e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p
              className={`text-sm ${isDone ? 'line-through text-outline' : 'text-surface-on'} ${!isDone && expanded ? 'cursor-text hover:text-primary' : ''}`}
              onDoubleClick={(e) => {
                if (expanded && !isDone) {
                  e.stopPropagation();
                  setEditingField('title');
                }
              }}
            >
              {task.title}
            </p>
          )}

          {/* Subtitle — click to edit */}
          {editingField === 'subtitle' ? (
            <input
              data-editor
              autoFocus
              className="w-full bg-transparent text-xs text-surface-on-variant outline-none border-b border-primary pb-0.5 mt-0.5"
              defaultValue={task.subtitle || ''}
              placeholder="Add detail..."
              onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdate('subtitle', e.target.value); } }}
              onBlur={(e) => handleUpdate('subtitle', e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            task.subtitle && !isDone ? (
              <p
                className={`text-xs text-surface-on-variant mt-0.5 truncate ${expanded ? 'cursor-text hover:text-primary' : ''}`}
                onDoubleClick={(e) => {
                  if (expanded) {
                    e.stopPropagation();
                    setEditingField('subtitle');
                  }
                }}
              >
                {task.subtitle}
              </p>
            ) : expanded && !isDone && !task.subtitle ? (
              <p
                className="text-xs text-outline/50 mt-0.5 cursor-text hover:text-outline"
                onDoubleClick={(e) => { e.stopPropagation(); setEditingField('subtitle'); }}
              >
                Add detail...
              </p>
            ) : null
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          {isInProgress ? (
            <>
              {/* Back to todo */}
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate?.('status', 'todo'); }}
                className="w-4 h-4 rounded border border-outline hover:border-primary flex items-center justify-center text-outline hover:text-primary"
                title="Back to todo"
              >
                {icons.arrowLeft}
              </button>
              {/* Mark done */}
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate?.('status', 'done'); }}
                className="w-4 h-4 rounded border border-outline hover:border-green-500 flex items-center justify-center text-outline hover:text-green-500"
                title="Mark done"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </>
          ) : (
            <>
              {/* Start / in progress */}
              {!isDone && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUpdate?.('status', 'in_progress'); }}
                  className="w-4 h-4 rounded flex items-center justify-center text-outline/40 hover:text-orange-400"
                  title="Start working"
                >
                  {icons.tomato}
                </button>
              )}
              {/* Checkbox */}
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleStatus?.(); }}
                className={`w-4 h-4 rounded border flex items-center justify-center ${
                  isDone
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-outline hover:border-primary'
                }`}
              >
                {isDone && (
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tags — always visible when present */}
      {task.tags?.length > 0 && !isDone && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.map((tag, i) => (
            <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Due date — always visible when set */}
      {task.due_date && !isDone && (
        <div className="mt-1.5">
          <span className={`text-[10px] font-medium ${
            days <= 1 ? 'text-red-400' :
            days <= 4 ? 'text-amber-400' :
            'text-outline'
          }`}>
            {days < 0 ? `${Math.abs(days)}d overdue` :
             days === 0 ? 'Today' :
             days === 1 ? 'Tomorrow' :
             formatDate(task.due_date)}
          </span>
        </div>
      )}

      {/* Notes — always visible when present */}
      {task.notes?.length > 0 && !isDone && (
        <div className="mt-1.5 space-y-0.5">
          {task.notes.map((note, i) => (
            <p key={i} className="text-[10px] text-surface-on-variant flex items-start gap-1">
              <span className="text-outline mt-px">-</span>
              <span>{note}</span>
            </p>
          ))}
        </div>
      )}

      {/* Expanded: tags + notes always visible, calendar on icon click */}
      {expanded && !isDone && !isInProgress && (
        <>
          {/* Tags — always shown when expanded */}
          <div className="mt-2 space-y-1.5" data-editor onClick={(e) => e.stopPropagation()}>
            {/* Existing tags with remove */}
            {task.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag, i) => (
                  <button key={i}
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5 hover:opacity-80"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    onClick={() => {
                      const next = task.tags.filter((_, j) => j !== i);
                      handleUpdate('tags', next);
                    }}
                  >
                    {tag.label} <span className="text-[8px]">-</span>
                  </button>
                ))}
              </div>
            )}
            {/* Available presets to add */}
            <div className="flex flex-wrap gap-1">
              {TAG_PRESETS.filter(p => !task.tags?.some(t => t.label === p.label)).map(tag => (
                <button key={tag.label}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded hover:opacity-80 cursor-pointer"
                  style={{ backgroundColor: `${tag.color}10`, color: `${tag.color}99` }}
                  onClick={() => handleUpdate('tags', [...(task.tags || []), tag])}
                >
                  + {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes input — always shown when expanded */}
          <div className="mt-2" data-editor>
            <input
              type="text"
              placeholder="Add a note..."
              className="w-full bg-surface-container-high border border-outline-variant rounded px-2 py-1 text-xs text-surface-on outline-none focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  handleUpdate('notes', [...(task.notes || []), e.target.value.trim()]);
                  e.target.value = '';
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Calendar — only opens on icon click */}
          {editingField === 'due_date' && (
            <div className="mt-2" data-editor onClick={(e) => e.stopPropagation()}>
              <MiniCalendar
                selected={task.due_date}
                onSelect={(date) => handleUpdate('due_date', date)}
                onClear={() => handleUpdate('due_date', null)}
              />
            </div>
          )}

          {/* Toolbar: just calendar + trash */}
          <div className="flex items-center gap-0.5 mt-2 pt-2 border-t border-outline-variant/50">
            <button onClick={(e) => handleIconClick(e, 'due_date')} title="Due date"
              className={`p-1 rounded transition-colors ${editingField === 'due_date' ? 'text-primary bg-primary/10' : task.due_date ? 'text-primary hover:bg-primary/10' : 'text-outline/40 hover:text-outline hover:bg-surface-container-high'}`}>
              {icons.calendar}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              title="Delete"
              className="p-1 rounded text-outline/40 hover:text-red-400 hover:bg-red-400/10 ml-auto transition-colors"
            >
              {icons.trash}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Inline month calendar
function MiniCalendar({ selected, onSelect, onClear }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => {
    if (selected) return new Date(selected + 'T00:00:00');
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const toISO = (d) => {
    const dt = new Date(year, month, d);
    return dt.toISOString().split('T')[0];
  };

  const todayISO = today.toISOString().split('T')[0];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="bg-surface-container-high border border-outline-variant rounded-md p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-0.5 rounded hover:bg-surface-container-highest text-outline hover:text-surface-on text-xs">
          &lt;
        </button>
        <span className="text-[11px] font-medium text-surface-on">{monthNames[month]} {year}</span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-0.5 rounded hover:bg-surface-container-highest text-outline hover:text-surface-on text-xs">
          &gt;
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="text-[9px] text-outline text-center py-0.5">{d}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0">
        {days.map((d, i) => {
          if (!d) return <span key={i} />;
          const iso = toISO(d);
          const isSelected = iso === selected;
          const isToday = iso === todayISO;
          return (
            <button key={i}
              onClick={() => onSelect(iso)}
              className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center mx-auto transition-colors ${
                isSelected ? 'bg-primary text-primary-on font-medium' :
                isToday ? 'text-primary font-medium hover:bg-primary/10' :
                'text-surface-on hover:bg-surface-container-highest'
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Clear button */}
      {selected && (
        <button onClick={onClear}
          className="mt-1.5 text-[10px] text-outline hover:text-red-400 w-full text-center">
          Clear date
        </button>
      )}
    </div>
  );
}
