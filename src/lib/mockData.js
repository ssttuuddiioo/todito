export const mockData = {
  todito_contacts: [
    {
      id: 'c1',
      name: 'Alice Johnson',
      company: 'TechStart Inc',
      email: 'alice@techstart.io',
      phone: '+1 (555) 123-4567',
      notes: 'Key decision maker. Interested in full rebrand.',
      created_at: new Date(Date.now() - 10000000).toISOString()
    },
    {
      id: 'c2',
      name: 'Bob Smith',
      company: 'Global Logistics',
      email: 'bsmith@globallog.com',
      phone: '+1 (555) 987-6543',
      notes: 'Met at conference. Needs logistics software update.',
      created_at: new Date(Date.now() - 8000000).toISOString()
    },
    {
      id: 'c3',
      name: 'Carol White',
      company: 'Creative Studio',
      email: 'carol@studio.design',
      phone: '+1 (555) 456-7890',
      notes: 'Looking for partnership opportunities.',
      created_at: new Date(Date.now() - 5000000).toISOString()
    }
  ],
  todito_opportunities: [
    {
      id: 'o1',
      name: 'TechStart Website Redesign',
      contact: 'Alice Johnson',
      value: 15000,
      stage: 'proposal',
      next_action: 'Follow up on proposal',
      due_date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
      created_at: new Date(Date.now() - 2000000).toISOString()
    },
    {
      id: 'o2',
      name: 'Logistics Dashboard V2',
      contact: 'Bob Smith',
      value: 45000,
      stage: 'negotiation',
      next_action: 'Final contract review',
      due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
      created_at: new Date(Date.now() - 4000000).toISOString()
    },
    {
      id: 'o3',
      name: 'Creative Partnership',
      contact: 'Carol White',
      value: 5000,
      stage: 'lead',
      next_action: 'Schedule intro call',
      due_date: new Date(Date.now() - 86400000).toISOString(), // Overdue
      created_at: new Date(Date.now() - 1000000).toISOString()
    }
  ],
  todito_projects: [
    {
      id: 'p1',
      name: 'Mobile App MVP',
      client: 'FastFood Co',
      deadline: new Date(Date.now() + 86400000 * 14).toISOString(),
      status: 'in_progress',
      next_milestone: 'Beta Release',
      notes: 'Focus on core ordering flow.',
      created_at: new Date(Date.now() - 10000000).toISOString()
    },
    {
      id: 'p2',
      name: 'E-commerce Integration',
      client: 'Retail Giants',
      deadline: new Date(Date.now() - 86400000 * 2).toISOString(), // Overdue
      status: 'review',
      next_milestone: 'Launch',
      notes: 'Waiting for payment gateway approval.',
      created_at: new Date(Date.now() - 15000000).toISOString()
    },
    {
      id: 'p3',
      name: 'Internal Tools Audit',
      client: 'TechStart Inc',
      deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
      status: 'in_progress',
      next_milestone: 'Report Draft',
      notes: 'Interviewing department heads.',
      created_at: new Date(Date.now() - 5000000).toISOString()
    }
  ],
  todito_invoices: [
    {
      id: 'i1',
      client_name: 'FastFood Co',
      status: 'paid',
      total_amount: 5000,
      due_date: new Date(Date.now() - 86400000 * 10).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 20).toISOString()
    },
    {
      id: 'i2',
      client_name: 'Retail Giants',
      status: 'sent',
      total_amount: 12000,
      due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      id: 'i3',
      client_name: 'TechStart Inc',
      status: 'overdue',
      total_amount: 2500,
      due_date: new Date(Date.now() - 86400000 * 3).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 15).toISOString()
    }
  ],
  todito_expenses: [
    {
      id: 'e1',
      category: 'software',
      amount: 49.99,
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      notes: 'Adobe CC Subscription',
      created_at: new Date().toISOString()
    },
    {
      id: 'e2',
      category: 'travel',
      amount: 350.00,
      date: new Date(Date.now() - 86400000 * 10).toISOString(),
      notes: 'Flight to NYC for client meeting',
      created_at: new Date().toISOString()
    },
    {
      id: 'e3',
      category: 'meals',
      amount: 85.50,
      date: new Date(Date.now() - 86400000 * 10).toISOString(),
      notes: 'Dinner with client',
      created_at: new Date().toISOString()
    }
  ],
  todito_activities: [
    {
      id: 'a1',
      type: 'call',
      notes: 'Discussed requirements for phase 2',
      date: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 'a2',
      type: 'email',
      notes: 'Sent proposal draft v1',
      date: new Date(Date.now() - 86400000 * 3).toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 'a3',
      type: 'meeting',
      notes: 'Weekly sync with dev team',
      date: new Date(Date.now() - 86400000 * 5).toISOString(),
      created_at: new Date().toISOString()
    }
  ],
  todito_tasks: [
    {
      id: 't1',
      project_id: 'p1',
      title: 'Design login screen',
      status: 'done',
      created_at: new Date().toISOString()
    },
    {
      id: 't2',
      project_id: 'p1',
      title: 'Implement authentication API',
      status: 'in_progress',
      created_at: new Date().toISOString()
    },
    {
      id: 't3',
      project_id: 'p1',
      title: 'Setup database schema',
      status: 'todo',
      created_at: new Date().toISOString()
    }
  ],
  todito_time_entries: [
    {
      id: 'te1',
      project_id: 'p1',
      hours: 2.5,
      notes: 'Designing UI components',
      date: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 'te2',
      project_id: 'p1',
      hours: 4,
      notes: 'API development',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      created_at: new Date().toISOString()
    }
  ]
};


