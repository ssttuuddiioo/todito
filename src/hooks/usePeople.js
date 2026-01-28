import { useMemo, useCallback, useState, useEffect } from 'react';
import { useSupabaseTable } from './useSupabaseTable';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Hook for managing people (contacts) and their interactions
 * Tables: toditox_people, toditox_interactions
 */
export function usePeople() {
  const {
    data: people,
    loading: peopleLoading,
    error: peopleError,
    create: createPerson,
    update: updatePerson,
    remove: removePerson,
    refresh: refreshPeople,
  } = useSupabaseTable('toditox_people');

  // Interactions state (managed separately)
  const [interactions, setInteractions] = useState([]);
  const [interactionsLoading, setInteractionsLoading] = useState(true);

  // Fetch interactions
  const fetchInteractions = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    
    try {
      setInteractionsLoading(true);
      const { data, error } = await supabase
        .from('toditox_interactions')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      setInteractions(data || []);
    } catch (err) {
      console.error('Error fetching interactions:', err);
    } finally {
      setInteractionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  // Add a person
  const addPerson = useCallback(async (person) => {
    return createPerson(person);
  }, [createPerson]);

  // Update a person
  const editPerson = useCallback(async (id, updates) => {
    return updatePerson(id, updates);
  }, [updatePerson]);

  // Delete a person
  const deletePerson = useCallback(async (id) => {
    return removePerson(id);
  }, [removePerson]);

  // Log an interaction
  const logInteraction = useCallback(async (interaction) => {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('toditox_interactions')
        .insert([{ ...interaction, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setInteractions(prev => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      console.error('Error logging interaction:', err);
      return { data: null, error: err };
    }
  }, []);

  // Delete an interaction
  const deleteInteraction = useCallback(async (id) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase not configured') };
    }

    try {
      const { error } = await supabase
        .from('toditox_interactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInteractions(prev => prev.filter(i => i.id !== id));
      return { error: null };
    } catch (err) {
      console.error('Error deleting interaction:', err);
      return { error: err };
    }
  }, []);

  // Get people by project
  const getPeopleByProject = useCallback((projectId) => {
    if (!projectId) return [];
    return people.filter(p => p.project_id === projectId);
  }, [people]);

  // Get people by role
  const getPeopleByRole = useCallback((role) => {
    return people.filter(p => p.role === role);
  }, [people]);

  // Get interactions for a person
  const getInteractionsForPerson = useCallback((personId) => {
    return interactions.filter(i => i.person_id === personId);
  }, [interactions]);

  // Get interactions for a project
  const getInteractionsForProject = useCallback((projectId) => {
    return interactions.filter(i => i.project_id === projectId);
  }, [interactions]);

  // Get last interaction for a person
  const getLastInteraction = useCallback((personId) => {
    const personInteractions = getInteractionsForPerson(personId);
    if (personInteractions.length === 0) return null;
    return personInteractions[0]; // Already sorted by date desc
  }, [getInteractionsForPerson]);

  // People with their last interaction
  const peopleWithLastContact = useMemo(() => {
    return people.map(person => ({
      ...person,
      lastInteraction: getLastInteraction(person.id),
    }));
  }, [people, getLastInteraction]);

  // Clients only
  const clients = useMemo(() => {
    return people.filter(p => p.role === 'client');
  }, [people]);

  // Vendors only
  const vendors = useMemo(() => {
    return people.filter(p => p.role === 'vendor');
  }, [people]);

  // Partners only
  const partners = useMemo(() => {
    return people.filter(p => p.role === 'partner');
  }, [people]);

  return {
    people,
    interactions,
    loading: peopleLoading || interactionsLoading,
    error: peopleError,
    
    // Person actions
    addPerson,
    editPerson,
    deletePerson,
    refreshPeople,
    
    // Interaction actions
    logInteraction,
    deleteInteraction,
    refreshInteractions: fetchInteractions,
    
    // Queries
    getPeopleByProject,
    getPeopleByRole,
    getInteractionsForPerson,
    getInteractionsForProject,
    getLastInteraction,
    
    // Computed
    peopleWithLastContact,
    clients,
    vendors,
    partners,
  };
}
