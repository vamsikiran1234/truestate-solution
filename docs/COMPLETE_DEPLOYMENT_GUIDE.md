# Complete Deployment Guide

## Overview
This guide covers deploying your TruEstate Retail Sales Management System to:
- **Backend:** Render (free tier with Supabase)
- **Frontend:** Vercel (free tier)
- **Database:** Supabase PostgreSQL (free 500MB tier)

## Part 1: Database Setup (Supabase)

### ✅ Already Completed
- [x] Supabase account created
- [x] Project created
- [x] 1,000,000 records uploaded
- [x] Database schema and indexes created

### Additional Step: Add Stats Function

Run this SQL in Supabase SQL Editor:

```sql
-- Efficient stats calculation without fetching all rows
CREATE OR REPLACE FUNCTION get_sales_stats()
RETURNS TABLE(
  total_records BIGINT,
  total_sales NUMERIC,
  total_quantity BIGINT,
  total_discount NUMERIC,
  average_order_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_records,
    ROUND(SUM(final_amount)::NUMERIC, 2) as total_sales,
    SUM(quantity)::BIGINT as total_quantity,
    ROUND(SUM(total_amount - final_amount)::NUMERIC, 2) as total_discount,
    ROUND(AVG(final_amount)::NUMERIC, 2) as average_order_value
  FROM sales;
END;
$$ LANGUAGE plpgsql;
```

**Why:** This function calculates statistics using PostgreSQL aggregates instead of fetching all 1M records, making stats queries instant.

---

## Part 2: Backend Deployment (Render)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub account
3. Authorize Render to access your repository

### Step 2: Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `vamsikiran1234/truestate-solution`
3. Configure the service:

   **Basic Settings:**
   - **Name:** `truestate-backend` (or your choice)
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

   **Instance Type:**
   - **Free** (512MB RAM - sufficient with Supabase!)

### Step 3: Environment Variables
Add these in Render dashboard:

```
SUPABASE_URL=https://rkptvqqajpvpahudgvyz.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrcHR2cXFhanB2cGFodWRndnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjUzMzEsImV4cCI6MjA4MDcwMTMzMX0.FWCdEwz-biC4ro_5E9IImC1acCslKjr5gmQaVD4UDYk
PORT=5000
NODE_ENV=production
```

### Step 4: Deploy
1. Click **"Create Web Service"**
2. Wait for deployment (2-3 minutes)
3. Once deployed, note your backend URL: `https://truestate-backend.onrender.com`

### Step 5: Verify
Test your backend:
```bash
curl https://your-backend-url.onrender.com/api/health
```

Should return:
```json
{
  "status": "OK",
  "message": "Server is running",
  "dataSource": "Supabase PostgreSQL"
}
```

**Important:** Memory usage should stay under 512MB ✅

---

## Part 3: Frontend Deployment (Vercel)

### Option A: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Import Project
1. Go to https://vercel.com
2. Click **"Add New..."** → **"Project"**
3. Import `vamsikiran1234/truestate-solution` repository

#### Step 2: Configure Build Settings

**CRITICAL:** Configure these settings:

- **Framework Preset:** Vite
- **Root Directory:** `frontend` ← **IMPORTANT!**
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `dist` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

#### Step 3: Environment Variables
Add this environment variable:

```
VITE_API_URL=https://your-backend-url.onrender.com/api
```

Replace `your-backend-url` with your actual Render backend URL.

#### Step 4: Deploy
1. Click **"Deploy"**
2. Wait for build to complete (1-2 minutes)
3. Your frontend will be live at: `https://your-project.vercel.app`

### Option B: Deploy via Vercel CLI

If dashboard deployment fails, use CLI:

```powershell
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend directory
cd frontend

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# When prompted:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? truestate-frontend
# - Directory? ./
# - Override settings? No
```

---

## Part 4: Post-Deployment

### 1. Update CORS in Backend

If you get CORS errors, update `backend/src/index.js`:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    /\.vercel\.app$/,
    'https://your-frontend.vercel.app'  // Add your Vercel URL
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
```

Commit and push to trigger Render redeploy.

### 2. Test Full Stack

1. Open your Vercel frontend URL
2. Test search functionality
3. Test filters
4. Test pagination
5. Test export (may take time for large datasets)

### 3. Monitor Performance

**Render Dashboard:**
- Check memory usage (should be < 512MB)
- Check response times
- Monitor logs for errors

**Vercel Dashboard:**
- Check build times
- Monitor function invocations
- Check bandwidth usage

---

## Troubleshooting

### Backend Issues

**Problem:** "Out of memory" error
- **Solution:** Ensure `SUPABASE_URL` and `SUPABASE_KEY` are set correctly
- **Check:** Logs should show "Data source: Supabase PostgreSQL"

**Problem:** Slow queries
- **Solution:** Ensure stats function is created (Part 1)
- **Check:** Run `SELECT * FROM get_sales_stats();` in Supabase SQL Editor

**Problem:** Only returning 1000 records
- **Solution:** Already fixed in latest code - pull and redeploy
- **Check:** `/api/sales` should show `totalItems: 1000000` in pagination

### Frontend Issues

**Problem:** Vercel build fails with "Permission denied"
- **Solution:** Set **Root Directory** to `frontend` in Vercel dashboard
- **Alternative:** Delete root `vercel.json` and use CLI deployment

**Problem:** API calls fail with 404
- **Solution:** Check `VITE_API_URL` environment variable in Vercel
- **Format:** Must include `/api` at the end

**Problem:** Export not working
- **Solution:** Check backend export endpoint `/api/sales/export`
- **Alternative:** Use filters to reduce dataset size before export

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                   USER BROWSER                          │
│              https://app.vercel.app                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTPS
                     │
┌────────────────────▼────────────────────────────────────┐
│               VERCEL (Frontend)                         │
│   • React + Vite                                        │
│   • Static hosting                                      │
│   • Free tier                                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ API Calls (CORS enabled)
                     │
┌────────────────────▼────────────────────────────────────┐
│            RENDER (Backend API)                         │
│   • Node.js + Express                                   │
│   • 512MB RAM (free tier)                              │
│   • Memory: ~50MB (with Supabase)                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ PostgreSQL queries
                     │
┌────────────────────▼────────────────────────────────────┐
│         SUPABASE (PostgreSQL Database)                  │
│   • 1,000,000 sales records                            │
│   • Indexed for fast queries                           │
│   • 500MB storage (free tier)                          │
│   • RPC functions for aggregates                       │
└─────────────────────────────────────────────────────────┘
```

---

## Cost Breakdown (Monthly)

| Service | Tier | Usage | Cost |
|---------|------|-------|------|
| Supabase | Free | 500MB DB, 2GB bandwidth | $0 |
| Render | Free | 512MB RAM, 750hrs/month | $0 |
| Vercel | Free | 100GB bandwidth | $0 |
| **TOTAL** | | | **$0** |

---

## Success Checklist

Backend Deployment:
- [ ] Render service created with `backend` root directory
- [ ] Environment variables added (SUPABASE_URL, SUPABASE_KEY)
- [ ] Deployment successful
- [ ] Health check returns "Supabase PostgreSQL"
- [ ] Memory usage < 512MB

Frontend Deployment:
- [ ] Vercel project created with `frontend` root directory
- [ ] VITE_API_URL environment variable set
- [ ] Build successful
- [ ] Site accessible via Vercel URL

Database:
- [ ] 1M records in Supabase
- [ ] Stats function created
- [ ] Indexes working
- [ ] Queries returning correct counts

Integration:
- [ ] Frontend can fetch data from backend
- [ ] Pagination works (shows 1M total items)
- [ ] Search works
- [ ] Filters work
- [ ] Stats display correctly

---

## Next Steps

1. **Custom Domain (Optional):**
   - Vercel: Add custom domain in project settings
   - Render: Upgrade to paid tier for custom domain

2. **Monitoring:**
   - Set up Render alerts for errors
   - Monitor Vercel analytics
   - Check Supabase database performance

3. **Optimization:**
   - Add Redis caching for frequently accessed data
   - Implement CDN for static assets
   - Add API rate limiting

---

## Support

If you encounter issues:
1. Check Render logs: `Logs` tab in dashboard
2. Check Vercel logs: `Deployments` → Select deployment → `Logs`
3. Check Supabase logs: `Logs` → `API`
4. Verify environment variables are set correctly

**Your deployment is now complete!** 🎉
