import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const DataContext = createContext();

export function MockDataProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(!isSupabaseConfigured());
  
  // STATE
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [notesArchive, setNotesArchive] = useState([]);
  const [ignoredItems, setIgnoredItems] = useState([]);

  // --- Supabase CRUD Operations ---
  
  // Generic fetch
  const fetchTable = useCallback(async (table, setter, orderBy = 'created_at') => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending: false });
    
    if (error) {
      console.error(`Error fetching ${table}:`, error);
      return;
    }
    setter(data || []);
  }, []);

  // Initial data load
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const loadAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchTable('contacts', setContacts),
        fetchTable('activities', setActivities),
        fetchTable('opportunities', setOpportunities),
        fetchTable('projects', setProjects),
        fetchTable('tasks', setTasks, 'order'),
        fetchTable('time_entries', setTimeEntries, 'date'),
        fetchTable('invoices', setInvoices),
        fetchTable('expenses', setExpenses, 'date'),
        fetchTable('notes_archive', setNotesArchive),
        fetchTable('ignored_items', setIgnoredItems, 'ignored_at'),
      ]);
      setIsLoading(false);
    };

    loadAllData();
  }, [fetchTable]);

  // --- CRUD Helpers ---

  // Create
  const createItem = useCallback((table, setter) => async (item) => {
    if (!supabase) {
      // Mock fallback
      const newItem = { ...item, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      setter(prev => [newItem, ...prev]);
      return { data: newItem, error: null };
    }

    const { data, error } = await supabase
      .from(table)
      .insert([item])
      .select()
      .single();

    if (error) {
      console.error(`Error creating ${table}:`, error);
      return { data: null, error };
    }

    setter(prev => [data, ...prev]);
    return { data, error: null };
  }, []);

  // Update
  const updateItem = useCallback((table, setter) => async (id, updates) => {
    if (!supabase) {
      // Mock fallback
      setter(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
      return { data: { id, ...updates }, error: null };
    }

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating ${table}:`, error);
      return { data: null, error };
    }

    setter(prev => prev.map(item => item.id === id ? data : item));
    return { data, error: null };
  }, []);

  // Delete
  const deleteItem = useCallback((table, setter) => async (id) => {
    if (!supabase) {
      // Mock fallback
      setter(prev => prev.filter(item => item.id !== id));
      return { error: null };
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting from ${table}:`, error);
      return { error };
    }

    setter(prev => prev.filter(item => item.id !== id));
    return { error: null };
  }, []);

  // Clear all data
  const clearAllData = useCallback(async () => {
    if (!supabase) {
      setContacts([]);
      setActivities([]);
      setOpportunities([]);
      setProjects([]);
      setTasks([]);
      setTimeEntries([]);
      setInvoices([]);
      setExpenses([]);
      setNotesArchive([]);
      setIgnoredItems([]);
      return;
    }

    // Clear all Supabase tables
    const tables = [
      'activities', 'time_entries', 'ignored_items', 'notes_archive',
      'expenses', 'invoices', 'opportunities', 'tasks', 'contacts', 'projects'
    ];
    
    for (const table of tables) {
      await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    // Clear local state
    setContacts([]);
    setActivities([]);
    setOpportunities([]);
    setProjects([]);
    setTasks([]);
    setTimeEntries([]);
    setInvoices([]);
    setExpenses([]);
    setNotesArchive([]);
    setIgnoredItems([]);
  }, []);

  // Reorder tasks (special case)
  const reorderTasks = useCallback(async (reorderedTasks) => {
    if (!supabase) {
      setTasks(reorderedTasks);
      return { error: null };
    }

    // Update order for each task
    const updates = reorderedTasks.map((task, index) => 
      supabase
        .from('tasks')
        .update({ order: index })
        .eq('id', task.id)
    );

    await Promise.all(updates);
    setTasks(reorderedTasks);
    return { error: null };
  }, []);

  // Add ignored item (special structure)
  const addIgnoredItem = useCallback(async (item) => {
    const payload = {
      item_type: item.type,
      item_data: item.item,
    };

    if (!supabase) {
      const newItem = { 
        ...payload, 
        id: crypto.randomUUID(), 
        ignored_at: new Date().toISOString() 
      };
      setIgnoredItems(prev => [newItem, ...prev]);
      return { data: newItem, error: null };
    }

    const { data, error } = await supabase
      .from('ignored_items')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error adding ignored item:', error);
      return { data: null, error };
    }

    setIgnoredItems(prev => [data, ...prev]);
    return { data, error: null };
  }, []);

  // Add notes archive (special structure)
  const addNotesArchive = useCallback(async (noteSession) => {
    const payload = {
      raw_text: noteSession.raw_text,
      parsed_data: noteSession.parsed_data,
    };

    if (!supabase) {
      const newSession = { 
        ...payload, 
        id: crypto.randomUUID(), 
        created_at: new Date().toISOString() 
      };
      setNotesArchive(prev => [newSession, ...prev]);
      return { data: newSession, error: null };
    }

    const { data, error } = await supabase
      .from('notes_archive')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error adding notes archive:', error);
      return { data: null, error };
    }

    setNotesArchive(prev => [data, ...prev]);
    return { data, error: null };
  }, []);

  const value = {
    isLoading,
    isMockMode,
    
    // Data
    contacts,
    activities,
    opportunities,
    projects,
    tasks,
    timeEntries,
    invoices,
    expenses,
    notesArchive,
    ignoredItems,
    
    // CRM Actions
    addContact: createItem('contacts', setContacts),
    updateContact: updateItem('contacts', setContacts),
    deleteContact: deleteItem('contacts', setContacts),
    logActivity: createItem('activities', setActivities),
    
    // Opportunity Actions
    addOpportunity: createItem('opportunities', setOpportunities),
    updateOpportunity: updateItem('opportunities', setOpportunities),
    deleteOpportunity: deleteItem('opportunities', setOpportunities),

    // Project Actions
    addProject: createItem('projects', setProjects),
    updateProject: updateItem('projects', setProjects),
    deleteProject: deleteItem('projects', setProjects),
    
    // Task Actions
    addTask: createItem('tasks', setTasks),
    updateTask: updateItem('tasks', setTasks),
    deleteTask: deleteItem('tasks', setTasks),
    reorderTasks,
    
    // Time Tracking
    logTime: createItem('time_entries', setTimeEntries),

    // Finance Actions
    addInvoice: createItem('invoices', setInvoices),
    updateInvoice: updateItem('invoices', setInvoices),
    updateInvoiceStatus: async (id, status) => updateItem('invoices', setInvoices)(id, { status }),
    addExpense: createItem('expenses', setExpenses),
    deleteExpense: deleteItem('expenses', setExpenses),

    // Notes Archive Actions
    addNotesArchive,
    deleteNotesArchive: deleteItem('notes_archive', setNotesArchive),

    // Ignored Items Actions
    addIgnoredItem,
    deleteIgnoredItem: deleteItem('ignored_items', setIgnoredItems),

    // Utility
    clearAllData,
    
    // Refresh data from Supabase
    refreshData: useCallback(async () => {
      if (!supabase) return;
      await Promise.all([
        fetchTable('contacts', setContacts),
        fetchTable('activities', setActivities),
        fetchTable('opportunities', setOpportunities),
        fetchTable('projects', setProjects),
        fetchTable('tasks', setTasks, 'order'),
        fetchTable('time_entries', setTimeEntries, 'date'),
        fetchTable('invoices', setInvoices),
        fetchTable('expenses', setExpenses, 'date'),
        fetchTable('notes_archive', setNotesArchive),
        fetchTable('ignored_items', setIgnoredItems, 'ignored_at'),
      ]);
    }, [fetchTable]),
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useMockData() {
  return useContext(DataContext);
}
