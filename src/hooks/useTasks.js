import { useMockData } from '@/contexts/MockDataContext';

export function useTasks() {
  const { 
    tasks, 
    timeEntries, 
    addTask, 
    updateTask,
    deleteTask,
    reorderTasks,
    logTime 
  } = useMockData();
  const loading = false;

  const getTasksByProject = (projectId) => 
    tasks?.filter(t => t.project_id === projectId) || [];

  const getTimeByProject = (projectId) => 
    timeEntries?.filter(t => t.project_id === projectId) || [];

  const getTotalHoursByProject = (projectId) => {
    const entries = getTimeByProject(projectId);
    return entries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0);
  };

  // New filtering helpers
  const getMyTasks = () => 
    tasks?.filter(t => t.is_mine && t.status !== 'done') || [];

  const getTeamTasks = () => 
    tasks?.filter(t => !t.is_mine && t.status !== 'done') || [];

  const getAllActiveTasks = () => 
    tasks?.filter(t => t.status !== 'done') || [];

  const getCompletedTasks = () => 
    tasks?.filter(t => t.status === 'done') || [];

  const getTasksByStatus = (status) => 
    tasks?.filter(t => t.status === status) || [];

  const getUpcomingTasks = (days = 7) => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    
    return tasks?.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= now && dueDate <= futureDate;
    }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)) || [];
  };

  const getOverdueTasks = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return tasks?.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      const dueDate = new Date(t.due_date);
      return dueDate < now;
    }) || [];
  };

  const getHighPriorityTasks = () => 
    tasks?.filter(t => t.priority === 'high' && t.status !== 'done') || [];

  return {
    tasks,
    timeEntries,
    loading,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    logTime,
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
  };
}
