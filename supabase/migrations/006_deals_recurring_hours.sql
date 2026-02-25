-- ============================================
-- 006: Deals enhancements, Recurring Txns, Hours Estimate
-- ============================================

-- =====================
-- FEATURE 1: Deals Pipeline - Add project_id and next_action to opportunities
-- =====================

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_project_id ON opportunities(project_id);

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS next_action TEXT;

-- Update stage CHECK constraint to also allow 'won' and 'lost'
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_stage_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_stage_check
  CHECK (stage = ANY (ARRAY['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'won', 'lost']));


-- =====================
-- FEATURE 3: Recurring Transactions
-- =====================

CREATE TABLE IF NOT EXISTS recurring_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    next_occurrence DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_templates_next_occurrence ON recurring_templates(next_occurrence);

ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users on recurring_templates" ON recurring_templates
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add recurring_template_id to transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS recurring_template_id UUID REFERENCES recurring_templates(id) ON DELETE SET NULL;


-- =====================
-- FEATURE 4: Invoicing - Add missing columns to existing invoices table
-- =====================

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS date_sent DATE;

-- Link transactions to invoices
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;


-- =====================
-- FEATURE 5: Hours Estimate on Projects
-- =====================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS hours_estimate DECIMAL(8, 2);
