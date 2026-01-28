import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Generic hook for Supabase CRUD operations - Real Supabase only (no mock data)
 * @param {string} table - Table name (e.g., 'toditox_transactions')
 * @param {Object} options - Optional configuration
 * @param {string} options.orderBy - Column to order by (default: 'created_at')
 * @param {boolean} options.ascending - Sort ascending (default: false)
 * @param {Object} options.filter - Initial filter object { column: value }
 * @returns {Object} Hook utilities and state
 */
export function useSupabaseTable(table, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { orderBy = 'created_at', ascending = false, filter = null } = options;

  // Fetch all records
  const fetchData = useCallback(async (customFilter = null) => {
    if (!isSupabaseConfigured()) {
      setError('Supabase not configured');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from(table)
        .select('*')
        .order(orderBy, { ascending });

      // Apply default filter
      if (filter) {
        Object.entries(filter).forEach(([column, value]) => {
          query = query.eq(column, value);
        });
      }

      // Apply custom filter
      if (customFilter) {
        Object.entries(customFilter).forEach(([column, value]) => {
          query = query.eq(column, value);
        });
      }

      const { data: records, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setData(records || []);
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [table, orderBy, ascending, filter]);

  // Create a record
  const create = useCallback(async (record) => {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    try {
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: newRecord, error: createError } = await supabase
        .from(table)
        .insert([{ ...record, user_id: user.id }])
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
  }, [table]);

  // Update a record
  const update = useCallback(async (id, updates) => {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    try {
      setError(null);

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
  }, [table]);

  // Delete a record
  const remove = useCallback(async (id) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase not configured') };
    }

    try {
      setError(null);

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
  }, [table]);

  // Subscribe to real-time updates
  useEffect(() => {
    fetchData();

    if (!isSupabaseConfigured()) return;

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
  }, [table, fetchData]);

  return {
    data,
    loading,
    error,
    create,
    update,
    remove,
    refresh: fetchData,
    setData,
  };
}
