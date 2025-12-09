# 🚀 Deployment Checklist

Use this checklist to ensure your Opportunity Tracker is production-ready.

## Pre-Deployment

### ✅ Development Setup Complete
- [ ] `npm install` runs without errors
- [ ] `.env.local` configured with Supabase credentials
- [ ] Database migration ran successfully
- [ ] Can sign in with Google OAuth
- [ ] Can create opportunities
- [ ] Can create projects
- [ ] Real-time updates work
- [ ] No console errors

### ✅ Supabase Configuration
- [ ] Project created
- [ ] Database schema deployed (`001_initial_schema.sql`)
- [ ] RLS policies active
- [ ] Google OAuth enabled and configured
- [ ] Auth redirect URLs include production domain
- [ ] API keys copied to deployment platform

### ✅ Google OAuth Setup
- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] OAuth Client ID created
- [ ] Authorized redirect URIs include:
  - Development: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
  - Production: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- [ ] Client ID and Secret added to Supabase

### ✅ Google Calendar (Optional)
- [ ] Calendar API enabled in Google Cloud Console
- [ ] Calendar scopes added to OAuth consent screen
- [ ] Calendar scopes added to Supabase Google provider

## Vercel Deployment

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Step 2: Connect to Vercel
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Click "Import Project"
- [ ] Select your GitHub repository
- [ ] Framework Preset: **Vite** (auto-detected)
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Install Command: `npm install`

### Step 3: Environment Variables
Add in Vercel dashboard (Settings → Environment Variables):

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

- [ ] Environment variables added
- [ ] Applied to: Production, Preview, Development

### Step 4: Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete (~2-3 minutes)
- [ ] Deployment successful

### Step 5: Update OAuth Settings

**In Supabase Dashboard:**
1. Go to Authentication → URL Configuration
2. Add your Vercel URLs:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: Add `https://your-app.vercel.app/**`

- [ ] Supabase site URL updated
- [ ] Supabase redirect URLs updated

**In Google Cloud Console:**
- [ ] Authorized JavaScript origins includes Vercel domain
- [ ] Test OAuth flow works on production

## Post-Deployment Testing

### ✅ Smoke Tests
Visit your production URL and test:

- [ ] App loads without errors
- [ ] Sign in with Google works
- [ ] Dashboard displays correctly
- [ ] Can add opportunity
- [ ] Can add project
- [ ] Can edit opportunity
- [ ] Can edit project
- [ ] Stage transitions work
- [ ] Status transitions work
- [ ] Quick Add works
- [ ] Filters work
- [ ] Sign out works
- [ ] Sign back in persists data

### ✅ Mobile Testing
Test on actual mobile devices:

- [ ] iOS Safari: Sign in works
- [ ] iOS Safari: Forms work (no zoom)
- [ ] iOS Safari: Bottom nav works
- [ ] iOS Safari: Touch targets comfortable
- [ ] Android Chrome: Sign in works
- [ ] Android Chrome: Forms work
- [ ] Android Chrome: Bottom nav works
- [ ] Android Chrome: Touch targets comfortable
- [ ] PWA install works (Add to Home Screen)
- [ ] PWA opens in standalone mode

### ✅ Performance Testing
Run Lighthouse audit:

```bash
# Or use Chrome DevTools → Lighthouse tab
npm install -g lighthouse
lighthouse https://your-app.vercel.app --view
```

Target scores:
- [ ] Performance: 90+
- [ ] Accessibility: 90+
- [ ] Best Practices: 90+
- [ ] SEO: 90+

### ✅ Security Testing
- [ ] RLS works (can't see other users' data)
- [ ] Can't access API without auth
- [ ] Auth tokens stored securely
- [ ] No sensitive data in console logs
- [ ] Environment variables not exposed in client

## Optional: Custom Domain

### Step 1: Add Domain in Vercel
- [ ] Go to Vercel project → Settings → Domains
- [ ] Add your domain
- [ ] Follow Vercel's DNS instructions

### Step 2: Update OAuth
- [ ] Update Supabase redirect URLs with new domain
- [ ] Update Google OAuth authorized origins
- [ ] Test OAuth flow with new domain

### Step 3: SSL Certificate
- [ ] Vercel automatically provisions SSL (nothing to do)
- [ ] Verify HTTPS works

## Monitoring & Maintenance

### ✅ Set Up Monitoring
- [ ] Vercel Analytics enabled (optional)
- [ ] Supabase database usage monitored
- [ ] Auth usage monitored
- [ ] Set up alerts for errors

### ✅ Backup Strategy
- [ ] Supabase automatic backups enabled (free tier: daily)
- [ ] Export data regularly if needed
- [ ] Document restore procedure

### ✅ Updates
- [ ] Set up Dependabot for dependency updates
- [ ] Plan for Supabase schema migrations
- [ ] Version control for all changes

## Troubleshooting Production Issues

### Users can't sign in
1. Check Supabase Auth logs
2. Verify redirect URLs match exactly
3. Check Google OAuth credentials
4. Clear browser cache and retry

### Data not loading
1. Check Supabase logs
2. Verify RLS policies are correct
3. Check browser console for errors
4. Verify environment variables

### Performance issues
1. Run Lighthouse audit
2. Check bundle size: `npm run build -- --stats`
3. Verify images are optimized
4. Check database query performance in Supabase

### Mobile issues
1. Test on actual devices (not just emulator)
2. Check viewport meta tags
3. Verify touch targets are 44px+
4. Check safe area insets

## Launch Checklist

### ✅ Final Checks
- [ ] All features work in production
- [ ] Mobile experience is smooth
- [ ] No console errors
- [ ] Performance scores meet targets
- [ ] Security audit passed
- [ ] Documentation is up to date

### ✅ Soft Launch
- [ ] Test with small group of users
- [ ] Collect feedback
- [ ] Fix any critical issues
- [ ] Monitor error rates

### ✅ Full Launch
- [ ] Announce to target users
- [ ] Monitor usage
- [ ] Respond to user feedback
- [ ] Plan next iteration

## Success Metrics to Track

After launch, monitor:

- [ ] Daily active users
- [ ] Average session duration
- [ ] Opportunities created per user
- [ ] Projects created per user
- [ ] Mobile vs desktop usage
- [ ] Sign-up completion rate
- [ ] Feature usage (pipeline stages, quick add, etc.)
- [ ] Performance metrics (Core Web Vitals)

## Support Channels

Set up:
- [ ] Email support
- [ ] Bug report form
- [ ] Feature request form
- [ ] User documentation/help center

---

## Quick Commands Reference

```bash
# Local development
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod

# Check for errors
npm run lint

# Format code
npm run format
```

---

**🎉 Congratulations!** Your ultra-minimal Opportunity Tracker is live!



