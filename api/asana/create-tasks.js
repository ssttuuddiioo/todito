import { createClient } from '@supabase/supabase-js';

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';

async function refreshTokenIfNeeded(supabase, connection) {
  const expiresAt = new Date(connection.expires_at);
  const now = new Date();
  
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return connection.access_token;
  }

  const tokenResponse = await fetch('https://app.asana.com/-/oauth_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.ASANA_CLIENT_ID,
      client_secret: process.env.ASANA_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to refresh Asana token');
  }

  const tokens = await tokenResponse.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from('asana_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: newExpiresAt,
    })
    .eq('id', connection.id);

  return tokens.access_token;
}

async function createAsanaTask(accessToken, task, projectId, workspaceId) {
  // Build notes from subtitle and description
  const notes = [task.subtitle, task.description].filter(Boolean).join('\n\n');
  
  // Build priority tag text if present
  const priorityNote = task.priority ? `Priority: ${task.priority.toUpperCase()}` : '';
  const fullNotes = [priorityNote, notes].filter(Boolean).join('\n\n');

  const taskData = {
    data: {
      name: task.title,
      notes: fullNotes || undefined,
      workspace: workspaceId,
      projects: [projectId],
    },
  };

  // Add due date if present (Asana expects YYYY-MM-DD format)
  if (task.due_date) {
    taskData.data.due_on = task.due_date;
  }

  const response = await fetch(`${ASANA_API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Asana task creation error:', errorData);
    throw new Error(errorData.errors?.[0]?.message || 'Failed to create task');
  }

  return response.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const supabaseToken = authHeader.split(' ')[1];
  const { tasks, project_id, workspace_id, save_defaults } = req.body;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: 'tasks array is required' });
  }

  if (!project_id || !workspace_id) {
    return res.status(400).json({ error: 'project_id and workspace_id are required' });
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${supabaseToken}`,
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: connection, error: connError } = await supabase
      .from('asana_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return res.status(404).json({ error: 'Asana not connected', code: 'NOT_CONNECTED' });
    }

    const accessToken = await refreshTokenIfNeeded(supabase, connection);

    // Save defaults if requested
    if (save_defaults) {
      await supabase
        .from('asana_connections')
        .update({
          default_workspace_id: workspace_id,
          default_project_id: project_id,
        })
        .eq('id', connection.id);
    }

    // Create tasks sequentially to respect rate limits
    const results = [];
    const errors = [];

    for (const task of tasks) {
      try {
        const result = await createAsanaTask(accessToken, task, project_id, workspace_id);
        results.push({
          todito_title: task.title,
          asana_task: result.data,
          success: true,
        });
      } catch (err) {
        errors.push({
          todito_title: task.title,
          error: err.message,
          success: false,
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return res.status(200).json({
      created: results.length,
      failed: errors.length,
      results,
      errors,
    });

  } catch (err) {
    console.error('Create tasks API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

