import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
    setData,
  } = useSupabaseTable('projects');

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

  // Get active projects (not complete/completed/cancelled)
  const getActiveProjects = useCallback(() => {
    return projects?.filter((proj) => 
      proj.status !== 'complete' && 
      proj.status !== 'completed' && 
      proj.status !== 'cancelled'
    ) || [];
  }, [projects]);

  // Get in-progress projects only (includes 'active' status)
  const getInProgressProjects = useCallback(() => {
    return projects?.filter((proj) => 
      proj.status === 'in_progress' || proj.status === 'active'
    ) || [];
  }, [projects]);

  // Get project by ID
  const getProjectById = useCallback((id) => {
    return projects?.find((proj) => proj.id === id);
  }, [projects]);

  // Get total project value (from milestones if available, otherwise 0)
  const getTotalProjectValue = useCallback(() => {
    // Budget field doesn't exist in current schema, return 0
    return 0;
  }, []);

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

  // Reorder projects by updating sort_order in batch
  const reorderProjects = useCallback(async (orderedItems) => {
    if (!isSupabaseConfigured()) return;
    // Optimistic local update
    setData(prev => {
      const orderMap = new Map(orderedItems.map(i => [i.id, i.sort_order]));
      return prev.map(p => orderMap.has(p.id) ? { ...p, sort_order: orderMap.get(p.id) } : p);
    });
    // Persist to DB
    const promises = orderedItems.map(({ id, sort_order }) =>
      supabase.from('projects').update({ sort_order }).eq('id', id)
    );
    await Promise.all(promises);
  }, [setData]);

  const sortByOrder = (list) =>
    [...list].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name));

  // Active projects (not complete/completed/cancelled)
  const activeProjects = useMemo(() => {
    return sortByOrder(projects?.filter((proj) =>
      proj.status !== 'complete' &&
      proj.status !== 'completed' &&
      proj.status !== 'cancelled'
    ) || []);
  }, [projects]);

  // Completed projects
  const completedProjects = useMemo(() => {
    return sortByOrder(projects?.filter((proj) =>
      proj.status === 'complete' || proj.status === 'completed'
    ) || []);
  }, [projects]);

  return {
    projects,
    loading,
    error,

    // Actions
    addProject,
    updateProject,
    deleteProject,
    reorderProjects,
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
