import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Using mock data.');
  console.warn('VITE_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
  console.warn('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Found' : 'Missing');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => !!supabase;

// Auth helper methods
export const auth = {
  getSession: async () => {
    if (!supabase) return { session: null };
    const { data, error } = await supabase.auth.getSession();
    return { session: data?.session, error };
  },
  
  signInWithGoogle: async () => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  },
  
  signOut: async () => {
    if (!supabase) return { error: null };
    return await supabase.auth.signOut();
  },
};
