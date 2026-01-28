import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Hook for managing opportunities (deals in motion)
 * Table: opportunities
 * Note: Uses 'title' for name, 'expected_close' for due_date, 'closed_won'/'closed_lost' for won/lost
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
    refresh,
    
    // Queries
    getOpportunitiesByStage,
    getUpcomingOpportunities,
    
    // Computed
    activeOpportunities,
    wonOpportunities,
    lostOpportunities,
    pipelineValue,
    totalWonValue,
  };
}
