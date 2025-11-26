# Render Deployment Checklist

## Pre-Deployment

- [ ] Ensure all environment variables are documented in `.env.example`
- [ ] Test the application locally with production-like settings
- [ ] Verify all dependencies are listed in `package.json`

## Render Setup Steps

### 1. Connect Repository
- [ ] Go to [Render Dashboard](https://dashboard.render.com)
- [ ] Click "New +" → "Blueprint" (if using render.yaml) or "Web Service" (for manual setup)
- [ ] Connect your GitHub repository
- [ ] Select the repository and branch

### 2. Configure Service (if manual setup)
- [ ] **Name:** `eshare-backend`
- [ ] **Root Directory:** `backend`
- [ ] **Environment:** `Node`
- [ ] **Build Command:** `npm install`
- [ ] **Start Command:** `npm start`
- [ ] **Plan:** Free (or upgrade for production)

### 3. Set Environment Variables
Add these in Render Dashboard → Your Service → Environment:

- [ ] `NODE_ENV` = `production`
- [ ] `SUPABASE_URL` = Your Supabase project URL
- [ ] `SUPABASE_SERVICE_KEY` = Your Supabase service role key
- [ ] `FRONTEND_URL` = Your frontend URL (e.g., `https://eshare-two.vercel.app`)

**Note:** Do NOT set `PORT` - Render provides this automatically.

### 4. Deploy
- [ ] Click "Create Web Service" or "Save Changes"
- [ ] Wait for build to complete
- [ ] Copy the service URL (e.g., `https://eshare-backend.onrender.com`)

### 5. Update Frontend
- [ ] Update frontend Socket.io connection URL to use Render service URL
- [ ] Update frontend environment variable `VITE_SOCKET_URL` to the Render URL
- [ ] Redeploy frontend if needed

### 6. Verify Deployment
- [ ] Test health endpoint: `https://your-service.onrender.com/health`
- [ ] Test Socket.io connection from frontend
- [ ] Check Render logs for any errors

## Post-Deployment

- [ ] Monitor logs in Render dashboard
- [ ] Set up auto-deploy from main/master branch (if desired)
- [ ] Consider upgrading plan for production (free tier spins down after inactivity)

## Troubleshooting

### Service won't start
- Check build logs in Render dashboard
- Verify all environment variables are set
- Ensure `package.json` has correct start script

### CORS errors
- Verify `FRONTEND_URL` matches your actual frontend URL exactly
- Check that frontend is using the correct Socket.io URL

### Connection timeouts
- Free tier services may take time to wake up after inactivity
- Consider upgrading to a paid plan for production

