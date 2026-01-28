-- ============================================
-- TODITOX V2 SCHEMA - Uses existing table names
-- Only creates tables that don't exist
-- ============================================

-- 1. TRANSACTIONS (Unified Income/Expense) - NEW TABLE
-- Existing tables: expenses, invoices have different schema
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDICES for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- RLS for transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own transactions" ON transactions;
CREATE POLICY "Users can manage own transactions" ON transactions 
    FOR ALL USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- EXISTING TABLES - No changes needed
-- ============================================
-- projects: Already has name, client, deadline, status, milestones, etc.
-- tasks: Already has title, project_id, status, priority, order, etc.
-- contacts: Uses 'status' field (lead, prospect, client, partner, inactive)
-- activities: Uses 'contact_id' to link to contacts
-- opportunities: Has title, value, stage, etc.
-- notes_archive: Has raw_text, parsed_data
-- ignored_items: Has item_type, item_data
