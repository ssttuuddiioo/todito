import { useMockData } from '@/contexts/MockDataContext';

export function useProjects() {
  const { projects, addProject, updateProject, deleteProject } = useMockData();
  const loading = false;

  const getActiveProjects = () => {
    return projects?.filter((proj) => proj.status !== 'complete') || [];
  };

  const getInProgressProjects = () => {
    return projects?.filter((proj) => proj.status === 'in_progress') || [];
  };

  const getProjectById = (id) => {
    return projects?.find((proj) => proj.id === id);
  };

  const getTotalProjectValue = () => {
    return projects
      ?.filter((proj) => proj.status !== 'complete')
      .reduce((sum, proj) => sum + (proj.value || 0), 0) || 0;
  };

  // New helpers for milestones and timeline
  const getUpcomingMilestones = (days = 7) => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    
    const milestones = [];
    projects?.forEach(project => {
      if (project.milestones) {
        project.milestones.forEach(milestone => {
          if (!milestone.completed) {
            const milestoneDate = new Date(milestone.date);
            if (milestoneDate >= now && milestoneDate <= futureDate) {
              milestones.push({
                ...milestone,
                project_id: project.id,
                project_name: project.name,
                project_client: project.client,
              });
            }
          }
        });
      }
    });
    
    return milestones.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getProjectsWithDeadlines = () => {
    return projects
      ?.filter(proj => proj.deadline && proj.status !== 'complete')
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)) || [];
  };

  const getProjectsForTimeline = () => {
    return projects
      ?.filter(proj => proj.start_date && proj.deadline)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date)) || [];
  };

  const getNextMilestone = (projectId) => {
    const project = getProjectById(projectId);
    if (!project?.milestones) return null;
    
    const upcoming = project.milestones
      .filter(m => !m.completed)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return upcoming[0] || null;
  };

  return {
    projects,
    loading,
    addProject,
    updateProject,
    deleteProject,
    getActiveProjects,
    getInProgressProjects,
    getProjectById,
    getTotalProjectValue,
    getUpcomingMilestones,
    getProjectsWithDeadlines,
    getProjectsForTimeline,
    getNextMilestone,
  };
}
