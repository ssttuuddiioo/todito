import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Hook for managing projects
 * Table: toditox_projects
 */
export function useProjects() {
  const {
    data: projects,
    loading,
    error,
    create,
    update,
    remove,
    refresh,
  } = useSupabaseTable('toditox_projects');

  // Add a project
  const addProject = useCallback(async (project) => {
    return create(project);
  }, [create]);

  // Update a project
  const updateProject = useCallback(async (id, updates) => {
    return update(id, updates);
  }, [update]);

  // Delete a project
  const deleteProject = useCallback(async (id) => {
    return remove(id);
  }, [remove]);

  // Get active projects (not complete)
  const getActiveProjects = useCallback(() => {
    return projects?.filter((proj) => proj.status !== 'complete') || [];
  }, [projects]);

  // Get in-progress projects only
  const getInProgressProjects = useCallback(() => {
    return projects?.filter((proj) => proj.status === 'in_progress') || [];
  }, [projects]);

  // Get project by ID
  const getProjectById = useCallback((id) => {
    return projects?.find((proj) => proj.id === id);
  }, [projects]);

  // Get total project value (budget)
  const getTotalProjectValue = useCallback(() => {
    return projects
      ?.filter((proj) => proj.status !== 'complete')
      .reduce((sum, proj) => sum + (parseFloat(proj.budget) || 0), 0) || 0;
  }, [projects]);

  // Get upcoming milestones
  const getUpcomingMilestones = useCallback((days = 7) => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    
    const milestones = [];
    projects?.forEach(project => {
      if (project.milestones && Array.isArray(project.milestones)) {
        project.milestones.forEach(milestone => {
          if (!milestone.completed) {
            const milestoneDate = new Date(milestone.date);
            if (milestoneDate >= now && milestoneDate <= futureDate) {
              milestones.push({
                ...milestone,
                project_id: project.id,
                project_name: project.name,
                project_client: project.client_name || project.client,
              });
            }
          }
        });
      }
    });
    
    return milestones.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [projects]);

  // Get projects with deadlines
  const getProjectsWithDeadlines = useCallback(() => {
    return projects
      ?.filter(proj => proj.deadline && proj.status !== 'complete')
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)) || [];
  }, [projects]);

  // Get projects for timeline view
  const getProjectsForTimeline = useCallback(() => {
    return projects
      ?.filter(proj => proj.start_date && proj.deadline)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date)) || [];
  }, [projects]);

  // Get next milestone for a project
  const getNextMilestone = useCallback((projectId) => {
    const project = getProjectById(projectId);
    if (!project?.milestones || !Array.isArray(project.milestones)) return null;
    
    const upcoming = project.milestones
      .filter(m => !m.completed)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return upcoming[0] || null;
  }, [getProjectById]);

  // Active projects
  const activeProjects = useMemo(() => {
    return projects?.filter((proj) => proj.status !== 'complete') || [];
  }, [projects]);

  // Completed projects
  const completedProjects = useMemo(() => {
    return projects?.filter((proj) => proj.status === 'complete') || [];
  }, [projects]);

  return {
    projects,
    loading,
    error,
    
    // Actions
    addProject,
    updateProject,
    deleteProject,
    refresh,
    
    // Queries
    getActiveProjects,
    getInProgressProjects,
    getProjectById,
    getTotalProjectValue,
    getUpcomingMilestones,
    getProjectsWithDeadlines,
    getProjectsForTimeline,
    getNextMilestone,
    
    // Computed
    activeProjects,
    completedProjects,
  };
}
