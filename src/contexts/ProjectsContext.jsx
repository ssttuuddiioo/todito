import { createContext, useContext } from 'react';
import { useProjects as useProjectsHook } from '@/hooks/useProjects';

const ProjectsContext = createContext(null);

export function ProjectsProvider({ children }) {
  const projects = useProjectsHook();
  return <ProjectsContext.Provider value={projects}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used within ProjectsProvider');
  return ctx;
}
