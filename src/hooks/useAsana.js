import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { buildAsanaOAuthUrl, getAsanaApiBaseUrl, isAsanaConfigured, mapTasksForAsanaExport } from '@/lib/asana';

// Fallback user ID for development/mock mode (must be valid UUID format)
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Hook for managing Asana connection and API interactions
 */
export function useAsana() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connection, setConnection] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  // Check URL params for OAuth callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const asanaConnected = params.get('asana_connected');
    const asanaError = params.get('asana_error');

    if (asanaConnected === 'true') {
      // Clear URL params and refresh connection
      window.history.replaceState({}, '', window.location.pathname);
      checkConnection();
    } else if (asanaError) {
      setError(`Asana connection failed: ${asanaError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  /**
   * Check if user has an active Asana connection
   */
  const checkConnection = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) {
      setIsLoading(false);
      return;
    }

    try {
      let userId = MOCK_USER_ID;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }

      const { data, error: fetchError } = await supabase
        .from('asana_connections')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is expected for new users
        console.error('Error checking Asana connection:', fetchError);
      }

      if (data) {
        setConnection(data);
        setIsConnected(true);
      } else {
        setConnection(null);
        setIsConnected(false);
      }
    } catch (err) {
      console.error('Error checking Asana connection:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initiate OAuth flow to connect Asana
   */
  const connectAsana = useCallback(async () => {
    if (!isAsanaConfigured()) {
      setError('Asana integration not configured');
      return;
    }

    try {
      let userId = MOCK_USER_ID;
      
      // Try to get real user ID from Supabase if configured
      if (isSupabaseConfigured() && supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
        }
      }

      const authUrl = buildAsanaOAuthUrl(userId);
      window.location.href = authUrl;
    } catch (err) {
      setError(`Failed to initiate Asana connection: ${err.message}`);
    }
  }, []);

  /**
   * Disconnect Asana (remove tokens)
   */
  const disconnectAsana = useCallback(async () => {
    if (!connection) return;

    try {
      const { error: deleteError } = await supabase
        .from('asana_connections')
        .delete()
        .eq('id', connection.id);

      if (deleteError) throw deleteError;

      setConnection(null);
      setIsConnected(false);
      setWorkspaces([]);
      setProjects([]);
    } catch (err) {
      setError(`Failed to disconnect Asana: ${err.message}`);
    }
  }, [connection]);

  /**
   * Get auth header for API calls
   */
  const getAuthHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? `Bearer ${session.access_token}` : null;
  }, []);

  /**
   * Fetch user's Asana workspaces
   */
  const fetchWorkspaces = useCallback(async () => {
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error('Not authenticated');

      const baseUrl = getAsanaApiBaseUrl();
      const response = await fetch(`${baseUrl}/workspaces`, {
        headers: {
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'NOT_CONNECTED') {
          setIsConnected(false);
          return [];
        }
        throw new Error(errorData.error || 'Failed to fetch workspaces');
      }

      const data = await response.json();
      setWorkspaces(data.workspaces);
      return data;
    } catch (err) {
      setError(`Failed to fetch workspaces: ${err.message}`);
      return [];
    }
  }, [getAuthHeader]);

  /**
   * Fetch projects for a workspace
   */
  const fetchProjects = useCallback(async (workspaceId) => {
    if (!workspaceId) {
      setProjects([]);
      return [];
    }

    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error('Not authenticated');

      const baseUrl = getAsanaApiBaseUrl();
      const response = await fetch(`${baseUrl}/projects?workspace_id=${workspaceId}`, {
        headers: {
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data.projects);
      return data;
    } catch (err) {
      setError(`Failed to fetch projects: ${err.message}`);
      return [];
    }
  }, [getAuthHeader]);

  /**
   * Export tasks to Asana
   * @param {Array} tasks - Array of Todito tasks to export
   * @param {string} projectId - Asana project GID
   * @param {string} workspaceId - Asana workspace GID
   * @param {boolean} saveDefaults - Whether to save as default project
   */
  const exportTasks = useCallback(async (tasks, projectId, workspaceId, saveDefaults = false) => {
    if (!tasks || tasks.length === 0) {
      throw new Error('No tasks to export');
    }

    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error('Not authenticated');

      const mappedTasks = mapTasksForAsanaExport(tasks);
      const baseUrl = getAsanaApiBaseUrl();

      const response = await fetch(`${baseUrl}/create-tasks`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: mappedTasks,
          project_id: projectId,
          workspace_id: workspaceId,
          save_defaults: saveDefaults,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export tasks');
      }

      const result = await response.json();
      
      // Update connection with new defaults if saved
      if (saveDefaults) {
        setConnection(prev => ({
          ...prev,
          default_workspace_id: workspaceId,
          default_project_id: projectId,
        }));
      }

      return result;
    } catch (err) {
      throw new Error(`Export failed: ${err.message}`);
    }
  }, [getAuthHeader]);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Connection state
    isConnected,
    isLoading,
    connection,
    error,
    isConfigured: isAsanaConfigured(),

    // Data
    workspaces,
    projects,

    // Actions
    connectAsana,
    disconnectAsana,
    fetchWorkspaces,
    fetchProjects,
    exportTasks,
    checkConnection,
    clearError,
  };
}

