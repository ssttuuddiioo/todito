import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Hook for managing opportunities (deals in motion)
 * Table: opportunities
 * DB columns: title, contact_id (FK), value, stage, probability, expected_close,
 *             next_action, project_id (FK), notes
 * Stages: lead, qualified, proposal, negotiation, closed_won, closed_lost, won, lost
 */
export function useOpportunities() {
  const {
    data: opportunities,
    loading,
    error,
    create,
    update,
    remove,
    refresh,
  } = useSupabaseTable('opportunities');

  // Add an opportunity
  const addOpportunity = useCallback(async (opportunity) => {
    return create({
      ...opportunity,
      stage: opportunity.stage || 'lead',
    });
  }, [create]);

  // Update an opportunity
  const updateOpportunity = useCallback(async (id, updates) => {
    return update(id, updates);
  }, [update]);

  // Delete an opportunity
  const deleteOpportunity = useCallback(async (id) => {
    return remove(id);
  }, [remove]);

  // Mark as won, optionally link to a project
  const markAsWon = useCallback(async (id, projectId = null) => {
    const updates = { stage: 'won' };
    if (projectId) updates.project_id = projectId;
    return update(id, updates);
  }, [update]);

  // Mark as lost
  const markAsLost = useCallback(async (id) => {
    return update(id, { stage: 'lost' });
  }, [update]);

  // Get opportunities by stage
  const getOpportunitiesByStage = useCallback((stage) => {
    return opportunities.filter(opp => opp.stage === stage);
  }, [opportunities]);

  // Active opportunities (not won/lost)
  const activeOpportunities = useMemo(() => {
    return opportunities.filter(opp =>
      opp.stage !== 'closed_won' && opp.stage !== 'closed_lost' &&
      opp.stage !== 'won' && opp.stage !== 'lost'
    );
  }, [opportunities]);

  // Won opportunities
  const wonOpportunities = useMemo(() => {
    return opportunities.filter(opp => opp.stage === 'closed_won' || opp.stage === 'won');
  }, [opportunities]);

  // Lost opportunities
  const lostOpportunities = useMemo(() => {
    return opportunities.filter(opp => opp.stage === 'closed_lost' || opp.stage === 'lost');
  }, [opportunities]);

  // Grouped by stage for kanban rendering
  const opportunitiesByStage = useMemo(() => {
    const stages = ['lead', 'proposal', 'negotiation', 'won', 'lost'];
    const grouped = {};
    stages.forEach(stage => {
      grouped[stage] = opportunities.filter(opp => {
        if (stage === 'won') return opp.stage === 'won' || opp.stage === 'closed_won';
        if (stage === 'lost') return opp.stage === 'lost' || opp.stage === 'closed_lost';
        return opp.stage === stage;
      });
    });
    return grouped;
  }, [opportunities]);

  // Pipeline value (active opportunities)
  const pipelineValue = useMemo(() => {
    return activeOpportunities.reduce((sum, opp) =>
      sum + (parseFloat(opp.value) || 0), 0
    );
  }, [activeOpportunities]);

  // Total won value
  const totalWonValue = useMemo(() => {
    return wonOpportunities.reduce((sum, opp) =>
      sum + (parseFloat(opp.value) || 0), 0
    );
  }, [wonOpportunities]);

  // Opportunities with upcoming due dates (uses expected_close)
  const getUpcomingOpportunities = useCallback((days = 7) => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return activeOpportunities.filter(opp => {
      const closeDate = opp.expected_close || opp.due_date;
      if (!closeDate) return false;
      const parsedDate = new Date(closeDate);
      return parsedDate >= now && parsedDate <= futureDate;
    }).sort((a, b) => new Date(a.expected_close || a.due_date) - new Date(b.expected_close || b.due_date));
  }, [activeOpportunities]);

  return {
    opportunities,
    loading,
    error,

    // Actions
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    markAsWon,
    markAsLost,
    refresh,

    // Queries
    getOpportunitiesByStage,
    getUpcomingOpportunities,

    // Computed
    activeOpportunities,
    wonOpportunities,
    lostOpportunities,
    opportunitiesByStage,
    pipelineValue,
    totalWonValue,
  };
}
