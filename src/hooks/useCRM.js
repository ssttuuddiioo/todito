import { useMockData } from '@/contexts/MockDataContext';

export function useCRM() {
  const { 
    contacts, 
    activities, 
    addContact, 
    deleteContact, 
    logActivity 
  } = useMockData();
  const loading = false;

  const getActivitiesForContact = (contactId) => 
    activities?.filter(a => a.contact_id === contactId) || [];

  const getActivitiesForOpportunity = (opportunityId) => 
    activities?.filter(a => a.opportunity_id === opportunityId) || [];

  return {
    contacts,
    activities,
    loading,
    addContact,
    deleteContact,
    logActivity,
    getActivitiesForContact,
    getActivitiesForOpportunity
  };
}
