import { useState } from 'react';
import { parseNotesWithAI, parseNotesWithPatterns } from '@/lib/note-parser';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useCRM } from '@/hooks/useCRM';
import { useMockData } from '@/contexts/MockDataContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { formatDate } from '@/lib/utils';

export function AINotes({ onNavigate }) {
  const [noteText, setNoteText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const [createdItems, setCreatedItems] = useState(new Set());
  const [sessionIgnoredItems, setSessionIgnoredItems] = useState(new Set());
  const [showArchive, setShowArchive] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [taskModifications, setTaskModifications] = useState({}); // Track energy, pomodoro changes

  const { addTask } = useTasks();
  const { projects, addProject, updateProject } = useProjects();
  const { addOpportunity } = useOpportunities();
  const { addContact } = useCRM();
  const { logTime } = useTasks();
  const { notesArchive, addNotesArchive, deleteNotesArchive, addIgnoredItem, ignoredItems } = useMockData();

  const handleParse = async () => {
    if (!noteText.trim()) {
      setError('Please enter some notes to parse');
      return;
    }

    setIsParsing(true);
    setError(null);
    setCreatedItems(new Set());
    setSessionIgnoredItems(new Set());
    setTaskModifications({});

    try {
      const result = await parseNotesWithAI(noteText);
      setParsedData(result);
      
      // Save to archive
      addNotesArchive({
        raw_text: noteText,
        parsed_data: result,
        title: generateArchiveTitle(noteText),
      });
    } catch (err) {
      console.warn('AI parsing failed, trying pattern matching:', err);
      try {
        const result = parseNotesWithPatterns(noteText);
        setParsedData(result);
        setError('AI parsing unavailable. Using basic pattern matching. Some items may not be extracted correctly.');
      } catch (fallbackErr) {
        setError(`Failed to parse notes: ${fallbackErr.message}`);
        setParsedData(null);
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleClear = () => {
    setNoteText('');
    setParsedData(null);
    setError(null);
    setCreatedItems(new Set());
    setSessionIgnoredItems(new Set());
    setTaskModifications({});
  };

  const handleLaterItem = (type, item, index) => {
    const itemKey = `${type}-${index}`;
    setSessionIgnoredItems(prev => new Set([...prev, itemKey]));
    // Get any modifications made to the task
    const mods = taskModifications[`task-${index}`] || {};
    addIgnoredItem({
      type,
      item: { ...item, ...mods },
      index,
      parsed_data: parsedData,
      raw_text: noteText,
    });
  };

  const handleUpdateTaskField = (index, field, value) => {
    setTaskModifications(prev => ({
      ...prev,
      [`task-${index}`]: {
        ...(prev[`task-${index}`] || {}),
        [field]: value,
      },
    }));
  };

  const getTaskWithMods = (task, index) => {
    const mods = taskModifications[`task-${index}`] || {};
    return { ...task, ...mods };
  };

  const generateArchiveTitle = (text) => {
    // Extract first line or first 50 chars as title
    const firstLine = text.split('\n')[0].replace(/[#*\-]/g, '').trim();
    if (firstLine.length > 50) {
      return firstLine.substring(0, 50) + '...';
    }
    return firstLine || 'Parsed Notes';
  };

  const handleLoadArchive = (archive) => {
    setNoteText(archive.raw_text);
    setParsedData(archive.parsed_data);
    setCreatedItems(new Set());
    setSelectedArchive(null);
    setShowArchive(false);
  };

  const handleDeleteArchive = (archiveId) => {
    if (window.confirm('Delete this archived note?')) {
      deleteNotesArchive(archiveId);
    }
  };

  const findMatchingProjects = (projectName) => {
    if (!projectName || !projects) return [];
    const lowerName = projectName.toLowerCase();
    return projects.filter(p => 
      p.name.toLowerCase().includes(lowerName) || 
      lowerName.includes(p.name.toLowerCase())
    );
  };

  const handleCreateTask = async (task, index) => {
    try {
      // Merge original task with any modifications
      const modifiedTask = getTaskWithMods(task, index);
      
      const taskData = {
        title: modifiedTask.title,
        subtitle: modifiedTask.subtitle || null,
        description: modifiedTask.subtitle || '', // Use subtitle as description
        status: modifiedTask.status || 'todo',
        assignee: modifiedTask.assignee || 'Me',
        priority: modifiedTask.priority || '',
        is_mine: modifiedTask.is_mine !== undefined ? modifiedTask.is_mine : true,
        due_date: modifiedTask.due_date || null,
        order: index,
        energy: modifiedTask.energy || '',
        pomodoro_count: modifiedTask.pomodoro_count || 0,
      };

      // If project_name is mentioned, try to find matching project
      if (modifiedTask.project_name) {
        const matches = findMatchingProjects(modifiedTask.project_name);
        if (matches.length === 1) {
          taskData.project_id = matches[0].id;
        } else if (matches.length > 1) {
          // Multiple matches - prompt user
          const selected = window.prompt(
            `Multiple projects match "${modifiedTask.project_name}". Please select:\n${matches.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}\n\nEnter number (or cancel to skip):`
          );
          if (selected && !isNaN(selected)) {
            const idx = parseInt(selected) - 1;
            if (idx >= 0 && idx < matches.length) {
              taskData.project_id = matches[idx].id;
            }
          }
        }
      }

      await addTask(taskData);
      setCreatedItems(prev => new Set([...prev, `task-${index}`]));
    } catch (err) {
      console.error('Failed to create task:', err);
      alert(`Failed to create task: ${err.message}`);
    }
  };

  const handleCreateProject = async (project, index) => {
    try {
      if (!project || !project.name) {
        throw new Error('Project name is required');
      }
      
      const projectData = {
        name: project.name.trim(),
        client: project.client || '',
        status: project.status || 'in_progress',
        phase: project.phase || '',
        start_date: project.start_date || new Date().toISOString().split('T')[0],
        deadline: project.deadline || null,
        next_milestone: project.next_milestone || '',
        notes: project.notes || '',
        milestones: project.milestones || [],
      };
      
      console.log('Creating project:', projectData);
      const createdProject = await addProject(projectData);
      console.log('Project created successfully:', createdProject);
      setCreatedItems(prev => new Set([...prev, `project-${index}`]));
    } catch (err) {
      console.error('Failed to create project:', err);
      console.error('Project data:', project);
      alert(`Failed to create project: ${err.message || 'Unknown error'}`);
    }
  };

  const handleUpdateProject = async (update, index) => {
    try {
      const matches = findMatchingProjects(update.project_name);
      if (matches.length === 0) {
        alert(`No project found matching "${update.project_name}"`);
        return;
      }
      if (matches.length > 1) {
        const selected = window.prompt(
          `Multiple projects match "${update.project_name}". Please select:\n${matches.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}\n\nEnter number (or cancel to skip):`
        );
        if (selected && !isNaN(selected)) {
          const idx = parseInt(selected) - 1;
          if (idx >= 0 && idx < matches.length) {
            const updates = {};
            if (update.status) updates.status = update.status;
            if (update.deadline) updates.deadline = update.deadline;
            if (update.next_milestone) updates.next_milestone = update.next_milestone;
            if (update.notes) updates.notes = update.notes;
            await updateProject(matches[idx].id, updates);
            setCreatedItems(prev => new Set([...prev, `project-update-${index}`]));
          }
        }
      } else {
        const updates = {};
        if (update.status) updates.status = update.status;
        if (update.deadline) updates.deadline = update.deadline;
        if (update.next_milestone) updates.next_milestone = update.next_milestone;
        if (update.notes) updates.notes = update.notes;
        await updateProject(matches[0].id, updates);
        setCreatedItems(prev => new Set([...prev, `project-update-${index}`]));
      }
    } catch (err) {
      console.error('Failed to update project:', err);
      alert(`Failed to update project: ${err.message}`);
    }
  };

  const handleCreateOpportunity = async (opp, index) => {
    try {
      const oppData = {
        name: opp.name,
        contact: opp.contact || '',
        value: opp.value || 0,
        stage: opp.stage || 'lead',
        next_action: opp.next_action || '',
        due_date: opp.due_date || null,
        notes: opp.notes || '',
      };
      await addOpportunity(oppData);
      setCreatedItems(prev => new Set([...prev, `opportunity-${index}`]));
    } catch (err) {
      console.error('Failed to create opportunity:', err);
      alert(`Failed to create opportunity: ${err.message}`);
    }
  };

  const handleCreateContact = async (contact, index) => {
    try {
      const contactData = {
        name: contact.name,
        company: contact.company || '',
        email: contact.email || '',
        phone: contact.phone || '',
        notes: contact.notes || '',
      };
      await addContact(contactData);
      setCreatedItems(prev => new Set([...prev, `contact-${index}`]));
    } catch (err) {
      console.error('Failed to create contact:', err);
      alert(`Failed to create contact: ${err.message}`);
    }
  };

  const handleCreateTimeEntry = async (entry, index) => {
    try {
      let projectId = null;
      if (entry.project_name) {
        const matches = findMatchingProjects(entry.project_name);
        if (matches.length === 1) {
          projectId = matches[0].id;
        } else if (matches.length > 1) {
          const selected = window.prompt(
            `Multiple projects match "${entry.project_name}". Please select:\n${matches.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}\n\nEnter number (or cancel to skip):`
          );
          if (selected && !isNaN(selected)) {
            const idx = parseInt(selected) - 1;
            if (idx >= 0 && idx < matches.length) {
              projectId = matches[idx].id;
            }
          }
        }
      }

      if (!projectId) {
        alert('Please specify a project for this time entry');
        return;
      }

      await logTime({
        project_id: projectId,
        hours: entry.hours || 0,
        notes: entry.notes || '',
        date: entry.date || new Date().toISOString().split('T')[0],
      });
      setCreatedItems(prev => new Set([...prev, `time-entry-${index}`]));
    } catch (err) {
      console.error('Failed to create time entry:', err);
      alert(`Failed to create time entry: ${err.message}`);
    }
  };

  const handleCreateAll = async () => {
    if (!parsedData) return;

    // Create all items in sequence
    for (let i = 0; i < parsedData.tasks.length; i++) {
      if (!createdItems.has(`task-${i}`)) {
        await handleCreateTask(parsedData.tasks[i], i);
      }
    }
    for (let i = 0; i < parsedData.projects.length; i++) {
      if (!createdItems.has(`project-${i}`)) {
        await handleCreateProject(parsedData.projects[i], i);
      }
    }
    for (let i = 0; i < parsedData.project_updates.length; i++) {
      if (!createdItems.has(`project-update-${i}`)) {
        await handleUpdateProject(parsedData.project_updates[i], i);
      }
    }
    for (let i = 0; i < parsedData.opportunities.length; i++) {
      if (!createdItems.has(`opportunity-${i}`)) {
        await handleCreateOpportunity(parsedData.opportunities[i], i);
      }
    }
    for (let i = 0; i < parsedData.contacts.length; i++) {
      if (!createdItems.has(`contact-${i}`)) {
        await handleCreateContact(parsedData.contacts[i], i);
      }
    }
    for (let i = 0; i < parsedData.time_entries.length; i++) {
      if (!createdItems.has(`time-entry-${i}`)) {
        await handleCreateTimeEntry(parsedData.time_entries[i], i);
      }
    }
  };

  const totalItems = parsedData ? 
    parsedData.tasks.length + 
    parsedData.projects.length + 
    parsedData.project_updates.length + 
    parsedData.opportunities.length + 
    parsedData.contacts.length + 
    parsedData.time_entries.length : 0;

  const createdCount = createdItems.size;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">AI Notes</h2>
          <p className="text-gray-500 mt-1">Paste AI-generated notes and automatically extract tasks, projects, and more.</p>
        </div>
        <div className="flex gap-3">
          {ignoredItems?.length > 0 && (
            <Button 
              variant="secondary" 
              onClick={() => onNavigate?.('ignored-tasks')}
              className="relative"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Ignored ({ignoredItems.length})
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowArchive(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            History ({notesArchive?.length || 0})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <Card className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste your notes here
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Paste notes from AI assistants, meeting transcripts, or any text containing tasks, projects, deadlines, etc..."
              className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none font-mono text-sm"
            />
            <div className="flex gap-3 mt-4">
              <Button 
                onClick={handleParse} 
                disabled={isParsing || !noteText.trim()}
                className="flex-1"
              >
                {isParsing ? 'Parsing...' : 'Parse Notes'}
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleClear}
                disabled={isParsing}
              >
                Clear
              </Button>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                {error}
              </div>
            )}
          </Card>
        </div>

        {/* Preview Section */}
        <div className="space-y-4">
          {parsedData && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">
                  Extracted Items ({createdCount}/{totalItems} created)
                </h3>
                {createdCount < totalItems && (
                  <Button onClick={handleCreateAll} className="text-sm">
                    Create All
                  </Button>
                )}
              </div>

              {/* Tasks */}
              {parsedData.tasks.length > 0 && (
                <ExtractedSection title="Tasks" count={parsedData.tasks.length}>
                  {parsedData.tasks.map((task, i) => {
                    if (sessionIgnoredItems.has(`task-${i}`)) {
                      return (
                        <Card key={`task-${i}`} className="p-3 bg-gray-50 border-gray-200 opacity-60">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 line-through">{task.title}</span>
                            <span className="text-xs text-gray-400">Later</span>
                          </div>
                        </Card>
                      );
                    }
                    const modifiedTask = getTaskWithMods(task, i);
                    const isCreated = createdItems.has(`task-${i}`);
                    return (
                      <ExtractedTaskItem
                        key={`task-${i}`}
                        task={modifiedTask}
                        index={i}
                        isCreated={isCreated}
                        onCreate={() => handleCreateTask(task, i)}
                        onLater={() => handleLaterItem('task', task, i)}
                        onUpdateField={(field, value) => handleUpdateTaskField(i, field, value)}
                      />
                    );
                  })}
                </ExtractedSection>
              )}

              {/* Projects */}
              {parsedData.projects.length > 0 && (
                <ExtractedSection title="New Projects" count={parsedData.projects.length}>
                  {parsedData.projects.map((project, i) => {
                    if (sessionIgnoredItems.has(`project-${i}`)) return null;
                    return (
                    <ExtractedItem
                      key={`project-${i}`}
                      isCreated={createdItems.has(`project-${i}`)}
                      onCreate={() => handleCreateProject(project, i)}
                      onLater={() => handleLaterItem('project', project, i)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-gray-900 flex-1">{project.name}</span>
                          {project.phase && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              {project.phase}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {project.client && `Client: ${project.client} • `}
                          Status: {project.status}
                          {project.deadline && ` • Deadline: ${formatDate(project.deadline)}`}
                        </div>
                        {project.milestones && project.milestones.length > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            {project.milestones.length} milestone{project.milestones.length > 1 ? 's' : ''} extracted
                          </div>
                        )}
                      </div>
                    </ExtractedItem>
                    );
                  })}
                </ExtractedSection>
              )}

              {/* Project Updates */}
              {parsedData.project_updates.length > 0 && (
                <ExtractedSection title="Project Updates" count={parsedData.project_updates.length}>
                  {parsedData.project_updates.map((update, i) => {
                    if (sessionIgnoredItems.has(`project-update-${i}`)) return null;
                    return (
                    <ExtractedItem
                      key={`project-update-${i}`}
                      isCreated={createdItems.has(`project-update-${i}`)}
                      onCreate={() => handleUpdateProject(update, i)}
                      onLater={() => handleLaterItem('project-update', update, i)}
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{update.project_name}</div>
                        <div className="text-sm text-gray-500">
                          {update.status && `Status: ${update.status} • `}
                          {update.next_milestone && `Milestone: ${update.next_milestone} • `}
                          {update.deadline && `Deadline: ${formatDate(update.deadline)}`}
                        </div>
                      </div>
                    </ExtractedItem>
                    );
                  })}
                </ExtractedSection>
              )}

              {/* Opportunities */}
              {parsedData.opportunities.length > 0 && (
                <ExtractedSection title="Opportunities" count={parsedData.opportunities.length}>
                  {parsedData.opportunities.map((opp, i) => {
                    if (sessionIgnoredItems.has(`opportunity-${i}`)) return null;
                    return (
                    <ExtractedItem
                      key={`opportunity-${i}`}
                      isCreated={createdItems.has(`opportunity-${i}`)}
                      onCreate={() => handleCreateOpportunity(opp, i)}
                      onLater={() => handleLaterItem('opportunity', opp, i)}
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{opp.name}</div>
                        <div className="text-sm text-gray-500">
                          {opp.contact && `Contact: ${opp.contact} • `}
                          {opp.value > 0 && `Value: $${opp.value.toLocaleString()} • `}
                          Stage: {opp.stage}
                        </div>
                      </div>
                    </ExtractedItem>
                    );
                  })}
                </ExtractedSection>
              )}

              {/* Contacts */}
              {parsedData.contacts.length > 0 && (
                <ExtractedSection title="Contacts" count={parsedData.contacts.length}>
                  {parsedData.contacts.map((contact, i) => {
                    if (sessionIgnoredItems.has(`contact-${i}`)) return null;
                    return (
                    <ExtractedItem
                      key={`contact-${i}`}
                      isCreated={createdItems.has(`contact-${i}`)}
                      onCreate={() => handleCreateContact(contact, i)}
                      onLater={() => handleLaterItem('contact', contact, i)}
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{contact.name}</div>
                        <div className="text-sm text-gray-500">
                          {contact.company && `${contact.company} • `}
                          {contact.email && `${contact.email} • `}
                          {contact.phone}
                        </div>
                      </div>
                    </ExtractedItem>
                    );
                  })}
                </ExtractedSection>
              )}

              {/* Time Entries */}
              {parsedData.time_entries.length > 0 && (
                <ExtractedSection title="Time Entries" count={parsedData.time_entries.length}>
                  {parsedData.time_entries.map((entry, i) => {
                    if (sessionIgnoredItems.has(`time-entry-${i}`)) return null;
                    return (
                    <ExtractedItem
                      key={`time-entry-${i}`}
                      isCreated={createdItems.has(`time-entry-${i}`)}
                      onCreate={() => handleCreateTimeEntry(entry, i)}
                      onLater={() => handleLaterItem('time-entry', entry, i)}
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{entry.hours}h - {entry.notes}</div>
                        <div className="text-sm text-gray-500">
                          {entry.project_name && `Project: ${entry.project_name} • `}
                          Date: {formatDate(entry.date || new Date().toISOString().split('T')[0])}
                        </div>
                      </div>
                    </ExtractedItem>
                    );
                  })}
                </ExtractedSection>
              )}

              {totalItems === 0 && (
                <div className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  No items extracted from notes.
                </div>
              )}
            </div>
          )}

          {!parsedData && !isParsing && (
            <Card className="p-12 text-center text-gray-400">
              <div className="text-4xl mb-4">📝</div>
              <p>Parse notes to see extracted items here</p>
            </Card>
          )}
        </div>
      </div>

      {/* Archive Sheet */}
      <Sheet
        isOpen={showArchive}
        onClose={() => { setShowArchive(false); setSelectedArchive(null); }}
        title="Notes History"
      >
        {selectedArchive ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedArchive(null)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to list
            </button>
            
            <div>
              <h3 className="font-bold text-gray-900">{selectedArchive.title}</h3>
              <p className="text-xs text-gray-500 mt-1">
                Parsed on {formatDate(selectedArchive.created_at)}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                {selectedArchive.raw_text}
              </pre>
            </div>

            <div className="text-sm text-gray-600">
              <strong>Extracted:</strong>{' '}
              {selectedArchive.parsed_data?.tasks?.length || 0} tasks,{' '}
              {selectedArchive.parsed_data?.projects?.length || 0} projects,{' '}
              {selectedArchive.parsed_data?.opportunities?.length || 0} opportunities,{' '}
              {selectedArchive.parsed_data?.contacts?.length || 0} contacts
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => handleDeleteArchive(selectedArchive.id)}>
                Delete
              </Button>
              <Button onClick={() => handleLoadArchive(selectedArchive)} className="flex-1">
                Load into Editor
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {notesArchive && notesArchive.length > 0 ? (
              notesArchive.map((archive) => (
                <div
                  key={archive.id}
                  onClick={() => setSelectedArchive(archive)}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{archive.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(archive.created_at)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {archive.parsed_data?.tasks?.length || 0} tasks,{' '}
                        {archive.parsed_data?.projects?.length || 0} projects
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400">
                <div className="text-4xl mb-4">📦</div>
                <p>No archived notes yet.</p>
                <p className="text-sm mt-2">Parse some notes to see them here.</p>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function ExtractedSection({ title, count, children }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
        {title} ({count})
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ExtractedItem({ children, isCreated, onCreate, onLater }) {
  return (
    <Card className={`p-4 ${isCreated ? 'bg-green-50 border-green-200' : ''}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">{children}</div>
        <div className="flex items-center gap-2 shrink-0">
          {!isCreated ? (
            <>
              <Button 
                onClick={onLater} 
                variant="secondary"
                className="text-xs px-3 py-1.5"
                title="Save for later"
              >
                Later
              </Button>
              <Button onClick={onCreate} className="text-xs px-3 py-1.5">
                Create
              </Button>
            </>
          ) : (
            <span className="text-xs text-green-700 font-medium">✓ Created</span>
          )}
        </div>
      </div>
    </Card>
  );
}

// Energy types with labels
const ENERGY_TYPES = [
  { id: '', label: 'Uncategorized' },
  { id: 'deep_focus', label: '🧠 Deep Focus', desc: 'Design, coding, building, developing, creating complex work' },
  { id: 'communication', label: '💬 Communication', desc: 'Emails, calls, sending documents, coordinating with people' },
  { id: 'planning', label: '📐 Planning', desc: 'Strategy, brainstorming, organizing, mapping out work' },
  { id: 'admin', label: '📋 Admin', desc: 'Administrative tasks, tracking, documentation, invoicing' },
];

const PRIORITY_OPTIONS = [
  { id: '', label: 'No Priority', color: 'bg-gray-100 border-gray-300 text-gray-600' },
  { id: 'low', label: '🟢 Low', color: 'bg-green-100 border-green-300 text-green-700' },
  { id: 'medium', label: '🟡 Medium', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { id: 'high', label: '🔴 High', color: 'bg-red-100 border-red-300 text-red-700' },
];

function ExtractedTaskItem({ task, index, isCreated, onCreate, onLater, onUpdateField }) {
  const [showDetails, setShowDetails] = useState(false);
  const currentEnergy = task.energy || '';
  const currentPriority = task.priority || '';
  const pomodoroCount = task.pomodoro_count || 0; // Start with 0

  const handlePomoIncrement = () => {
    // Cycle: 0→1→2→3→4(grapes)→0→1→2→3→4...
    const newCount = pomodoroCount >= 4 ? 0 : pomodoroCount + 1;
    onUpdateField('pomodoro_count', newCount);
  };

  return (
    <Card className={`p-4 ${isCreated ? 'bg-green-50 border-green-200' : ''}`}>
      <div className="space-y-3">
        {/* Title row */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900">{task.title}</div>
            {task.subtitle && (
              <div className="text-xs text-gray-500 mt-0.5">{task.subtitle}</div>
            )}
          </div>
        </div>

        {/* Controls row */}
        {!isCreated && (
          <div className="space-y-2">
            {/* Energy tags */}
            <div className="flex flex-wrap gap-1.5">
              {ENERGY_TYPES.map(energy => (
                <button
                  key={energy.id}
                  onClick={() => onUpdateField('energy', energy.id === currentEnergy ? '' : energy.id)}
                  className={`text-xs px-2 py-1 rounded-md border transition-all ${
                    currentEnergy === energy.id
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : energy.id === '' && currentEnergy === ''
                        ? 'bg-gray-100 border-gray-300 text-gray-600'
                        : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'
                  }`}
                  title={energy.desc || ''}
                >
                  {energy.label}
                </button>
              ))}
            </div>

            {/* Priority tags */}
            <div className="flex flex-wrap gap-1.5">
              {PRIORITY_OPTIONS.map(priority => (
                <button
                  key={priority.id}
                  onClick={() => onUpdateField('priority', priority.id === currentPriority ? '' : priority.id)}
                  className={`text-xs px-2 py-1 rounded-md border transition-all ${
                    currentPriority === priority.id
                      ? priority.color
                      : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {priority.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Pomodoro counter - simple + button */}
              <button
                onClick={handlePomoIncrement}
                className={`flex items-center gap-1 px-2 h-7 rounded border transition-all text-sm ${
                  pomodoroCount > 0 
                    ? 'border-red-200 bg-red-50 hover:bg-red-100' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
                title="Click to add pomodoros (cycles 0→1→2→3→🍇→0...)"
              >
                {pomodoroCount === 0 ? (
                  <span className="text-gray-300">🍅</span>
                ) : pomodoroCount >= 4 ? (
                  <span>🍇</span>
                ) : (
                  <span>{'🍅'.repeat(pomodoroCount)}</span>
                )}
                <span className="text-gray-400 text-xs">+</span>
              </button>
              
              {/* Add details button */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                {showDetails ? 'Hide details' : '+ Add details'}
              </button>
            </div>
          </div>
        )}
        
        {/* Details input */}
        {showDetails && !isCreated && (
          <textarea
            value={task.subtitle || ''}
            onChange={(e) => onUpdateField('subtitle', e.target.value)}
            placeholder="Add notes or details..."
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none"
            rows={2}
          />
        )}

        {/* Meta info */}
        {(task.project_name || task.due_date) && (
          <div className="text-xs text-gray-500 flex flex-wrap gap-x-2">
            {task.project_name && <span>📁 {task.project_name}</span>}
            {task.due_date && <span>📅 {task.due_date}</span>}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          {!isCreated ? (
            <>
              <Button 
                onClick={onLater} 
                variant="secondary"
                className="text-xs px-3 py-1.5"
              >
                Later
              </Button>
              <Button onClick={onCreate} className="text-xs px-3 py-1.5">
                Create
              </Button>
            </>
          ) : (
            <span className="text-xs text-green-700 font-medium">✓ Created</span>
          )}
        </div>
      </div>
    </Card>
  );
}

