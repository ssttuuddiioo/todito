# 🏗️ Architecture Overview

## Multi-App Shared Supabase Strategy

This project is part of a **small-apps ecosystem** that shares a single Supabase backend to minimize costs and maximize efficiency.

### Architecture Pattern

```
┌─────────────────────────────────────────────────────┐
│                 Supabase "small-apps"               │
│                  ($35/month total)                  │
├─────────────────────────────────────────────────────┤
│  Auth (Shared)                                      │
│  ├── Google OAuth                                   │
│  └── auth.users (shared across all apps)           │
├─────────────────────────────────────────────────────┤
│  Database Tables (Prefixed by App)                  │
│  ├── toditox_opportunities                          │
│  ├── toditox_projects                               │
│  ├── myapp_users                                    │
│  ├── myapp_tasks                                    │
│  └── [future apps...]                               │
└─────────────────────────────────────────────────────┘
         ▲              ▲              ▲
         │              │              │
    ┌────┴────┐    ┌────┴────┐   ┌────┴────┐
    │ toditox │    │  myapp  │   │ app3... │
    │  (repo) │    │  (repo) │   │  (repo) │
    └─────────┘    └─────────┘   └─────────┘
```

### Benefits

✅ **Cost Effective:** One Supabase subscription serves unlimited apps  
✅ **Simple:** Each app is independent, easy to develop and deploy  
✅ **Organized:** Table prefixes keep data clearly separated  
✅ **Flexible:** Easy to migrate to monorepo or separate DBs later  
✅ **Shared Auth:** Users sign in once, access all apps  

### Table Naming Convention

| App | Prefix | Tables |
|-----|--------|--------|
| toditox | `toditox_` | `toditox_opportunities`, `toditox_projects` |
| [future] | `[app]_` | `[app]_[resource]` |

### Key Principles

1. **Always prefix tables** with the app name
2. **Always prefix indexes** with the app name
3. **Always prefix triggers** with the app name
4. **Always use RLS** to isolate user data
5. **Never hardcode table names** in components (use hooks)

### Code Structure (per app)

```
app-name/
├── src/
│   ├── lib/
│   │   └── supabase.js          # Supabase client (shared config)
│   ├── hooks/
│   │   ├── useSupabase.js       # Generic CRUD hook
│   │   └── use[Resource].js     # Resource-specific hooks
│   └── components/
│       └── [Components].jsx     # UI components
├── supabase/
│   └── migrations/
│       └── 001_[app]_schema.sql # App's database schema
├── .env.local                   # Shared Supabase credentials
└── [standard project files]
```

### Migration Strategy

**When adding a new app:**
1. Choose a unique table prefix
2. Create migration with prefixed tables
3. Run migration in shared Supabase
4. Use same credentials in `.env.local`
5. Update hooks to use prefixed table names

See `NEW_APP_GUIDE.md` for detailed instructions.

### When to Consider Alternatives

This architecture works great for:
- ✅ Small to medium apps
- ✅ Personal or side projects
- ✅ MVPs and prototypes
- ✅ Low to moderate traffic

Consider alternatives when:
- ❌ Apps grow to 100k+ active users
- ❌ Need different scaling per app
- ❌ Apps have conflicting infrastructure needs
- ❌ Team size grows beyond 5-10 developers

### Alternative Architectures

**When you outgrow this:**
1. **Monorepo:** Combine apps with shared packages (Turborepo/Nx)
2. **Separate Supabase Projects:** One per app (higher cost)
3. **Custom Backend:** Build dedicated API servers
4. **Microservices:** Full distributed architecture

### Cost Analysis

| Setup | Monthly Cost | Best For |
|-------|--------------|----------|
| Shared Supabase (this) | $25-35 | Multiple small apps |
| Separate Free Tier | $0 (limited) | 1-2 tiny apps |
| Separate Pro Plans | $25/app | Enterprise apps |
| Custom Backend | $50-500+ | High-scale apps |

### Security

Each app's data is isolated via:
- **Row Level Security (RLS):** Users only see their own data
- **Table prefixes:** Clear separation at DB level
- **Separate repos:** Code isolation
- **Shared auth:** Centralized identity management

### Monitoring

Track your apps:
1. **Supabase Dashboard:** Monitor database size, API calls
2. **Table Editor:** Inspect data per app (filter by prefix)
3. **SQL Editor:** Run analytics across apps if needed
4. **Logs:** Track errors and performance

### Documentation

- `SUPABASE_SETUP_GUIDE.md` - Initial Supabase setup
- `NEW_APP_GUIDE.md` - Adding new apps to shared backend
- `README.md` - Project overview
- `IMPLEMENTATION.md` - Technical details

---

**Last Updated:** November 2025  
**Status:** ✅ Production Ready

