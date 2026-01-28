import { useMemo, useCallback, useState, useEffect } from 'react';
import { useSupabaseTable } from './useSupabaseTable';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Hook for managing tasks
 * Table: toditox_tasks
 */
export function useTasks() {
  const {
    data: tasks,
    loading: tasksLoading,
    error,
    create,
    update,
    remove,
    refresh,
    setData: setTasks,
  } = useSupabaseTable('tasks', { orderBy: 'order' });

  // Time entries state
  const [timeEntries, setTimeEntries] = useState([]);
  const [timeLoading, setTimeLoading] = useState(true);

  // Fetch time entries
  const fetchTimeEntries = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    
    try {
      setTimeLoading(true);
      const { data, error: fetchError } = await supabase
        .from('time_entries')
        .select('*')
        .order('date', { ascending: false });
      
      if (fetchError) throw fetchError;
      setTimeEntries(data || []);
    } catch (err) {
      console.error('Error fetching time entries:', err);
    } finally {
      setTimeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeEntries();
  }, [fetchTimeEntries]);

  // Add a task
  const addTask = useCallback(async (task) => {
    // Set default order to end of list
    const maxOrder = tasks.length > 0 
      ? Math.max(...tasks.map(t => t.order || 0)) + 1 
      : 0;
    return create({ ...task, order: task.order ?? maxOrder });
  }, [create, tasks]);

  // Update a task
  const updateTask = useCallback(async (id, updates) => {
    return update(id, updates);
  }, [update]);

  // Delete a task
  const deleteTask = useCallback(async (id) => {
    return remove(id);
  }, [remove]);

  // Reorder tasks (batch update)
  const reorderTasks = useCallback(async (reorderedTasks) => {
    if (!isSupabaseConfigured()) return;

    // Optimistically update local state
    setTasks(reorderedTasks);

    // Update each task's order in the database
    try {
      const updates = reorderedTasks.map((task, index) => 
        supabase
          .from('tasks')
          .update({ order: index })
          .eq('id', task.id)
      );
      await Promise.all(updates);
    } catch (err) {
      console.error('Error reordering tasks:', err);
      refresh(); // Revert on error
    }
  }, [setTasks, refresh]);

  // Log time entry
  const logTime = useCallback(async (entry) => {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: insertError } = await supabase
        .from('time_entries')
        .insert([{ ...entry, user_id: user.id }])
        .select()
        .single();

      if (insertError) throw insertError;

      setTimeEntries(prev => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      console.error('Error logging time:', err);
      return { data: null, error: err };
    }
  }, []);

  // Query helpers
  const getTasksByProject = useCallback((projectId) => 
    tasks?.filter(t => t.project_id === projectId) || [], [tasks]);

  const getTimeByProject = useCallback((projectId) => 
    timeEntries?.filter(t => t.project_id === projectId) || [], [timeEntries]);

  const getTotalHoursByProject = useCallback((projectId) => {
    const entries = getTimeByProject(projectId);
    return entries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0);
  }, [getTimeByProject]);

  const getMyTasks = useCallback(() => 
    tasks?.filter(t => t.is_mine && t.status !== 'done') || [], [tasks]);

  const getTeamTasks = useCallback(() => 
    tasks?.filter(t => !t.is_mine && t.status !== 'done') || [], [tasks]);

  const getAllActiveTasks = useCallback(() => 
    tasks?.filter(t => t.status !== 'done') || [], [tasks]);

  const getCompletedTasks = useCallback(() => 
    tasks?.filter(t => t.status === 'done') || [], [tasks]);

  const getTasksByStatus = useCallback((status) => 
    tasks?.filter(t => t.status === status) || [], [tasks]);

  const getUpcomingTasks = useCallback((days = 7) => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    
    return tasks?.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= now && dueDate <= futureDate;
    }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)) || [];
  }, [tasks]);

  const getOverdueTasks = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return tasks?.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      const dueDate = new Date(t.due_date);
      return dueDate < now;
    }) || [];
  }, [tasks]);

  const getHighPriorityTasks = useCallback(() => 
    tasks?.filter(t => t.priority === 'high' && t.status !== 'done') || [], [tasks]);

  // Get tasks due today
  const getTodayTasks = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return tasks?.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= today && dueDate < tomorrow;
    }) || [];
  }, [tasks]);

  // Computed values
  const activeTasks = useMemo(() => 
    tasks?.filter(t => t.status !== 'done') || [], [tasks]);

  const todoTasks = useMemo(() => 
    tasks?.filter(t => t.status === 'todo') || [], [tasks]);

  const inProgressTasks = useMemo(() => 
    tasks?.filter(t => t.status === 'in_progress') || [], [tasks]);

  const doneTasks = useMemo(() => 
    tasks?.filter(t => t.status === 'done') || [], [tasks]);

  return {
    tasks,
    timeEntries,
    loading: tasksLoading || timeLoading,
    error,
    
    // Actions
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    logTime,
    refresh,
    refreshTimeEntries: fetchTimeEntries,
    
    // Queries
    getTasksByProject,
    getTimeByProject,
    getTotalHoursByProject,
    getMyTasks,
    getTeamTasks,
    getAllActiveTasks,
    getCompletedTasks,
    getTasksByStatus,
    getUpcomingTasks,
    getOverdueTasks,
    getHighPriorityTasks,
    getTodayTasks,
    
    // Computed
    activeTasks,
    todoTasks,
    inProgressTasks,
    doneTasks,
  };
}
