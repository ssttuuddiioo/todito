# 🚀 Quick Start Guide

Get your Opportunity Tracker up and running in 5 minutes!

## ⚡ Fastest Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up your environment variables
# Copy .env.example to .env.local and add your Supabase credentials
cp .env.example .env.local

# 3. Edit .env.local with your Supabase project details
# (See "Get Supabase Credentials" section below)

# 4. Run the database migration in Supabase SQL Editor
# (Copy contents of supabase/migrations/001_initial_schema.sql)

# 5. (Optional) Add sample data
# (Copy contents of supabase/seed.sql and run in Supabase)

# 6. Start the dev server
npm run dev
```

## 🔑 Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Project Settings → API
4. Copy your:
   - **Project URL** → Use for `VITE_SUPABASE_URL`
   - **anon public key** → Use for `VITE_SUPABASE_ANON_KEY`

## 📁 What's Included

### ✅ Configuration Files
- `package.json` - All dependencies configured
- `vite.config.js` - Build tool with path aliases
- `tailwind.config.js` - Custom theme and styling
- `.eslintrc.cjs` - Code linting rules
- `.prettierrc` - Code formatting rules
- `jsconfig.json` - IDE path resolution

### ✅ Core Application
- `src/App.jsx` - Main application component with routing
- `src/main.jsx` - React entry point
- `src/index.css` - Global styles and Tailwind setup

### ✅ Components
- `Dashboard.jsx` - Overview with stats and metrics
- `Opportunities.jsx` - Full CRUD for opportunities
- `Projects.jsx` - Full CRUD for projects
- `QuickAdd.jsx` - Rapid entry modal
- `Navigation.jsx` - Top navigation bar
- `ui/Button.jsx` - Reusable button component
- `ui/Card.jsx` - Reusable card component
- `ui/Modal.jsx` - Reusable modal component

### ✅ Custom Hooks
- `useSupabase.js` - Generic database operations with real-time sync
- `useOpportunities.js` - Opportunity-specific operations
- `useProjects.js` - Project-specific operations
- `useCalendar.js` - Calendar and deadline utilities

### ✅ Utilities
- `lib/supabase.js` - Configured Supabase client
- `lib/utils.js` - Helper functions (formatting, dates, etc.)
- `lib/calendar.js` - Calendar and deadline utilities

### ✅ Database
- `supabase/migrations/001_initial_schema.sql` - Complete database schema
- `supabase/seed.sql` - Sample data for testing

### ✅ Documentation
- `README.md` - Complete project documentation
- `SETUP.md` - Detailed setup instructions
- `QUICKSTART.md` - This file!

## 🎯 Key Features

- **Dashboard**: Real-time overview of opportunities and projects
- **Opportunity Tracking**: Manage leads with values, deadlines, and contacts
- **Project Management**: Track project lifecycle and status
- **Quick Add**: Rapidly create opportunities or projects
- **Real-time Sync**: Automatic updates across all clients
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Status Filtering**: Filter by active, won, lost, in progress, etc.
- **Deadline Tracking**: Visual indicators for urgent deadlines
- **Value Tracking**: Monitor pipeline and project values

## 🛠️ Common Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Check for code issues
npm run format       # Format code with Prettier
```

## 📊 Database Schema

### Opportunities
- Track business opportunities and leads
- Fields: title, description, value, deadline, status, contact info
- Statuses: active, won, lost

### Projects
- Manage active and completed projects
- Fields: name, description, client, value, dates, status
- Statuses: planning, in_progress, completed, on_hold
- Can link to originating opportunity

## 🎨 Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Supabase** - Backend and real-time database
- **date-fns** - Date manipulation
- **Zod** - Type validation

## 🚢 Ready to Deploy?

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

Don't forget to add environment variables in your deployment platform!

## 📚 Need More Help?

- **Detailed Setup**: See [SETUP.md](./SETUP.md)
- **Full Documentation**: See [README.md](./README.md)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **React Docs**: [react.dev](https://react.dev)

---

**Questions?** Open an issue on GitHub or check the documentation files.

**Enjoy tracking your opportunities!** 🎉



