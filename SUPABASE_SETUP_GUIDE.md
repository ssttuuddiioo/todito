# 🚀 Supabase Setup Guide - Small Apps Multi-Tenant

This guide sets up a **shared Supabase project** for multiple small apps. Each app uses table prefixes (e.g., `toditox_`, `otherapp_`) to keep data organized in one database.

**Architecture:** Separate repos + Shared Supabase ($35/month total)

## Step 1: Create Supabase Account & Project (5 minutes)

### 1.1 Sign Up
1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email

### 1.2 Create New Project
1. Once logged in, click **"New Project"**
2. Fill in the details:
   - **Name**: `small-apps` (shared backend for all your small apps)
   - **Database Password**: Create a strong password
     - ⚠️ **IMPORTANT**: Save this password! You'll need it later
     - Example: `MyStrong@Pass2024!`
   - **Region**: Select closest to you (e.g., US East, EU West)
   - **Pricing Plan**: Free tier is perfect for getting started
3. Click **"Create new project"**
4. Wait 2-3 minutes for your project to be created ⏳

**Note:** This single Supabase project will serve all your small apps. Each app will have its own tables with prefixes.

---

## Step 2: Get Your Supabase Credentials

### 2.1 Find Your Project URL and API Key
1. In your Supabase project dashboard, click the **"Settings"** icon (⚙️) in the sidebar
2. Click **"API"** in the settings menu
3. You'll see two important values:

   **Project URL** (looks like):
   ```
   https://abcdefghijklmnop.supabase.co
   ```

   **anon/public key** (a long JWT token):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
   ```

4. **COPY BOTH** - you'll need them in the next step

---

## Step 3: Add Credentials to Your App

### 3.1 Create .env.local File
In your project root (`/Users/pablognecco/Dropbox (Personal)/Studio/Cursor/toditox/`), create a file named `.env.local`

**File: `.env.local`**
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

### 3.2 Replace Placeholders
- Replace `YOUR_PROJECT_REF.supabase.co` with your actual **Project URL**
- Replace `YOUR_ANON_KEY_HERE` with your actual **anon/public key**

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

⚠️ **IMPORTANT**: 
- No quotes around values
- No trailing spaces
- Save the file

---

## Step 4: Set Up Database Schema

### 4.1 Open SQL Editor
1. In Supabase dashboard, click **"SQL Editor"** in the sidebar
2. Click **"New query"** button

### 4.2 Copy Migration SQL
1. On your computer, open: `supabase/migrations/001_initial_schema.sql`
2. **Copy ALL the contents** (the entire file)

### 4.3 Run Migration
1. Paste the SQL into the Supabase SQL Editor
2. Click **"Run"** button (or press `Cmd/Ctrl + Enter`)
3. You should see: ✅ **"Success. No rows returned"**

This creates:
- ✅ `toditox_opportunities` table with pipeline stages (prefixed!)
- ✅ `toditox_projects` table with status tracking (prefixed!)
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Your new `notes` and `drive_folder_link` fields!

**Note:** Tables are prefixed with `toditox_` to keep them separate from future apps. When you add another app, you'll use a different prefix (e.g., `myapp_users`, `myapp_tasks`).

### 4.4 Verify Database
1. Click **"Table Editor"** in the sidebar
2. You should see two tables:
   - `toditox_opportunities`
   - `toditox_projects`
3. Click each table to inspect the columns

---

## Step 5: Enable Google OAuth

### 5.1 Create Google OAuth Credentials

#### A. Go to Google Cloud Console
1. Visit [https://console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with your Google account

#### B. Create/Select Project
1. Click the project dropdown at the top
2. Click **"New Project"**
3. Name it: `opportunity-tracker`
4. Click **"Create"**
5. Wait a moment, then select your new project

#### C. Configure OAuth Consent Screen
1. In the left sidebar, go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** user type
3. Click **"Create"**
4. Fill in the form:
   - **App name**: `Opportunity Tracker`
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click **"Save and Continue"**
6. **Scopes**: Click **"Save and Continue"** (no additional scopes needed for basic auth)
7. **Test users**: Click **"Save and Continue"**
8. Review and click **"Back to Dashboard"**

#### D. Create OAuth 2.0 Client ID
1. In the left sidebar, go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth 2.0 Client ID"**
3. **Application type**: Select **"Web application"**
4. **Name**: `Opportunity Tracker Web Client`
5. **Authorized JavaScript origins**: Leave empty for now
6. **Authorized redirect URIs**: Click **"+ Add URI"**
   
   Add this URI (replace `YOUR_PROJECT_REF` with your actual Supabase project ref):
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   
   **Example:**
   ```
   https://abcdefghijklmnop.supabase.co/auth/v1/callback
   ```

7. Click **"Create"**
8. **COPY both**:
   - **Client ID** (looks like: `123456789-abc...xyz.apps.googleusercontent.com`)
   - **Client Secret** (looks like: `GOCSPX-abc...xyz`)

### 5.2 Configure Google OAuth in Supabase

1. Go back to your **Supabase dashboard**
2. Click **"Authentication"** in the sidebar
3. Click **"Providers"** tab
4. Find **"Google"** and click to expand
5. Toggle **"Enable Sign in with Google"** to ON
6. Paste your credentials:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)
7. Click **"Save"**

**Note:** This OAuth setup is shared across all apps using this Supabase project. Users authenticate once and can access all your apps.

---

## Step 6: Disable Demo Mode & Restart

### 6.1 Turn Off Demo Mode
The app is currently in demo mode. Let's disable it:

1. Open `src/App.jsx`
2. Find this line (around line 14):
   ```javascript
   const DEMO_MODE = true;
   ```
3. Change it to:
   ```javascript
   const DEMO_MODE = false;
   ```
4. Save the file

### 6.2 Restart the Dev Server
1. In your terminal, press `Ctrl+C` to stop the server
2. Run:
   ```bash
   npm run dev
   ```
3. The app will reload at `http://localhost:3000`

---

## Step 7: Test Everything! 🎉

### 7.1 Sign In
1. Open `http://localhost:3000` in your browser
2. You should see the **Google OAuth sign-in screen**
3. Click **"Continue with Google"**
4. Select your Google account
5. Grant permissions
6. You should be redirected back to the app

### 7.2 Test Quick Add
1. Click **"+ Quick Add"** button
2. Select **"Opportunity"**
3. Fill in:
   - Name: `Test Opportunity`
   - Contact: `test@example.com`
   - Value: `5000`
   - **Notes**: `This is a test note`
   - **Drive Link**: `https://drive.google.com/drive/folders/test`
4. Click **"Add Opportunity"**
5. You should see it appear in the Dashboard!

### 7.3 Test Pipeline View
1. Click **"Pipeline"** tab
2. You should see your opportunity in the **"Lead"** column
3. Try moving it to **"Proposal"** by clicking the stage transition button

### 7.4 Test Projects
1. Click **"Projects"** tab
2. Click **"+ Add"**
3. Create a test project
4. Verify it appears in the list

---

## Troubleshooting

### "Error: Missing Supabase environment variables"
- Make sure `.env.local` exists in project root
- Check there are no typos in variable names
- Restart the dev server after creating `.env.local`

### "User already registered" or OAuth errors
- Make sure redirect URI in Google Cloud Console matches exactly:
  `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- Check that Google OAuth is enabled in Supabase
- Try signing in with a different Google account

### Can't see data after signing in
- Check browser console for errors (F12 → Console tab)
- Verify database migration ran successfully (check Table Editor)
- Make sure RLS policies were created (they're in the migration)

### "Row Level Security policy violation"
- The migration includes RLS policies
- Make sure you're signed in
- If you ran the seed data, it won't show because it uses a placeholder user_id

---

## Optional: Add Sample Data

If you want to add sample data to test with:

1. **First**: Sign in to the app to create your user account
2. **Get your User ID**:
   - In Supabase dashboard → **Authentication** → **Users**
   - Copy your **User ID** (UUID)
3. **Update seed file**:
   - Open `supabase/seed.sql`
   - Replace all instances of `'YOUR_USER_ID'` with your actual User ID
4. **Run seed**:
   - Go to Supabase SQL Editor
   - Paste the updated seed.sql contents
   - Click Run

---

## 🎉 Success!

You now have a fully working Opportunity Tracker with:

✅ Google OAuth authentication  
✅ Secure user-based data  
✅ Real-time updates  
✅ Notes field  
✅ Drive folder links  
✅ Sales pipeline  
✅ Project management  

**Multi-App Architecture:**
✅ Tables prefixed with `toditox_` for easy organization  
✅ Shared Supabase project ready for more apps  
✅ One cost ($35/month) for unlimited small apps  

---

## Next Steps

1. **Try the mobile experience**: Open on your phone
2. **Customize colors**: Edit `tailwind.config.js`
3. **Add Calendar sync**: Follow instructions in `README.md`
4. **Deploy to production**: Follow `DEPLOYMENT_CHECKLIST.md`
5. **Add another app**: Follow `NEW_APP_GUIDE.md`

Need help? Check the other documentation files:
- `README.md` - Project overview
- `SETUP.md` - Detailed setup guide
- `IMPLEMENTATION.md` - Technical details
- `NEW_APP_GUIDE.md` - How to add another app to your Supabase

---

**Enjoy your new opportunity tracker!** 🚀



