-- ============================================
-- TODITOX FULL SUITE SCHEMA (MVP)
-- Adds CRM, Project Tasks, Revenue, Expenses
-- ============================================

-- 1. CONTACTS (CRM)
CREATE TABLE IF NOT EXISTS toditox_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    lead_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ACTIVITIES (CRM)
CREATE TABLE IF NOT EXISTS toditox_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES toditox_contacts(id) ON DELETE SET NULL,
    opportunity_id UUID REFERENCES toditox_opportunities(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note')),
    notes TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TASKS (Project Management)
CREATE TABLE IF NOT EXISTS toditox_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES toditox_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    assignee TEXT, -- For now just text, or could link to users if team
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TIME ENTRIES (Project Management)
CREATE TABLE IF NOT EXISTS toditox_time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES toditox_projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES toditox_tasks(id) ON DELETE SET NULL,
    hours DECIMAL(5, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. INVOICES (Revenue)
CREATE TABLE IF NOT EXISTS toditox_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
    due_date DATE,
    issue_date DATE DEFAULT CURRENT_DATE,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS toditox_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES toditox_invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(12, 2) DEFAULT 0,
    amount DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. EXPENSES (Finance)
CREATE TABLE IF NOT EXISTS toditox_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES toditox_projects(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    category TEXT NOT NULL, -- e.g., 'software', 'travel', 'meals'
    date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDICES
CREATE INDEX IF NOT EXISTS idx_toditox_contacts_user_id ON toditox_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_toditox_activities_user_id ON toditox_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_toditox_tasks_project_id ON toditox_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_toditox_time_entries_project_id ON toditox_time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_toditox_invoices_user_id ON toditox_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_toditox_expenses_user_id ON toditox_expenses(user_id);

-- RLS POLICIES
-- (Generic template for all new tables)
ALTER TABLE toditox_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE toditox_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE toditox_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE toditox_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE toditox_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE toditox_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE toditox_expenses ENABLE ROW LEVEL SECURITY;

-- Contacts
CREATE POLICY "Users can manage own contacts" ON toditox_contacts USING (auth.uid() = user_id);

-- Activities
CREATE POLICY "Users can manage own activities" ON toditox_activities USING (auth.uid() = user_id);

-- Tasks
CREATE POLICY "Users can manage own tasks" ON toditox_tasks USING (auth.uid() = user_id);

-- Time Entries
CREATE POLICY "Users can manage own time entries" ON toditox_time_entries USING (auth.uid() = user_id);

-- Invoices
CREATE POLICY "Users can manage own invoices" ON toditox_invoices USING (auth.uid() = user_id);
-- Invoice Items (accessible through invoice ownership via join or just unrestricted if invoice is owned? 
-- Simpler: items don't have user_id, so we rely on invoice_id. 
-- Actually, RLS on items requires a join check or user_id on items. 
-- For simplicity in MVP, let's add user_id to items OR do a join check. 
-- Join check is expensive. Let's add user_id to items to be safe or just rely on API logic if RLS is strict.
-- BETTER: Add user_id to invoice_items for easiest RLS.)
ALTER TABLE toditox_invoice_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE POLICY "Users can manage own invoice items" ON toditox_invoice_items USING (auth.uid() = user_id);

-- Expenses
CREATE POLICY "Users can manage own expenses" ON toditox_expenses USING (auth.uid() = user_id);

-- TRIGGERS for updated_at
CREATE TRIGGER update_toditox_contacts_updated_at BEFORE UPDATE ON toditox_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_toditox_tasks_updated_at BEFORE UPDATE ON toditox_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_toditox_invoices_updated_at BEFORE UPDATE ON toditox_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_toditox_expenses_updated_at BEFORE UPDATE ON toditox_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


