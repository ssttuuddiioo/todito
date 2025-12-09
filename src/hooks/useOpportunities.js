import { useMockData } from '@/contexts/MockDataContext';

export function useOpportunities() {
  const { opportunities, addOpportunity, updateOpportunity, deleteOpportunity } = useMockData();
  const loading = false;

  const getActiveOpportunities = () => {
    return opportunities?.filter((opp) => opp.status === 'active') || [];
  };

  const getOpportunityById = (id) => {
    return opportunities?.find((opp) => opp.id === id);
  };

  const getTotalPipelineValue = () => {
    return opportunities
      ?.filter((opp) => !['won', 'lost'].includes(opp.stage))
      .reduce((sum, opp) => sum + (opp.value || 0), 0) || 0;
  };

  return {
    opportunities,
    loading,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    getActiveOpportunities,
    getOpportunityById,
    getTotalPipelineValue,
  };
}
