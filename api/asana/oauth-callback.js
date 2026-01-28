import { createClient } from '@supabase/supabase-js';

const ASANA_TOKEN_URL = 'https://app.asana.com/-/oauth_token';
const ASANA_USER_URL = 'https://app.asana.com/api/1.0/users/me';

export default async function handler(req, res) {
  // Only allow GET requests (OAuth redirect)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error: oauthError } = req.query;

  // Handle OAuth errors
  if (oauthError) {
    console.error('OAuth error from Asana:', oauthError);
    return res.redirect(`/?asana_error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return res.redirect('/?asana_error=missing_code');
  }

  // Validate state contains user session token
  if (!state) {
    return res.redirect('/?asana_error=missing_state');
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
      return res.redirect(`/?asana_error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, token_type } = tokens;

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Fetch Asana user info
    const userResponse = await fetch(ASANA_USER_URL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    let asanaUser = null;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      asanaUser = userData.data;
    }

    // Initialize Supabase client with service role for server-side operations
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Parse user_id from state (we pass it during OAuth initiation)
    const userId = state;

    // Upsert the connection (insert or update if exists)
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
      return res.redirect(`/?asana_error=database_error`);
    }

    // Redirect back to app with success
    return res.redirect('/?asana_connected=true');

  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.redirect(`/?asana_error=server_error`);
  }
}


