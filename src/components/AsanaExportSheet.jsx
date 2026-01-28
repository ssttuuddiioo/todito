import { useState, useEffect } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAsana } from '@/hooks/useAsana';
import { PRIORITY_DISPLAY, ENERGY_DISPLAY } from '@/lib/asana';

/**
 * Asana Export Sheet
 * Shared component for exporting tasks to Asana from AI Notes or Tasks view
 */
export function AsanaExportSheet({ isOpen, onClose, tasks, onExportComplete }) {
  const {
    isConnected,
    isLoading,
    connection,
    error,
    isConfigured,
    workspaces,
    projects,
    connectAsana,
    disconnectAsana,
    fetchWorkspaces,
    fetchProjects,
    exportTasks,
    clearError,
  } = useAsana();

  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Load workspaces when sheet opens and user is connected
  useEffect(() => {
    if (isOpen && isConnected && workspaces.length === 0) {
      loadWorkspaces();
    }
  }, [isOpen, isConnected]);

  // Set default workspace if available
  useEffect(() => {
    if (connection?.default_workspace_id && workspaces.length > 0) {
      const exists = workspaces.find(w => w.gid === connection.default_workspace_id);
      if (exists) {
        setSelectedWorkspace(connection.default_workspace_id);
      }
    }
  }, [connection, workspaces]);

  // Load projects when workspace changes
  useEffect(() => {
    if (selectedWorkspace) {
      loadProjects(selectedWorkspace);
    } else {
      setSelectedProject('');
    }
  }, [selectedWorkspace]);

  // Set default project if available
  useEffect(() => {
    if (connection?.default_project_id && projects.length > 0) {
      const exists = projects.find(p => p.gid === connection.default_project_id);
      if (exists) {
        setSelectedProject(connection.default_project_id);
      }
    }
  }, [connection, projects]);

  const loadWorkspaces = async () => {
    setLoadingWorkspaces(true);
    await fetchWorkspaces();
    setLoadingWorkspaces(false);
  };

  const loadProjects = async (workspaceId) => {
    setLoadingProjects(true);
    await fetchProjects(workspaceId);
    setLoadingProjects(false);
  };

  const handleExport = async () => {
    if (!selectedWorkspace || !selectedProject || tasks.length === 0) return;

    setIsExporting(true);
    setExportResult(null);
    clearError();

    try {
      const result = await exportTasks(tasks, selectedProject, selectedWorkspace, saveAsDefault);
      setExportResult(result);
      
      if (result.created > 0 && result.failed === 0) {
        // All successful - notify parent after brief delay
        setTimeout(() => {
          onExportComplete?.(result);
        }, 1500);
      }
    } catch (err) {
      setExportResult({ error: err.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setExportResult(null);
    clearError();
    onClose();
  };

  // Not configured state
  if (!isConfigured) {
    return (
      <Sheet isOpen={isOpen} onClose={handleClose} title="Export to Asana">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-5xl mb-4">⚙️</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Asana Not Configured</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            To enable Asana export, add your Asana OAuth credentials to the environment variables.
          </p>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 font-mono text-left">
            <div>VITE_ASANA_CLIENT_ID=...</div>
            <div>VITE_ASANA_REDIRECT_URI=...</div>
          </div>
        </div>
      </Sheet>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Sheet isOpen={isOpen} onClose={handleClose} title="Export to Asana">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Sheet>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <Sheet isOpen={isOpen} onClose={handleClose} title="Export to Asana">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Connect Your Asana Account</h3>
          <p className="text-gray-500 text-sm max-w-xs mb-6">
            Link your Asana account to export tasks directly to your projects.
          </p>
          <Button onClick={connectAsana}>
            Connect Asana
          </Button>
          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}
        </div>
      </Sheet>
    );
  }

  // Export result state
  if (exportResult) {
    const hasErrors = exportResult.error || exportResult.failed > 0;
    
    return (
      <Sheet isOpen={isOpen} onClose={handleClose} title="Export to Asana">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            hasErrors ? 'bg-red-100' : 'bg-green-100'
          }`}>
            {hasErrors ? (
              <span className="text-3xl">⚠️</span>
            ) : (
              <span className="text-3xl">✅</span>
            )}
          </div>
          
          {exportResult.error ? (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Export Failed</h3>
              <p className="text-red-600 text-sm">{exportResult.error}</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {exportResult.created} Task{exportResult.created !== 1 ? 's' : ''} Exported
              </h3>
              {exportResult.failed > 0 && (
                <p className="text-amber-600 text-sm mb-4">
                  {exportResult.failed} task{exportResult.failed !== 1 ? 's' : ''} failed to export
                </p>
              )}
              <p className="text-gray-500 text-sm">
                Tasks have been added to your Asana project.
              </p>
            </>
          )}

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={() => setExportResult(null)}>
              Export More
            </Button>
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      </Sheet>
    );
  }

  // Main export UI
  return (
    <Sheet isOpen={isOpen} onClose={handleClose} title="Export to Asana">
      <div className="space-y-6">
        {/* Connection info */}
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-rose-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {connection?.asana_user_name || 'Connected to Asana'}
              </p>
              {connection?.asana_user_email && (
                <p className="text-xs text-gray-500">{connection.asana_user_email}</p>
              )}
            </div>
          </div>
          <button
            onClick={disconnectAsana}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            Disconnect
          </button>
        </div>

        {/* Workspace selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workspace
          </label>
          <select
            value={selectedWorkspace}
            onChange={(e) => setSelectedWorkspace(e.target.value)}
            disabled={loadingWorkspaces}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">
              {loadingWorkspaces ? 'Loading workspaces...' : 'Select a workspace'}
            </option>
            {workspaces.map(workspace => (
              <option key={workspace.gid} value={workspace.gid}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>

        {/* Project selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            disabled={!selectedWorkspace || loadingProjects}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">
              {loadingProjects ? 'Loading projects...' : 
               !selectedWorkspace ? 'Select a workspace first' : 
               'Select a project'}
            </option>
            {projects.map(project => (
              <option key={project.gid} value={project.gid}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Save as default checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="save-default"
            checked={saveAsDefault}
            onChange={(e) => setSaveAsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="save-default" className="text-sm text-gray-700">
            Remember this project as default
          </label>
        </div>

        {/* Tasks preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tasks to Export ({tasks.length})
          </label>
          <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
            {tasks.map((task, index) => (
              <TaskPreviewItem key={task.id || index} task={task} />
            ))}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!selectedWorkspace || !selectedProject || isExporting || tasks.length === 0}
            className="flex-1"
          >
            {isExporting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Exporting...
              </span>
            ) : (
              `Export ${tasks.length} Task${tasks.length !== 1 ? 's' : ''} to Asana`
            )}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

/**
 * Task preview item for the export list
 */
function TaskPreviewItem({ task }) {
  const priorityInfo = task.priority ? PRIORITY_DISPLAY[task.priority] : null;
  const energyInfo = task.energy ? ENERGY_DISPLAY[task.energy] : null;

  return (
    <Card className="p-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
          {task.subtitle && (
            <p className="text-xs text-gray-500 truncate">{task.subtitle}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {priorityInfo && (
              <span className={`text-xs ${priorityInfo.color}`}>
                {priorityInfo.label}
              </span>
            )}
            {energyInfo && (
              <span className={`text-xs ${energyInfo.color}`}>
                {energyInfo.label}
              </span>
            )}
            {task.due_date && (
              <span className="text-xs text-gray-400">
                📅 {task.due_date}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}


