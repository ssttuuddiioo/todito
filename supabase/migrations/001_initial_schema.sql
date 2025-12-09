-- ============================================
-- TODITOX APP SCHEMA
-- Prefix: toditox_
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create opportunities table with pipeline stages
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

-- Create projects table with simple statuses
CREATE TABLE IF NOT EXISTS toditox_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    client TEXT,
    deadline DATE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'review', 'complete')),
    next_milestone TEXT,
    notes TEXT,
    drive_folder_link TEXT,
    calendar_event_id TEXT,
    opportunity_id UUID REFERENCES toditox_opportunities(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_toditox_opportunities_user_id ON toditox_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_toditox_opportunities_stage ON toditox_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_toditox_opportunities_due_date ON toditox_opportunities(due_date);
CREATE INDEX IF NOT EXISTS idx_toditox_opportunities_created_at ON toditox_opportunities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_toditox_projects_user_id ON toditox_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_toditox_projects_status ON toditox_projects(status);
CREATE INDEX IF NOT EXISTS idx_toditox_projects_deadline ON toditox_projects(deadline);
CREATE INDEX IF NOT EXISTS idx_toditox_projects_created_at ON toditox_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_toditox_projects_opportunity_id ON toditox_projects(opportunity_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_toditox_opportunities_updated_at
    BEFORE UPDATE ON toditox_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_toditox_projects_updated_at
    BEFORE UPDATE ON toditox_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE toditox_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE toditox_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own opportunities" ON toditox_opportunities
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own opportunities" ON toditox_opportunities
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own opportunities" ON toditox_opportunities
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own opportunities" ON toditox_opportunities
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own projects" ON toditox_projects
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON toditox_projects
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON toditox_projects
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON toditox_projects
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE toditox_opportunities IS 'TODITOX: Sales pipeline: Track opportunities from lead to close';
COMMENT ON TABLE toditox_projects IS 'TODITOX: Active client projects with milestones';

COMMENT ON COLUMN toditox_opportunities.stage IS 'Pipeline stage: lead → proposal → negotiation → won/lost';
COMMENT ON COLUMN toditox_opportunities.next_action IS 'Next step to move opportunity forward';
COMMENT ON COLUMN toditox_opportunities.calendar_event_id IS 'Google Calendar event ID for sync';

COMMENT ON COLUMN toditox_projects.status IS 'Project status: in_progress → review → complete';
COMMENT ON COLUMN toditox_projects.next_milestone IS 'Next milestone or deliverable';
COMMENT ON COLUMN toditox_projects.calendar_event_id IS 'Google Calendar event ID for deadline sync';
COMMENT ON COLUMN toditox_projects.opportunity_id IS 'Optional link to the originating opportunity';

