# 🎯 Opportunity Tracker

**Ultra-minimal web application for solo professionals to track sales opportunities and manage client projects with Google Calendar integration.**

> Zero learning curve. Mobile-optimized. Essential features only.

## Philosophy

- **Ultra-Minimal**: Only what's necessary - no bloat
- **Mobile-First**: Touch-friendly, fast, works everywhere
- **<30 Second Add**: Add opportunities or projects in under 30 seconds
- **Zero Learning Curve**: Intuitive from first use

## Features

### 📊 Dashboard ("Today's Focus")
- Overdue items highlighted
- Due today priorities
- Coming up this week
- Quick stats at a glance
- Active project overview

### 🎯 Sales Pipeline
Track opportunities through clear stages:
- **Lead** 💡 → **Proposal** 📄 → **Negotiation** 🤝 → **Won/Lost** ✅❌
- Quick stage transitions
- Next action tracking
- Due date alerts
- Pipeline value overview

### 📁 Project Management
Manage projects with simple statuses:
- **In Progress** 🚀 → **Review** 👀 → **Complete** ✅
- Client tracking
- Milestone management
- Deadline monitoring

### 📅 Google Calendar Integration
- Sync deadlines to calendar
- View today's meetings
- Automatic reminders
- Two-way sync (coming soon)

### 📱 Mobile-Optimized
- Touch-friendly interface (44px+ targets)
- Bottom navigation for easy thumb access
- PWA support (install to home screen)
- Fast loading (<3s on mobile)
- Works offline-ready

### 🔐 Secure Authentication
- Google OAuth via Supabase
- Row-Level Security
- Your data stays private

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS (mobile-first)
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Integration**: Google Calendar API
- **Deployment**: Vercel

## Architecture

This app is part of a **small-apps multi-tenant strategy** using a shared Supabase backend:
- Tables are prefixed with `toditox_` (e.g., `toditox_opportunities`, `toditox_projects`)
- Shares Supabase project with other small apps to minimize costs
- Each app isolated via table prefixes and RLS policies
- See `ARCHITECTURE.md` for full details
- See `NEW_APP_GUIDE.md` to add more apps to the shared backend

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Add your Supabase credentials to .env.local

# 3. Set up database
# Run supabase/migrations/001_initial_schema.sql in Supabase SQL Editor

# 4. Enable Google OAuth in Supabase
# Dashboard → Authentication → Providers → Google

# 5. Start dev server
npm run dev
```

Visit `http://localhost:3000` and sign in with Google!

## Project Structure

```
opportunity-tracker/
├── src/
│   ├── components/
│   │   ├── Auth.jsx              # Google OAuth login
│   │   ├── Dashboard.jsx         # Today's focus view
│   │   ├── Opportunities.jsx     # Pipeline management
│   │   ├── Projects.jsx          # Project tracking
│   │   ├── QuickAdd.jsx          # <30s add experience
│   │   └── Navigation.jsx        # Mobile-first nav
│   ├── contexts/
│   │   └── AuthContext.jsx       # Authentication state
│   ├── hooks/
│   │   ├── useOpportunities.js   # Opportunity CRUD + real-time
│   │   ├── useProjects.js        # Project CRUD + real-time
│   │   └── useSupabase.js        # Generic Supabase operations
│   ├── lib/
│   │   ├── supabase.js           # Supabase client + auth
│   │   ├── google-calendar.js    # Calendar API integration
│   │   └── utils.js              # Helper functions
│   └── index.css                 # Mobile-first styles
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql # Database schema + RLS
```

## Database Schema

**Note:** All tables are prefixed with `toditox_` as part of the multi-app architecture.

### toditox_opportunities (Sales Pipeline)
- `name` - Opportunity title
- `contact` - Client contact info
- `value` - Estimated deal value
- `stage` - lead | proposal | negotiation | won | lost
- `next_action` - What to do next
- `due_date` - Action deadline
- `notes` - Project notes
- `drive_folder_link` - Google Drive link
- `user_id` - Owner (RLS enforced)

### toditox_projects
- `name` - Project title
- `client` - Client name
- `deadline` - Project deadline
- `status` - in_progress | review | complete
- `next_milestone` - Next deliverable
- `notes` - Project notes
- `drive_folder_link` - Google Drive link
- `opportunity_id` - Optional link to originating opportunity
- `user_id` - Owner (RLS enforced)

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format
```

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Don't forget to:**
1. Add environment variables in Vercel dashboard
2. Configure Redirect URL in Supabase Auth settings
3. Add your production domain to allowed redirect URLs

### Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run migration: `supabase/migrations/001_initial_schema.sql`
3. Enable Google OAuth:
   - Go to Authentication → Providers → Google
   - Add Google OAuth credentials
   - Add authorized redirect URLs
4. Copy Project URL and anon key to `.env.local`

### Google Calendar Setup (Optional)

1. Create project in Google Cloud Console
2. Enable Google Calendar API
3. Configure OAuth consent screen
4. Add scopes: `calendar.readonly` and `calendar.events`
5. Supabase will handle OAuth flow automatically

## Mobile Optimizations

✅ Touch targets minimum 44px (iOS recommended)  
✅ No iOS zoom on input focus (16px font size)  
✅ Safe area insets for notched devices  
✅ Bottom navigation for thumb accessibility  
✅ PWA manifest for home screen installation  
✅ Fast loading (<3s on 3G)  
✅ Active states for touch feedback  

## Success Metrics

- ✅ Add opportunity/project in <30 seconds
- ✅ Dashboard shows critical info at a glance
- ✅ Mobile feels native
- ✅ Zero learning curve

## Roadmap

### Phase 1 (MVP) ✅
- [x] Basic CRUD for opportunities and projects
- [x] Simple dashboard with today's focus
- [x] Google OAuth authentication
- [x] Mobile-first responsive design

### Phase 2 (Current)
- [ ] Google Calendar two-way sync
- [ ] Swipe gestures for status changes
- [ ] Offline support with sync
- [ ] Push notifications for deadlines

### Phase 3 (Future)
- [ ] Quick filters and search
- [ ] Bulk actions
- [ ] Export to CSV
- [ ] Dark mode

## Out of Scope

These features are intentionally excluded to maintain ultra-minimal focus:

- ❌ Team collaboration
- ❌ Advanced reporting/analytics
- ❌ Custom fields
- ❌ Third-party integrations (beyond Google Calendar)
- ❌ File attachments
- ❌ Detailed time tracking
- ❌ Invoice generation

## Contributing

Contributions welcome! Please keep the ultra-minimal philosophy in mind:
- Only essential features
- Mobile-first always
- Zero learning curve
- <30 second workflows

## License

MIT License - Free to use for personal or commercial projects.

## Documentation

### Setup Guides
- 📖 [Supabase Setup Guide](./SUPABASE_SETUP_GUIDE.md) - Complete setup for toditox
- ⚡ [Quick Start Guide](./QUICKSTART.md) - Get started in 5 minutes
- 📋 [Detailed Setup](./SETUP.md) - Full setup instructions

### Architecture & Multi-App
- 🏗️ [Architecture Overview](./ARCHITECTURE.md) - Multi-app shared Supabase strategy
- 📱 [New App Guide](./NEW_APP_GUIDE.md) - Add more apps to your shared backend
- 🔧 [Implementation Details](./IMPLEMENTATION.md) - Technical deep dive

### Deployment
- ✅ [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Pre-launch checklist

## Support

- 🐛 [Report Issues](https://github.com/yourusername/opportunity-tracker/issues)

---

**Built for solo professionals who value simplicity and speed.** 🚀
