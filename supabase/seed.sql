-- ============================================
-- TODITOX SEED DATA
-- ============================================
-- Note: This seed data uses a placeholder user_id
-- Replace 'YOUR_USER_ID' with your actual Supabase auth.users.id after signing up
-- Or comment out this file and add data through the UI after authentication

-- Seed data for opportunities table (Pipeline: Lead → Proposal → Negotiation → Won/Lost)
INSERT INTO toditox_opportunities (user_id, name, contact, value, stage, next_action, due_date) VALUES
    (
        'YOUR_USER_ID',
        'Tech Startup Website',
        'John Smith - john@techstartup.com',
        45000.00,
        'proposal',
        'Send proposal document by Friday',
        CURRENT_DATE + INTERVAL '7 days'
    ),
    (
        'YOUR_USER_ID',
        'Fitness App Development',
        'Sarah Johnson - sarah@fitnessco.com',
        75000.00,
        'negotiation',
        'Schedule pricing discussion',
        CURRENT_DATE + INTERVAL '3 days'
    ),
    (
        'YOUR_USER_ID',
        'E-commerce Platform',
        'Mike Brown - mike@retailbiz.com',
        120000.00,
        'lead',
        'Send intro email with portfolio',
        CURRENT_DATE + INTERVAL '2 days'
    ),
    (
        'YOUR_USER_ID',
        'Brand Identity Package',
        'Emily Davis - emily@newventure.com',
        15000.00,
        'proposal',
        'Follow up on proposal sent last week',
        CURRENT_DATE + INTERVAL '1 day'
    ),
    (
        'YOUR_USER_ID',
        'CRM Integration',
        'Robert Wilson - robert@corporation.com',
        35000.00,
        'won',
        'Project kickoff meeting',
        CURRENT_DATE + INTERVAL '5 days'
    );

-- Seed data for projects table (Status: In Progress → Review → Complete)
INSERT INTO toditox_projects (user_id, name, client, deadline, status, next_milestone, notes) VALUES
    (
        'YOUR_USER_ID',
        'Acme Corp Website',
        'Acme Corporation',
        CURRENT_DATE + INTERVAL '30 days',
        'in_progress',
        'Complete homepage design',
        'Client prefers minimal aesthetic'
    ),
    (
        'YOUR_USER_ID',
        'TechFlow Mobile App',
        'TechFlow Inc',
        CURRENT_DATE + INTERVAL '60 days',
        'in_progress',
        'Beta testing phase',
        'iOS version ready, Android in progress'
    ),
    (
        'YOUR_USER_ID',
        'Green Energy Dashboard',
        'Green Energy Co',
        CURRENT_DATE + INTERVAL '15 days',
        'review',
        'Final client review',
        'Waiting for feedback on analytics module'
    ),
    (
        'YOUR_USER_ID',
        'RetailPro Integration',
        'RetailPro Systems',
        CURRENT_DATE + INTERVAL '7 days',
        'review',
        'QA testing',
        'API integration complete, testing edge cases'
    ),
    (
        'YOUR_USER_ID',
        'Portfolio Site',
        'Personal',
        CURRENT_DATE - INTERVAL '10 days',
        'complete',
        'Project delivered',
        'Successfully launched and deployed'
    );

-- Link a project to an opportunity
UPDATE toditox_projects 
SET opportunity_id = (SELECT id FROM toditox_opportunities WHERE name = 'CRM Integration' AND user_id = 'YOUR_USER_ID' LIMIT 1)
WHERE name = 'Acme Corp Website' AND user_id = 'YOUR_USER_ID';

