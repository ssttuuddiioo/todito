import { createClient } from '@supabase/supabase-js';

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';

async function refreshTokenIfNeeded(supabase, connection) {
  const expiresAt = new Date(connection.expires_at);
  const now = new Date();
  
  // Refresh if token expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return connection.access_token;
  }

  // Refresh the token
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

  // Update tokens in database
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
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const supabaseToken = authHeader.split(' ')[1];

  try {
    // Initialize Supabase client with user's token
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

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get Asana connection for user
    const { data: connection, error: connError } = await supabase
      .from('asana_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return res.status(404).json({ error: 'Asana not connected', code: 'NOT_CONNECTED' });
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(supabase, connection);

    // Fetch workspaces from Asana
    const workspacesResponse = await fetch(`${ASANA_API_BASE}/workspaces`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!workspacesResponse.ok) {
      const errorData = await workspacesResponse.json();
      console.error('Asana API error:', errorData);
      return res.status(workspacesResponse.status).json({ error: 'Failed to fetch workspaces' });
    }

    const workspacesData = await workspacesResponse.json();
    
    return res.status(200).json({
      workspaces: workspacesData.data,
      defaultWorkspaceId: connection.default_workspace_id,
    });

  } catch (err) {
    console.error('Workspaces API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

