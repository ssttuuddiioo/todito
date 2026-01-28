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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { workspace_id } = req.query;
  if (!workspace_id) {
    return res.status(400).json({ error: 'workspace_id is required' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const supabaseToken = authHeader.split(' ')[1];

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

    // Fetch projects from Asana workspace
    const projectsResponse = await fetch(
      `${ASANA_API_BASE}/workspaces/${workspace_id}/projects?opt_fields=name,archived,color`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!projectsResponse.ok) {
      const errorData = await projectsResponse.json();
      console.error('Asana API error:', errorData);
      return res.status(projectsResponse.status).json({ error: 'Failed to fetch projects' });
    }

    const projectsData = await projectsResponse.json();
    
    // Filter out archived projects
    const activeProjects = projectsData.data.filter(p => !p.archived);

    return res.status(200).json({
      projects: activeProjects,
      defaultProjectId: connection.default_project_id,
    });

  } catch (err) {
    console.error('Projects API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


