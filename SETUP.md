# Complete Setup Guide

This guide walks you through setting up the **Opportunity Tracker** from scratch with Google OAuth and Calendar integration.

## Prerequisites

- Node.js 18+ installed
- A Google account
- A Supabase account (free tier works great)

## Step 1: Clone and Install

```bash
# Navigate to project directory
cd opportunity-tracker

# Install all dependencies
npm install
```

This installs React, Vite, Tailwind CSS, Supabase client, and other dependencies.

## Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/log in
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `opportunity-tracker` (or your choice)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Select closest to you
   - **Plan**: Free tier is perfect
4. Click "Create new project" and wait ~2 minutes

## Step 3: Enable Google OAuth

### In Google Cloud Console:

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
5. Configure OAuth consent screen if prompted:
   - User Type: External
   - App name: Opportunity Tracker
   - User support email: Your email
   - Developer contact: Your email
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: Opportunity Tracker
   - Authorized redirect URIs:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```
   - (Replace YOUR_PROJECT_REF with your actual Supabase project reference)
7. Copy **Client ID** and **Client Secret**

### In Supabase Dashboard:

1. Go to **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Toggle **"Enabled"**
4. Paste your **Client ID** and **Client Secret**
5. Click **"Save"**

## Step 4: Configure Environment Variables

1. Copy the example env file:
```bash
cp .env.example .env.local
```

2. Get your Supabase credentials:
   - In Supabase dashboard, go to **Settings** → **API**
   - Copy **Project URL** (looks like `https://xxxxx.supabase.co`)
   - Copy **anon/public** key (the long JWT token)

3. Edit `.env.local`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 5: Set Up Database Schema

1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open `supabase/migrations/001_initial_schema.sql` in your code editor
4. Copy the entire contents
5. Paste into the Supabase SQL Editor
6. Click **"Run"** (or Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

This creates:
- `opportunities` table with pipeline stages
- `projects` table with status tracking
- User-based Row Level Security (RLS)
- Indexes for performance
- Auto-updating timestamps

### Verify Database Setup

1. Click **Table Editor** in Supabase sidebar
2. You should see two tables:
   - `opportunities`
   - `projects`
3. Click on each to inspect the schema

## Step 6: (Optional) Add Sample Data

⚠️ **Note**: Sample data requires a valid user_id. Two options:

### Option A: Add data through the UI (Recommended)
1. Complete steps 7-9 below
2. Sign in to the app
3. Use the UI to add your first opportunities and projects

### Option B: Manually run seed with your user_id
1. Sign in to the app first (complete steps 7-9)
2. In Supabase, go to **Authentication** → **Users**
3. Copy your User ID (UUID)
4. Open `supabase/seed.sql`
5. Replace all instances of `'YOUR_USER_ID'` with your actual ID
6. Run in SQL Editor

## Step 7: Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:3000`

## Step 8: Sign In

1. Click **"Continue with Google"**
2. Select your Google account
3. Grant permissions
4. You'll be redirected back to the app
5. You're in! 🎉

## Step 9: Test the Application

Try these workflows:

1. **Quick Add an Opportunity** (Goal: <30 seconds)
   - Click "Quick Add" button
   - Select "Opportunity"
   - Enter name and contact
   - Click "Add Opportunity"
   - ✅ Check if it appears on Dashboard

2. **Move Through Pipeline**
   - Go to "Pipeline" tab
   - Find your opportunity in "Lead" column
   - Click "Move to Proposal →"
   - ✅ Verify it moved to Proposal column

3. **Add a Project**
   - Click "Projects" tab
   - Click "+ Add"
   - Fill in project details
   - ✅ Verify it appears in projects list

4. **Mobile Experience**
   - Open dev tools (F12)
   - Toggle device toolbar (Cmd+Shift+M / Ctrl+Shift+M)
   - Select iPhone/Android device
   - ✅ Check bottom navigation works
   - ✅ Test touch targets feel natural

## Optional: Google Calendar Integration

### Step 1: Enable Calendar API

1. In Google Cloud Console
2. Go to **APIs & Services** → **Library**
3. Search for "Google Calendar API"
4. Click **"Enable"**

### Step 2: Add Calendar Scopes

1. In Google Cloud Console → OAuth consent screen
2. Click **"Edit App"**
3. Go to **Scopes** section
4. Click **"Add or Remove Scopes"**
5. Search and add:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
6. Save and continue

### Step 3: Update Supabase OAuth Scopes

1. In Supabase dashboard
2. Go to **Authentication** → **Providers** → **Google**
3. In **Scopes** field, add:
   ```
   https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events
   ```
4. Save

### Step 4: Re-authenticate

1. Sign out of the app
2. Sign in again
3. Grant calendar permissions
4. Calendar sync is now active!

## Troubleshooting

### "Missing Supabase environment variables"

**Problem**: `.env.local` file doesn't exist or has incorrect values.

**Solution**:
1. Verify `.env.local` exists in project root
2. Check values are correct (no quotes, no trailing spaces)
3. Restart dev server after changing `.env.local`

### "Authentication error" or redirect issues

**Problem**: OAuth redirect URLs don't match.

**Solution**:
1. In Supabase: **Authentication** → **URL Configuration**
2. Add your development URL: `http://localhost:3000`
3. In Google Cloud Console, verify redirect URI matches:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

### "Row Level Security policy violation"

**Problem**: Database policies not set up correctly or user not authenticated.

**Solution**:
1. Verify migration ran successfully (check Table Editor)
2. Make sure you're signed in
3. Check browser console for detailed error
4. Re-run migration if needed

### Can't see data in database

**Problem**: RLS policies are working correctly (only showing your data).

**Solution**: This is expected! Each user only sees their own opportunities and projects. Sign in to see your data.

### "Network request failed" when signing in

**Problem**: Google OAuth not configured properly.

**Solutions**:
1. Verify Google OAuth is enabled in Supabase
2. Check Client ID and Secret are correct
3. Verify redirect URI matches exactly
4. Try clearing browser cache and cookies

### Mobile: Input zooms in on focus (iOS)

**Problem**: Input fields have font size <16px.

**Solution**: This is already fixed in the project! All inputs use 16px+ font size. If you modify input styles, maintain minimum 16px font size.

### Modal won't close on mobile

**Problem**: Touch events not registering.

**Solution**: Make sure you're clicking the X button or Cancel button, not the overlay. The overlay click is intentionally disabled on mobile for better UX.

## Mobile Testing

### Test on Real Device

1. Find your local IP:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

2. Update Vite config to allow network access:
   ```javascript
   // vite.config.js
   server: {
     host: '0.0.0.0',
     port: 3000,
   }
   ```

3. On your mobile device:
   - Connect to same WiFi
   - Open browser
   - Visit `http://YOUR_IP:3000`

### Install as PWA

#### iOS (Safari):
1. Tap Share button
2. Tap "Add to Home Screen"
3. Tap "Add"

#### Android (Chrome):
1. Tap menu (⋮)
2. Tap "Install app" or "Add to Home Screen"
3. Tap "Install"

## Performance Checks

Run Lighthouse audit:

1. Open Chrome DevTools (F12)
2. Go to **Lighthouse** tab
3. Select **Mobile**
4. Click **"Analyze page load"**

Target scores:
- **Performance**: 90+
- **Accessibility**: 90+
- **Best Practices**: 90+
- **SEO**: 90+

## Production Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Configure:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Click "Deploy"

### Update OAuth Settings

After deployment:

1. **In Supabase**:
   - Go to **Authentication** → **URL Configuration**
   - Add your Vercel domain to Site URL and Redirect URLs

2. **In Google Cloud Console**:
   - Add your Vercel domain to Authorized redirect URIs:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```

## Next Steps

- Customize branding in `tailwind.config.js`
- Add your logo/icon
- Invite users (if building for team)
- Set up custom domain
- Enable analytics if needed

## Getting Help

- Check [README.md](./README.md) for project overview
- Review [QUICKSTART.md](./QUICKSTART.md) for quick reference
- Check Supabase docs: [supabase.com/docs](https://supabase.com/docs)
- Google OAuth docs: [developers.google.com/identity](https://developers.google.com/identity)

---

**You're all set!** Start tracking opportunities and managing projects. 🎯
