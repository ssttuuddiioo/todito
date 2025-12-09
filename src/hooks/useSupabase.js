import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mockData } from '@/lib/mockData';

// Global mock store to persist data during session
const mockStore = { ...mockData };

/**
 * Generic hook for Supabase CRUD operations with Demo Mode support
 * @param {string} table - Table name
 * @returns {Object} Hook utilities and state
 */
export function useSupabase(table) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const DEMO_MODE = true; // Should match App.jsx

  // Fetch all records
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (DEMO_MODE) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 400));
        const records = mockStore[table] || [];
        // Sort by created_at desc
        records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setData([...records]);
        setLoading(false);
        return;
      }

      const { data: records, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setData(records || []);
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create a record
  const create = async (record) => {
    try {
      setError(null);

      if (DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const newRecord = {
          id: crypto.randomUUID(),
          ...record,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Initialize array if it doesn't exist
        if (!mockStore[table]) mockStore[table] = [];
        mockStore[table].unshift(newRecord);
        
        setData(prev => [newRecord, ...prev]);
        return { data: newRecord, error: null };
      }

      const { data: newRecord, error: createError } = await supabase
        .from(table)
        .insert([record])
        .select()
        .single();

      if (createError) throw createError;

      setData((prev) => [newRecord, ...prev]);
      return { data: newRecord, error: null };
    } catch (err) {
      console.error(`Error creating ${table} record:`, err);
      setError(err.message);
      return { data: null, error: err };
    }
  };

  // Update a record
  const update = async (id, updates) => {
    try {
      setError(null);

      if (DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const index = mockStore[table]?.findIndex(item => item.id === id);
        
        if (index !== -1) {
          const updatedRecord = {
            ...mockStore[table][index],
            ...updates,
            updated_at: new Date().toISOString()
          };
          mockStore[table][index] = updatedRecord;
          
          setData(prev => prev.map(item => item.id === id ? updatedRecord : item));
          return { data: updatedRecord, error: null };
        }
        return { data: null, error: 'Record not found' };
      }

      const { data: updatedRecord, error: updateError } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setData((prev) =>
        prev.map((item) => (item.id === id ? updatedRecord : item))
      );
      return { data: updatedRecord, error: null };
    } catch (err) {
      console.error(`Error updating ${table} record:`, err);
      setError(err.message);
      return { data: null, error: err };
    }
  };

  // Delete a record
  const remove = async (id) => {
    try {
      setError(null);

      if (DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 300));
        if (mockStore[table]) {
          mockStore[table] = mockStore[table].filter(item => item.id !== id);
        }
        setData(prev => prev.filter(item => item.id !== id));
        return { error: null };
      }

      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (err) {
      console.error(`Error deleting ${table} record:`, err);
      setError(err.message);
      return { error: err };
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    fetchData();

    if (DEMO_MODE) return; // No realtime in demo mode

    const subscription = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setData((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setData((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? payload.new : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setData((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [table]);

  return {
    data,
    loading,
    error,
    create,
    update,
    remove,
    refresh: fetchData,
  };
}
