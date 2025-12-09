# 📱 Adding a New App to Your Small-Apps Supabase

This guide shows you how to add another small app to your shared Supabase project. Following this pattern keeps all your apps organized, costs low, and setup simple.

## Architecture Recap

**What you have:**
- One Supabase project: `small-apps`
- One cost: $35/month (or free tier)
- Multiple apps: Each in its own repo
- Table prefixes: Each app uses prefixed tables (e.g., `toditox_`, `myapp_`)

**Benefits:**
- ✅ Simple: Each app is independent
- ✅ Cheap: One Supabase subscription
- ✅ Organized: Table prefixes keep data separate
- ✅ Flexible: Can migrate to monorepo later

---

## Quick Start Checklist

For a new app called `myapp`:

- [ ] Choose a unique table prefix (e.g., `myapp_`)
- [ ] Create migration file with prefixed tables
- [ ] Run migration in your Supabase SQL Editor
- [ ] Copy Supabase credentials (same as toditox)
- [ ] Configure your app's `.env.local`
- [ ] Update your hooks to use prefixed table names

---

## Step-by-Step Guide

### Step 1: Choose Your Table Prefix

Pick a short, descriptive prefix for your new app:

**Examples:**
- Task manager → `tasks_`
- Recipe app → `recipes_`
- Budget tracker → `budget_`
- Notes app → `notes_`

**Rules:**
- Use lowercase
- Keep it short (3-10 chars)
- End with underscore `_`
- Unique across all your apps

**Example for this guide:** We'll use `myapp_`

---

### Step 2: Create Your Database Schema

Create a new migration file: `supabase/migrations/001_myapp_schema.sql`

```sql
-- ============================================
-- MYAPP SCHEMA
-- Prefix: myapp_
-- ============================================

-- Enable UUID extension (skip if already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Example: Create a users table for your app
CREATE TABLE IF NOT EXISTS myapp_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Example: Create a tasks table
CREATE TABLE IF NOT EXISTS myapp_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_myapp_users_user_id ON myapp_users(user_id);
CREATE INDEX IF NOT EXISTS idx_myapp_tasks_user_id ON myapp_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_myapp_tasks_completed ON myapp_tasks(completed);

-- Trigger function for updated_at (reuse existing if available)
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = NOW();
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_myapp_users_updated_at
    BEFORE UPDATE ON myapp_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_myapp_tasks_updated_at
    BEFORE UPDATE ON myapp_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE myapp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE myapp_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own profile" ON myapp_users
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON myapp_users
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON myapp_users
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tasks" ON myapp_tasks
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON myapp_tasks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON myapp_tasks
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON myapp_tasks
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE myapp_users IS 'MYAPP: User profiles';
COMMENT ON TABLE myapp_tasks IS 'MYAPP: User tasks';
```

**Important notes:**
- Prefix ALL tables with your chosen prefix
- Prefix ALL indexes with your prefix
- Prefix ALL triggers with your prefix
- Reuse the `update_updated_at_column()` function (already exists from toditox)
- Always include RLS policies for security

---

### Step 3: Run the Migration

1. Go to your **Supabase dashboard** → **SQL Editor**
2. Click **"New query"**
3. Copy and paste your migration SQL
4. Click **"Run"** (or `Cmd/Ctrl + Enter`)
5. You should see: ✅ **"Success. No rows returned"**

### Step 4: Verify Tables

1. Click **"Table Editor"** in the sidebar
2. You should now see:
   - `toditox_opportunities`
   - `toditox_projects`
   - `myapp_users` ← Your new tables!
   - `myapp_tasks` ← Your new tables!

---

### Step 5: Configure Your App

Your new app uses the **same Supabase credentials** as toditox:

**File: `.env.local`** (in your new app's repo)
```env
# Supabase Configuration (same as toditox!)
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

Copy these values from:
- Your toditox `.env.local` file, OR
- Supabase Dashboard → Settings → API

---

### Step 6: Set Up Your Supabase Client

**File: `src/lib/supabase.js`**

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

---

### Step 7: Create Your Hooks

**File: `src/hooks/useSupabase.js`** (generic reusable hook)

```javascript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useSupabase(table) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: records, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setData(records || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [table]);

  const create = async (record) => {
    const { data: newRecord, error } = await supabase
      .from(table)
      .insert([record])
      .select()
      .single();
    
    if (!error) fetchData();
    return { data: newRecord, error };
  };

  const update = async (id, updates) => {
    const { data: updatedRecord, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (!error) fetchData();
    return { data: updatedRecord, error };
  };

  const remove = async (id) => {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (!error) fetchData();
    return { error };
  };

  return { data, loading, error, create, update, remove, refresh: fetchData };
}
```

**File: `src/hooks/useTasks.js`** (app-specific hook)

```javascript
import { useSupabase } from './useSupabase';

export function useTasks() {
  const {
    data: tasks,
    loading,
    error,
    create,
    update,
    remove,
    refresh,
  } = useSupabase('myapp_tasks'); // ← Use your prefixed table name!

  const addTask = async (task) => {
    return await create(task);
  };

  const updateTask = async (id, updates) => {
    return await update(id, updates);
  };

  const deleteTask = async (id) => {
    return await remove(id);
  };

  const getCompletedTasks = () => {
    return tasks?.filter((task) => task.completed) || [];
  };

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    getCompletedTasks,
    refresh,
  };
}
```

**Key point:** Pass the **prefixed table name** (`myapp_tasks`, not `tasks`) to `useSupabase()`!

---

### Step 8: Use in Your Components

```jsx
import { useTasks } from '@/hooks/useTasks';

export function TaskList() {
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {tasks.map(task => (
        <div key={task.id}>
          <h3>{task.title}</h3>
          <p>{task.description}</p>
          <button onClick={() => deleteTask(task.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

---

## Table Prefix Naming Convention

As your apps grow, keep a naming reference:

| App Name | Prefix | Tables |
|----------|--------|--------|
| toditox | `toditox_` | `toditox_opportunities`, `toditox_projects` |
| myapp | `myapp_` | `myapp_users`, `myapp_tasks` |
| budget-app | `budget_` | `budget_accounts`, `budget_transactions` |
| recipe-app | `recipes_` | `recipes_recipes`, `recipes_ingredients` |

**Pro tip:** Keep a markdown file in your Supabase dashboard notes with this table!

---

## Shared Authentication

**All apps share the same auth:**
- Users sign in with Google OAuth once
- Their `auth.uid()` works across all apps
- Each app's RLS policies check `auth.uid() = user_id`

**This means:**
- ✅ Single sign-on across all your apps
- ✅ One user table in `auth.users`
- ✅ Same credentials everywhere

**To make apps auth-independent:**
Change the Google OAuth redirect URL per app, or use separate Supabase projects.

---

## Common Pitfalls

### ❌ Forgetting Table Prefixes
```javascript
// BAD
useSupabase('tasks')

// GOOD
useSupabase('myapp_tasks')
```

### ❌ Forgetting Index Prefixes
```sql
-- BAD
CREATE INDEX idx_tasks_user_id ON myapp_tasks(user_id);

-- GOOD
CREATE INDEX idx_myapp_tasks_user_id ON myapp_tasks(user_id);
```

### ❌ Not Using RLS
Always enable Row Level Security and create policies. Otherwise users can see each other's data!

### ❌ Hardcoding Table Names in Components
Use hooks that abstract the table name. Never do:
```javascript
// BAD
supabase.from('myapp_tasks').select('*')
```

Always use:
```javascript
// GOOD
const { tasks } = useTasks(); // Hook handles the table name
```

---

## Cost Breakdown

**Supabase Free Tier:**
- 500 MB database space
- 2 GB bandwidth
- 50,000 monthly active users
- Unlimited API requests

**If you outgrow free:**
- **Pro Plan:** $25/month
  - 8 GB database
  - 50 GB bandwidth
  - 100,000 MAU

**This cost covers ALL your small apps!** 🎉

---

## Migration Path

**When you outgrow this setup:**

1. **Monorepo:** Combine apps into one repo with shared packages
2. **Separate Databases:** Give each app its own Supabase project
3. **Microservices:** Break apps into separate backend services

**But for most small apps, this setup is perfect forever!**

---

## Example: Full App Structure

```
myapp/
├── src/
│   ├── lib/
│   │   └── supabase.js          # Supabase client
│   ├── hooks/
│   │   ├── useSupabase.js       # Generic CRUD hook
│   │   ├── useTasks.js          # App-specific hook
│   │   └── useAuth.js           # Shared auth hook
│   ├── components/
│   │   ├── TaskList.jsx
│   │   └── TaskForm.jsx
│   └── App.jsx
├── supabase/
│   └── migrations/
│       └── 001_myapp_schema.sql # Your migration
├── .env.local                   # Supabase credentials
└── package.json
```

---

## Next Steps

1. **Clone toditox** as a starter template
2. **Find and replace** `toditox_` with your prefix
3. **Update your schema** for your app's needs
4. **Run the migration** in Supabase
5. **Start building!**

---

## Need Help?

- Check `SUPABASE_SETUP_GUIDE.md` for initial setup
- Review `toditox` code as a reference implementation
- Read Supabase docs: https://supabase.com/docs
- Check RLS examples: https://supabase.com/docs/guides/auth/row-level-security

---

**Happy building!** 🚀

