import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ============================================
// Anthropic API Proxy
// ============================================

const apiKey = process.env.VITE_ANTHROPIC_API_KEY;

if (!apiKey) {
  console.warn('⚠️ VITE_ANTHROPIC_API_KEY not found - AI notes parsing will not work');
}

const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

app.post('/api/anthropic/messages', async (req, res) => {
  if (!anthropic) {
    return res.status(500).json({ error: 'Anthropic API not configured' });
  }
  
  try {
    const { model, max_tokens, system, messages } = req.body;

    const response = await anthropic.messages.create({
      model: model || 'claude-3-haiku-20240307',
      max_tokens: max_tokens || 4096,
      system,
      messages,
    });

    res.json(response);
  } catch (error) {
    console.error('Anthropic API error:', error);
    const statusCode = error.status || error.statusCode || 500;
    const errorMessage = error.message || error.error?.message || 'An error occurred while processing the request';
    res.status(statusCode).json({
      error: errorMessage,
      type: 'error',
      details: error.error || error,
    });
  }
});

// ============================================
// Asana OAuth & API Proxy
// ============================================

const ASANA_TOKEN_URL = 'https://app.asana.com/-/oauth_token';
const ASANA_API_BASE = 'https://app.asana.com/api/1.0';

// Initialize Supabase clients
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Helper: Refresh token if needed
async function refreshTokenIfNeeded(supabase, connection) {
  const expiresAt = new Date(connection.expires_at);
  const now = new Date();
  
  // Refresh if token expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return connection.access_token;
  }

  console.log('🔄 Refreshing Asana token...');

  const tokenResponse = await fetch(ASANA_TOKEN_URL, {
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

// Helper: Get user and connection from auth header
async function getUserAndConnection(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { status: 401, message: 'Missing authorization header' };
  }

  const supabaseToken = authHeader.split(' ')[1];

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseToken}`,
      },
    },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw { status: 401, message: 'Unauthorized' };
  }

  const { data: connection, error: connError } = await supabase
    .from('asana_connections')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (connError && connError.code !== 'PGRST116') {
    console.error('Error fetching connection:', connError);
  }

  return { supabase, user, connection };
}

// OAuth Callback
app.get('/api/asana/oauth-callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    console.error('OAuth error from Asana:', oauthError);
    return res.redirect(`http://localhost:3090/?asana_error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return res.redirect('http://localhost:3090/?asana_error=missing_code');
  }

  if (!state) {
    return res.redirect('http://localhost:3090/?asana_error=missing_state');
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(ASANA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ASANA_CLIENT_ID,
        client_secret: process.env.ASANA_CLIENT_SECRET,
        redirect_uri: process.env.ASANA_REDIRECT_URI,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return res.redirect('http://localhost:3090/?asana_error=token_exchange_failed');
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, token_type } = tokens;

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Fetch Asana user info
    const userResponse = await fetch(`${ASANA_API_BASE}/users/me`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    let asanaUser = null;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      asanaUser = userData.data;
    }

    // Use service role key for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userId = state;

    // Upsert the connection
    const { error: dbError } = await supabase
      .from('asana_connections')
      .upsert({
        user_id: userId,
        access_token,
        refresh_token,
        token_type: token_type || 'bearer',
        expires_at: expiresAt,
        asana_user_id: asanaUser?.gid || null,
        asana_user_name: asanaUser?.name || null,
        asana_user_email: asanaUser?.email || null,
      }, {
        onConflict: 'user_id',
      });

    if (dbError) {
      console.error('Database error storing tokens:', dbError);
      return res.redirect('http://localhost:3090/?asana_error=database_error');
    }

    console.log('✅ Asana connected successfully for user:', userId);
    return res.redirect('http://localhost:3090/?asana_connected=true');

  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.redirect('http://localhost:3090/?asana_error=server_error');
  }
});

// Get Workspaces
app.get('/api/asana/workspaces', async (req, res) => {
  try {
    const { supabase, connection } = await getUserAndConnection(req);

    if (!connection) {
      return res.status(404).json({ error: 'Asana not connected', code: 'NOT_CONNECTED' });
    }

    const accessToken = await refreshTokenIfNeeded(supabase, connection);

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
    
    return res.json({
      workspaces: workspacesData.data,
      defaultWorkspaceId: connection.default_workspace_id,
    });

  } catch (err) {
    console.error('Workspaces API error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
});

// Get Projects
app.get('/api/asana/projects', async (req, res) => {
  const { workspace_id } = req.query;
  
  if (!workspace_id) {
    return res.status(400).json({ error: 'workspace_id is required' });
  }

  try {
    const { supabase, connection } = await getUserAndConnection(req);

    if (!connection) {
      return res.status(404).json({ error: 'Asana not connected', code: 'NOT_CONNECTED' });
    }

    const accessToken = await refreshTokenIfNeeded(supabase, connection);

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
    const activeProjects = projectsData.data.filter(p => !p.archived);

    return res.json({
      projects: activeProjects,
      defaultProjectId: connection.default_project_id,
    });

  } catch (err) {
    console.error('Projects API error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
});

// Create Tasks
app.post('/api/asana/create-tasks', async (req, res) => {
  const { tasks, project_id, workspace_id, save_defaults } = req.body;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: 'tasks array is required' });
  }

  if (!project_id || !workspace_id) {
    return res.status(400).json({ error: 'project_id and workspace_id are required' });
  }

  try {
    const { supabase, connection } = await getUserAndConnection(req);

    if (!connection) {
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

    // Create tasks
    const results = [];
    const errors = [];

    for (const task of tasks) {
      try {
        const notes = [task.notes].filter(Boolean).join('\n\n');

        const taskData = {
          data: {
            name: task.title,
            notes: notes || undefined,
            workspace: workspace_id,
            projects: [project_id],
          },
        };

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
          throw new Error(errorData.errors?.[0]?.message || 'Failed to create task');
        }

        const result = await response.json();
        results.push({
          todito_title: task.title,
          asana_task: result.data,
          success: true,
        });

        console.log(`✅ Created Asana task: ${task.title}`);
      } catch (err) {
        errors.push({
          todito_title: task.title,
          error: err.message,
          success: false,
        });
        console.error(`❌ Failed to create task "${task.title}":`, err.message);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return res.json({
      created: results.length,
      failed: errors.length,
      results,
      errors,
    });

  } catch (err) {
    console.error('Create tasks API error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
});

// ============================================
// Frame.io OAuth & API Proxy
// ============================================

const FRAMEIO_TOKEN_URL = 'https://applications.frame.io/oauth2/token';
const FRAMEIO_API_BASE = 'https://api.frame.io/v2';

// Get the frontend URL based on environment
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3090';

// OAuth Callback for Frame.io
app.get('/api/frameio/oauth-callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    console.error('OAuth error from Frame.io:', oauthError);
    return res.redirect(`${FRONTEND_URL}/?frameio_error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/?frameio_error=missing_code`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(FRAMEIO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.FRAMEIO_CLIENT_ID,
        client_secret: process.env.FRAMEIO_CLIENT_SECRET,
        redirect_uri: process.env.FRAMEIO_REDIRECT_URI,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Frame.io token exchange failed:', errorData);
      return res.redirect(`${FRONTEND_URL}/?frameio_error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    console.log('✅ Frame.io connected successfully');
    
    // Redirect back with tokens in URL (will be stored in localStorage by frontend)
    const redirectUrl = new URL(FRONTEND_URL);
    redirectUrl.searchParams.set('frameio_connected', 'true');
    redirectUrl.searchParams.set('frameio_access_token', access_token);
    if (refresh_token) {
      redirectUrl.searchParams.set('frameio_refresh_token', refresh_token);
    }
    redirectUrl.searchParams.set('frameio_expires_at', expiresAt);
    
    return res.redirect(redirectUrl.toString());

  } catch (err) {
    console.error('Frame.io OAuth callback error:', err);
    return res.redirect(`${FRONTEND_URL}/?frameio_error=server_error`);
  }
});

// Get current Frame.io user
app.get('/api/frameio/me', async (req, res) => {
  const frameioToken = req.headers['x-frameio-token'];
  
  if (!frameioToken) {
    return res.status(401).json({ error: 'Missing Frame.io token' });
  }

  try {
    const response = await fetch(`${FRAMEIO_API_BASE}/me`, {
      headers: {
        Authorization: `Bearer ${frameioToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Failed to fetch user' });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('Frame.io /me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get asset details
app.get('/api/frameio/assets/:assetId', async (req, res) => {
  const { assetId } = req.params;
  const frameioToken = req.headers['x-frameio-token'];
  
  if (!frameioToken) {
    return res.status(401).json({ error: 'Missing Frame.io token' });
  }

  try {
    const response = await fetch(`${FRAMEIO_API_BASE}/assets/${assetId}`, {
      headers: {
        Authorization: `Bearer ${frameioToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Failed to fetch asset' });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('Frame.io asset error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comments for an asset
app.get('/api/frameio/assets/:assetId/comments', async (req, res) => {
  const { assetId } = req.params;
  const frameioToken = req.headers['x-frameio-token'];
  
  if (!frameioToken) {
    return res.status(401).json({ error: 'Missing Frame.io token' });
  }

  try {
    const response = await fetch(`${FRAMEIO_API_BASE}/assets/${assetId}/comments`, {
      headers: {
        Authorization: `Bearer ${frameioToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Failed to fetch comments' });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('Frame.io comments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get review link details
app.get('/api/frameio/review-links/:reviewLinkId', async (req, res) => {
  const { reviewLinkId } = req.params;
  const frameioToken = req.headers['x-frameio-token'];
  
  if (!frameioToken) {
    return res.status(401).json({ error: 'Missing Frame.io token' });
  }

  try {
    const response = await fetch(`${FRAMEIO_API_BASE}/review_links/${reviewLinkId}`, {
      headers: {
        Authorization: `Bearer ${frameioToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Failed to fetch review link' });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('Frame.io review link error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// Monday.com OAuth & API Proxy
// ============================================

const MONDAY_TOKEN_URL = 'https://auth.monday.com/oauth2/token';
const MONDAY_API_URL = 'https://api.monday.com/v2';

// OAuth Callback for Monday.com
app.get('/api/monday/oauth-callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    console.error('OAuth error from Monday.com:', oauthError);
    return res.redirect(`${FRONTEND_URL}/?monday_error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/?monday_error=missing_code`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(MONDAY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MONDAY_CLIENT_ID,
        client_secret: process.env.MONDAY_CLIENT_SECRET,
        redirect_uri: process.env.MONDAY_REDIRECT_URI,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Monday.com token exchange failed:', errorData);
      return res.redirect(`${FRONTEND_URL}/?monday_error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    const { access_token } = tokens;

    console.log('✅ Monday.com connected successfully');
    
    // Redirect back with token in URL (will be stored in localStorage by frontend)
    const redirectUrl = new URL(FRONTEND_URL);
    redirectUrl.searchParams.set('monday_connected', 'true');
    redirectUrl.searchParams.set('monday_access_token', access_token);
    
    return res.redirect(redirectUrl.toString());

  } catch (err) {
    console.error('Monday.com OAuth callback error:', err);
    return res.redirect(`${FRONTEND_URL}/?monday_error=server_error`);
  }
});

// Monday.com GraphQL proxy
app.post('/api/monday/graphql', async (req, res) => {
  const mondayToken = req.headers['x-monday-token'];
  
  if (!mondayToken) {
    return res.status(401).json({ error: 'Missing Monday.com token' });
  }

  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Missing GraphQL query' });
  }

  try {
    const response = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: mondayToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.error_message || 'GraphQL request failed' });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('Monday.com GraphQL error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST /api/anthropic/messages - AI parsing');
  console.log('  GET  /api/asana/oauth-callback - OAuth redirect');
  console.log('  GET  /api/asana/workspaces - List workspaces');
  console.log('  GET  /api/asana/projects - List projects');
  console.log('  POST /api/asana/create-tasks - Create tasks');
  console.log('  GET  /api/frameio/oauth-callback - Frame.io OAuth redirect');
  console.log('  GET  /api/frameio/me - Frame.io user info');
  console.log('  GET  /api/frameio/assets/:id - Frame.io asset details');
  console.log('  GET  /api/frameio/assets/:id/comments - Frame.io comments');
  console.log('  GET  /api/monday/oauth-callback - Monday.com OAuth redirect');
  console.log('  POST /api/monday/graphql - Monday.com GraphQL proxy');
  console.log('');
  
  if (process.env.ASANA_CLIENT_ID) {
    console.log('✅ Asana OAuth configured');
  } else {
    console.log('⚠️  Asana OAuth not configured (add ASANA_CLIENT_ID to .env.local)');
  }
  
  if (process.env.FRAMEIO_CLIENT_ID) {
    console.log('✅ Frame.io OAuth configured');
  } else {
    console.log('⚠️  Frame.io OAuth not configured (add FRAMEIO_CLIENT_ID to .env.local)');
  }
  
  if (process.env.MONDAY_CLIENT_ID) {
    console.log('✅ Monday.com OAuth configured');
  } else {
    console.log('⚠️  Monday.com OAuth not configured (add MONDAY_CLIENT_ID to .env.local)');
  }
});
