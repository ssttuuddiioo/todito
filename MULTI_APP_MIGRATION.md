# 🔄 Multi-App Migration Summary

## What Changed

Your project has been restructured to support a **shared Supabase backend** for multiple small apps. This keeps costs low while maintaining clean separation between apps.

## Changes Made

### 1. Database Schema Updates ✅

**File:** `supabase/migrations/001_initial_schema.sql`

**Changes:**
- Tables renamed with `toditox_` prefix:
  - `opportunities` → `toditox_opportunities`
  - `projects` → `toditox_projects`
- All indexes renamed with prefix (e.g., `idx_toditox_opportunities_user_id`)
- All triggers renamed with prefix (e.g., `update_toditox_opportunities_updated_at`)
- All RLS policies updated to use prefixed table names
- Added header comment explaining the app-specific schema

**Why:** Table prefixes allow multiple apps to share one Supabase project without conflicts.

---

### 2. Application Code Updates ✅

**Files Updated:**
- `src/hooks/useOpportunities.js` - Updated table name to `toditox_opportunities`
- `src/hooks/useProjects.js` - Updated table name to `toditox_projects`

**No Changes Needed:**
- ✅ Components already abstracted through hooks
- ✅ `useSupabase.js` accepts table name as parameter
- ✅ All other code works without modification

---

### 3. Seed Data Updates ✅

**File:** `supabase/seed.sql`

**Changes:**
- Updated `INSERT INTO` statements to use `toditox_opportunities` and `toditox_projects`
- Updated `UPDATE` statements to reference prefixed tables

---

### 4. Documentation Updates ✅

#### Updated Files:

**`SUPABASE_SETUP_GUIDE.md`**
- Added multi-app architecture explanation
- Updated project name reference from "opportunity-tracker" to "small-apps"
- Added notes about table prefixes throughout
- Added note about shared OAuth across apps

**`README.md`**
- Added "Architecture" section explaining multi-app strategy
- Updated "Database Schema" section with prefixed table names
- Added links to new documentation files
- Reorganized documentation section

#### New Files Created:

**`ARCHITECTURE.md`** ⭐
- Complete overview of multi-app strategy
- Visual diagram of architecture
- Table naming conventions
- Cost analysis
- When to consider alternatives
- Security and monitoring guidance

**`NEW_APP_GUIDE.md`** ⭐
- Step-by-step guide to add new apps
- Complete SQL migration template
- Hook setup examples
- Common pitfalls to avoid
- Full working examples

**`MULTI_APP_MIGRATION.md`** (this file) ⭐
- Summary of all changes
- Migration instructions
- Testing checklist

---

## Migration Instructions

### For Existing Installations

If you already have toditox running with the old schema:

#### Option 1: Fresh Start (Recommended)

1. **Drop old tables:**
   ```sql
   DROP TABLE IF EXISTS projects CASCADE;
   DROP TABLE IF EXISTS opportunities CASCADE;
   ```

2. **Run new migration:**
   - Open Supabase SQL Editor
   - Copy/paste `supabase/migrations/001_initial_schema.sql`
   - Click "Run"

3. **Restart your app:**
   ```bash
   npm run dev
   ```

#### Option 2: Rename Existing Tables

1. **Rename tables:**
   ```sql
   ALTER TABLE opportunities RENAME TO toditox_opportunities;
   ALTER TABLE projects RENAME TO toditox_projects;
   ```

2. **Rename indexes:**
   ```sql
   ALTER INDEX idx_opportunities_user_id RENAME TO idx_toditox_opportunities_user_id;
   -- (repeat for all indexes - see migration file for full list)
   ```

3. **Update RLS policies:**
   - Drop existing policies
   - Recreate with new table names (see migration file)

**Note:** Option 1 is simpler and less error-prone!

---

### For New Installations

No special steps needed! Just follow `SUPABASE_SETUP_GUIDE.md` as normal.

---

## Testing Checklist

After migration, verify everything works:

- [ ] Sign in with Google OAuth
- [ ] Create a new opportunity
- [ ] Move opportunity between pipeline stages
- [ ] Edit an opportunity
- [ ] Delete an opportunity
- [ ] Create a new project
- [ ] Change project status
- [ ] Edit a project
- [ ] Delete a project
- [ ] Check Dashboard shows correct data
- [ ] Verify data persists after page refresh
- [ ] Test on mobile device

---

## Supabase Project Naming

**Important:** When creating your Supabase project:

✅ **Do:** Name it `small-apps` (or similar)  
❌ **Don't:** Name it `opportunity-tracker` or `toditox`

**Why:** This project will serve multiple apps, so use a generic name.

---

## Adding Your Next App

Ready to add another app? Follow these steps:

1. **Read:** `NEW_APP_GUIDE.md`
2. **Choose:** A unique table prefix (e.g., `myapp_`)
3. **Create:** Migration file with prefixed tables
4. **Run:** Migration in your Supabase SQL Editor
5. **Copy:** Same `.env.local` credentials from toditox
6. **Build:** Your new app using the same patterns!

---

## Cost Breakdown

| Setup | Before | After | Savings |
|-------|--------|-------|---------|
| 1 app | $25/month | $25/month | $0 |
| 2 apps | $50/month | $25/month | $25/month |
| 3 apps | $75/month | $25/month | $50/month |
| 5 apps | $125/month | $25/month | $100/month |

**Bottom line:** More apps = more savings! 💰

---

## File Structure Summary

```
toditox/
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql    [UPDATED - prefixed tables]
│   └── seed.sql                      [UPDATED - prefixed tables]
├── src/
│   ├── hooks/
│   │   ├── useOpportunities.js       [UPDATED - table name]
│   │   └── useProjects.js            [UPDATED - table name]
│   └── [other files unchanged]
├── ARCHITECTURE.md                   [NEW - architecture overview]
├── NEW_APP_GUIDE.md                  [NEW - add more apps]
├── MULTI_APP_MIGRATION.md            [NEW - this file]
├── SUPABASE_SETUP_GUIDE.md           [UPDATED - multi-app notes]
└── README.md                         [UPDATED - architecture section]
```

---

## Rollback Instructions

If you need to revert to the old schema:

1. **Rename tables back:**
   ```sql
   ALTER TABLE toditox_opportunities RENAME TO opportunities;
   ALTER TABLE toditox_projects RENAME TO projects;
   ```

2. **Update hooks:**
   - Change `toditox_opportunities` back to `opportunities`
   - Change `toditox_projects` back to `projects`

3. **Restart app:**
   ```bash
   npm run dev
   ```

---

## Questions?

- **Architecture questions:** See `ARCHITECTURE.md`
- **Adding apps:** See `NEW_APP_GUIDE.md`
- **Setup help:** See `SUPABASE_SETUP_GUIDE.md`
- **General help:** See `README.md`

---

## Next Steps

1. ✅ Review the changes (you're doing it now!)
2. 🔧 Test your app thoroughly
3. 📚 Read `ARCHITECTURE.md` to understand the strategy
4. 🚀 Deploy your updated app
5. 📱 Build your next small app using `NEW_APP_GUIDE.md`!

---

**Migration completed on:** November 6, 2025  
**Status:** ✅ Complete  
**Breaking changes:** Table names only (abstracted in hooks)

