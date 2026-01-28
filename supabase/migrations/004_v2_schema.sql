-- ============================================
-- TODITOX V2 SCHEMA - Simplified Architecture
-- Unified transactions, simplified CRM
-- ============================================

-- 1. TRANSACTIONS (Unified Income/Expense)
-- Replaces separate invoices and expenses tables
CREATE TABLE IF NOT EXISTS toditox_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES toditox_projects(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT, -- hardware, software, travel, subcontractor, etc.
    date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PEOPLE (Simplified CRM - replaces contacts)
-- Add project_id and role fields
CREATE TABLE IF NOT EXISTS toditox_people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES toditox_projects(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'vendor', 'partner')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. INTERACTIONS (Simplified activity log)
CREATE TABLE IF NOT EXISTS toditox_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES toditox_people(id) ON DELETE CASCADE,
    project_id UUID REFERENCES toditox_projects(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'other')),
    note TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Update toditox_projects - add revenue tracking fields
ALTER TABLE toditox_projects 
ADD COLUMN IF NOT EXISTS revenue DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS client_email TEXT,
ADD COLUMN IF NOT EXISTS budget DECIMAL(12, 2) DEFAULT 0;

-- 5. Update toditox_tasks - add fields for V2
ALTER TABLE toditox_tasks
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high') OR priority IS NULL),
ADD COLUMN IF NOT EXISTS is_mine BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS energy TEXT,
ADD COLUMN IF NOT EXISTS pomodoro_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- 6. OPPORTUNITIES (for deals in motion on dashboard)
-- Keep existing table, ensure it exists
CREATE TABLE IF NOT EXISTS toditox_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact TEXT,
    value DECIMAL(12, 2) DEFAULT 0,
    stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'proposal', 'negotiation', 'won', 'lost')),
    next_action TEXT,
    due_date DATE,
    notes TEXT,
    drive_folder_link TEXT,
    calendar_event_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. NOTES ARCHIVE (for AI notes parser)
CREATE TABLE IF NOT EXISTS toditox_notes_archive (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    raw_text TEXT NOT NULL,
    parsed_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. IGNORED ITEMS (for AI notes parser "Later" feature)
CREATE TABLE IF NOT EXISTS toditox_ignored_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    item JSONB NOT NULL,
    parsed_data JSONB,
    raw_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDICES
CREATE INDEX IF NOT EXISTS idx_toditox_transactions_user_id ON toditox_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_toditox_transactions_project_id ON toditox_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_toditox_transactions_type ON toditox_transactions(type);
CREATE INDEX IF NOT EXISTS idx_toditox_transactions_date ON toditox_transactions(date);
CREATE INDEX IF NOT EXISTS idx_toditox_people_user_id ON toditox_people(user_id);
CREATE INDEX IF NOT EXISTS idx_toditox_people_project_id ON toditox_people(project_id);
CREATE INDEX IF NOT EXISTS idx_toditox_interactions_person_id ON toditox_interactions(person_id);
CREATE INDEX IF NOT EXISTS idx_toditox_interactions_project_id ON toditox_interactions(project_id);
CREATE INDEX IF NOT EXISTS idx_toditox_notes_archive_user_id ON toditox_notes_archive(user_id);
CREATE INDEX IF NOT EXISTS idx_toditox_ignored_items_user_id ON toditox_ignored_items(user_id);

-- RLS POLICIES
ALTER TABLE toditox_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE toditox_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE toditox_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE toditox_notes_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE toditox_ignored_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can manage own transactions" ON toditox_transactions;
DROP POLICY IF EXISTS "Users can manage own people" ON toditox_people;
DROP POLICY IF EXISTS "Users can manage own interactions" ON toditox_interactions;
DROP POLICY IF EXISTS "Users can manage own notes archive" ON toditox_notes_archive;
DROP POLICY IF EXISTS "Users can manage own ignored items" ON toditox_ignored_items;

-- Create policies
CREATE POLICY "Users can manage own transactions" ON toditox_transactions 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own people" ON toditox_people 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own interactions" ON toditox_interactions 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notes archive" ON toditox_notes_archive 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own ignored items" ON toditox_ignored_items 
    FOR ALL USING (auth.uid() = user_id);

-- TRIGGERS for updated_at
DROP TRIGGER IF EXISTS update_toditox_transactions_updated_at ON toditox_transactions;
CREATE TRIGGER update_toditox_transactions_updated_at 
    BEFORE UPDATE ON toditox_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_toditox_people_updated_at ON toditox_people;
CREATE TRIGGER update_toditox_people_updated_at 
    BEFORE UPDATE ON toditox_people 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
