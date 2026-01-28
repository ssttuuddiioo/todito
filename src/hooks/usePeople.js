import { useMemo, useCallback, useState, useEffect } from 'react';
import { useSupabaseTable } from './useSupabaseTable';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Hook for managing people (contacts) and their interactions
 * Tables: contacts, activities
 * Note: contacts uses 'status' field (lead, prospect, client, partner, inactive)
 * Note: activities uses 'contact_id' to link to contacts
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
  } = useSupabaseTable('contacts');

  // Interactions state (managed separately)
  const [interactions, setInteractions] = useState([]);
  const [interactionsLoading, setInteractionsLoading] = useState(true);

  // Fetch interactions
  const fetchInteractions = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    
    try {
      setInteractionsLoading(true);
      const { data, error } = await supabase
        .from('activities')
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
    // Map role to status for the contacts table
    const contactData = {
      name: person.name,
      email: person.email,
      phone: person.phone,
      company: person.company,
      notes: person.notes,
      status: person.role || person.status || 'lead', // Map role -> status
    };
    return createPerson(contactData);
  }, [createPerson]);

  // Update a person
  const editPerson = useCallback(async (id, updates) => {
    // Map role to status if provided
    const updateData = { ...updates };
    if (updates.role) {
      updateData.status = updates.role;
      delete updateData.role;
    }
    return updatePerson(id, updateData);
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

      // Map to activities table schema
      const activityData = {
        contact_id: interaction.person_id || interaction.contact_id,
        type: interaction.type,
        description: interaction.note || interaction.description,
        date: interaction.date || new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('activities')
        .insert([activityData])
        .select()
        .single();

      if (error) throw error;

      setInteractions(prev => [data, ...prev]);
      
      // Also update the contact's last_contact field
      if (activityData.contact_id) {
        await supabase
          .from('contacts')
          .update({ last_contact: activityData.date })
          .eq('id', activityData.contact_id);
      }
      
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
        .from('activities')
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

  // Get people by company (since contacts table doesn't have project_id)
  const getPeopleByProject = useCallback((projectId) => {
    // For now, return empty - contacts table doesn't have project_id
    // Could be implemented later with a junction table
    return [];
  }, []);

  // Get people by status (mapped from role)
  const getPeopleByRole = useCallback((role) => {
    return people.filter(p => p.status === role);
  }, [people]);

  // Get interactions for a person (using contact_id)
  const getInteractionsForPerson = useCallback((personId) => {
    return interactions.filter(i => i.contact_id === personId);
  }, [interactions]);

  // Get interactions for a project
  const getInteractionsForProject = useCallback((projectId) => {
    // Not supported in current schema
    return [];
  }, []);

  // Get last interaction for a person
  const getLastInteraction = useCallback((personId) => {
    const personInteractions = getInteractionsForPerson(personId);
    if (personInteractions.length === 0) return null;
    return personInteractions[0]; // Already sorted by date desc
  }, [getInteractionsForPerson]);

  // People with their last interaction - use last_contact field from contacts table
  const peopleWithLastContact = useMemo(() => {
    return people.map(person => ({
      ...person,
      role: person.status, // Map status -> role for UI compatibility
      lastInteraction: person.last_contact 
        ? { date: person.last_contact, ...getLastInteraction(person.id) }
        : getLastInteraction(person.id),
    }));
  }, [people, getLastInteraction]);

  // Clients only (status = 'client')
  const clients = useMemo(() => {
    return people.filter(p => p.status === 'client');
  }, [people]);

  // Vendors only - contacts table doesn't have vendor, using inactive as proxy
  const vendors = useMemo(() => {
    return people.filter(p => p.status === 'inactive');
  }, [people]);

  // Partners only (status = 'partner')
  const partners = useMemo(() => {
    return people.filter(p => p.status === 'partner');
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
