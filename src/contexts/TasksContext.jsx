import { createContext, useContext } from 'react';
import { useTasks as useTasksHook } from '@/hooks/useTasks';

const TasksContext = createContext(null);

export function TasksProvider({ children }) {
  const tasks = useTasksHook();
  return <TasksContext.Provider value={tasks}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
